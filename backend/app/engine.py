"""
NLP Engine — mirrors the logic from talento_screening_poc.ipynb.

Pipeline:
  1. Load resume_data.csv
  2. Build a `resume_content` field = career_objective + skills + responsibilities
  3. Clean text (remove URLs, emails, phones, special chars, stopwords)
  4. Encode every resume with Sentence-BERT (all-MiniLM-L6-v2)
  5. At query time, encode the job description and rank by cosine similarity
  6. Return per-candidate explanation: matched keywords, missing keywords, score breakdown
"""

from __future__ import annotations

import ast
import logging
import os
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer, util

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# stopwords (NLTK-compatible English list, bundled to avoid NLTK download req)
# ---------------------------------------------------------------------------
try:
    import nltk

    try:
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords", quiet=True)

    from nltk.corpus import stopwords as _nltk_sw

    _STOP_WORDS: frozenset = frozenset(_nltk_sw.words("english"))
except Exception:  # pragma: no cover
    _STOP_WORDS: frozenset = frozenset(
        {
            "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
            "for", "of", "with", "by", "from", "is", "was", "are", "were",
            "be", "been", "being", "have", "has", "had", "do", "does", "did",
            "will", "would", "could", "should", "may", "might", "shall",
            "can", "not", "no", "nor", "so", "yet", "both", "either",
            "neither", "each", "few", "more", "most", "other", "some",
            "such", "than", "too", "very", "just", "also", "as", "if",
            "this", "that", "these", "those", "it", "its",
        }
    )

# ---------------------------------------------------------------------------
# Model name
# ---------------------------------------------------------------------------
MODEL_NAME = "all-MiniLM-L6-v2"

# ---------------------------------------------------------------------------
# CSV column names
# ---------------------------------------------------------------------------
_COL_CAREER_OBJ = "career_objective"
_COL_SKILLS = "skills"
_COL_RESPONSIBILITIES = "responsibilities"
_COL_RESUME_CONTENT = "resume_content"


# ===========================================================================
# Text cleaning utilities (same logic as the notebook)
# ===========================================================================

def _safe_parse_list(text: Any) -> str:
    """Convert a stringified Python list like \"['a', 'b']\" to plain text 'a b'."""
    if pd.isna(text) or text == "":
        return ""
    s = str(text).strip()
    if s.startswith("["):
        try:
            vals = ast.literal_eval(s)
            return " ".join(str(v) for v in vals if v is not None)
        except Exception:
            return s
    return s


def clean_text(text: Any) -> str:
    """
    Full cleaning pipeline (mirrors `clean_text` in the notebook):
      1. Parse list-strings
      2. Remove URLs, e-mails, phone numbers
      3. Remove non-alphabetic characters
      4. Lowercase + strip
      5. Tokenise and remove stopwords (keep tokens longer than 2 chars)
    """
    if pd.isna(text):
        return ""

    text = _safe_parse_list(text)

    text = re.sub(r"https?://\S+|www\.\S+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\S+@\S+\s?", "", text)
    text = re.sub(r"\+?\d[\d\s\-]{8,12}\d", "", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)

    text = text.lower().strip()
    tokens = [w for w in text.split() if w not in _STOP_WORDS and len(w) > 2]
    return " ".join(tokens)


def clean_text_tokens(text: Any) -> List[str]:
    """Return the cleaned token list (instead of joined string)."""
    cleaned = clean_text(text)
    return cleaned.split() if cleaned else []


# ===========================================================================
# Explainability helpers
# ===========================================================================

def _build_explanation(
    semantic_score: float,
    keyword_coverage: float,
    matched_keywords: List[str],
    missing_keywords: List[str],
) -> str:
    """
    Generate a human-readable, detailed explanation of why a candidate received
    their score. This is the key output for recruiter transparency.
    """
    pct = round(semantic_score * 100)
    cov_pct = round(keyword_coverage * 100)

    # Tier-based verdict
    if pct >= 75:
        verdict = (
            f"Excellent fit ({pct}%). The candidate's profile has a strong semantic "
            "alignment with the job description — the language, skills and experience "
            "described closely mirror what the role requires."
        )
    elif pct >= 60:
        verdict = (
            f"Good fit ({pct}%). The candidate shows solid alignment with the role. "
            "Their profile covers many of the core requirements and demonstrates "
            "relevant experience in the target domain."
        )
    elif pct >= 45:
        verdict = (
            f"Partial fit ({pct}%). The candidate shows moderate alignment. "
            "Some relevant experience is present but there are notable gaps compared "
            "to the full scope of the job description."
        )
    elif pct >= 30:
        verdict = (
            f"Weak fit ({pct}%). The candidate's profile shows limited overlap with "
            "the job requirements. Their background may be adjacent but lacks direct "
            "alignment with the described role."
        )
    else:
        verdict = (
            f"Poor fit ({pct}%). The candidate's profile has very little semantic "
            "alignment with this job description. The skills and experience described "
            "do not closely match the requirements."
        )

    parts = [verdict]

    # Keyword coverage
    parts.append(
        f"Keyword coverage: {cov_pct}% of the job description's key terms were found "
        "in the candidate's profile."
    )

    # Matched keywords
    if matched_keywords:
        shown = matched_keywords[:10]
        parts.append(
            f"Matching terms: {', '.join(shown)}."
            + (" (and more)" if len(matched_keywords) > 10 else "")
        )
    else:
        parts.append("No direct keyword matches found between the job description and this profile.")

    # Missing keywords
    if missing_keywords:
        shown = missing_keywords[:8]
        parts.append(
            f"Notable gaps (terms in the JD not found in this profile): "
            f"{', '.join(shown)}."
        )

    return " ".join(parts)


def _extract_candidate_name(raw_text: str) -> str:
    """
    Heuristic: look for a name-like line in the first few lines of the CV.
    A name is typically 2–4 title-cased words with no numbers.
    """
    for line in raw_text.split("\n")[:8]:
        line = line.strip()
        if not line or len(line) > 60:
            continue
        words = line.split()
        if (
            2 <= len(words) <= 4
            and all(w[0].isupper() for w in words if w)
            and not any(ch.isdigit() for ch in line)
            and not any(c in line for c in ["@", ":", "/", "|"])
        ):
            return line
    return ""


def _extract_candidate_role(raw_text: str) -> str:
    """
    Heuristic: look for a role/title line in the first 15 lines of the CV.
    """
    title_keywords = re.compile(
        r"engineer|developer|analyst|scientist|manager|designer|architect|"
        r"lead|director|specialist|consultant|officer|coordinator|intern",
        re.IGNORECASE,
    )
    for line in raw_text.split("\n")[:15]:
        line = line.strip()
        words = line.split()
        if title_keywords.search(line) and 1 <= len(words) <= 8 and len(line) <= 70:
            return line
    return ""


def _extract_years_experience(raw_text: str) -> int:
    """Heuristic: find 'X years of experience' or 'X+ years' pattern."""
    match = re.search(r"(\d{1,2})\+?\s*years?\s*(?:of\s+)?(?:experience|exp\b)", raw_text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 0


# ===========================================================================
# Data loading & preparation
# ===========================================================================

def _find_job_position_column(df: pd.DataFrame) -> str:
    for col in df.columns:
        normalised = unicodedata.normalize("NFC", col).strip()
        if "job_position_name" in normalised:
            return col
    raise ValueError(
        "Could not find 'job_position_name' column in the CSV. "
        f"Available columns: {list(df.columns)}"
    )


def _build_resume_content(df: pd.DataFrame) -> pd.Series:
    raw = (
        df[_COL_CAREER_OBJ].fillna("")
        + " "
        + df[_COL_SKILLS].apply(_safe_parse_list)
        + " "
        + df[_COL_RESPONSIBILITIES].fillna("")
    )
    return raw.apply(clean_text)


# ===========================================================================
# Core engine (singleton via module-level variable)
# ===========================================================================

class ScreeningEngine:
    """
    Loads the CSV, builds resume embeddings, and exposes:
      - get_top_candidates()   — search the corpus for a JD
      - score_custom_cvs()     — score user-provided CV texts on the fly
    """

    def __init__(self, csv_path: Path, model_name: str = MODEL_NAME) -> None:
        logger.info("Loading CSV from %s …", csv_path)
        df_full = pd.read_csv(csv_path)

        self._pos_col = _find_job_position_column(df_full)
        logger.info("Job-position column resolved to '%s'", self._pos_col)

        logger.info("Building resume_content …")
        df_full[_COL_RESUME_CONTENT] = _build_resume_content(df_full)

        self._df = df_full[
            [self._pos_col, _COL_RESUME_CONTENT, _COL_CAREER_OBJ, _COL_SKILLS]
        ].reset_index(drop=True)

        logger.info("Loading Sentence-BERT model '%s' …", model_name)
        self._model = SentenceTransformer(model_name)

        logger.info("Encoding %d resumes …", len(self._df))
        self._embeddings = self._model.encode(
            self._df[_COL_RESUME_CONTENT].tolist(),
            show_progress_bar=False,
            batch_size=64,
            convert_to_numpy=True,
        )
        logger.info("ScreeningEngine ready.")

    # ------------------------------------------------------------------
    # Internal: shared explanation logic
    # ------------------------------------------------------------------

    def _explain_match(
        self,
        jd_tokens: set,
        cv_clean: str,
        semantic_score: float,
        max_matched: int = 20,
        max_missing: int = 12,
    ) -> Dict[str, Any]:
        """Compute keyword-level explanation between a JD and a cleaned CV."""
        cv_tokens = set(cv_clean.split())

        matched = sorted(jd_tokens & cv_tokens)
        missing = sorted(jd_tokens - cv_tokens)
        coverage = len(matched) / len(jd_tokens) if jd_tokens else 0.0

        explanation = _build_explanation(
            semantic_score=semantic_score,
            keyword_coverage=coverage,
            matched_keywords=matched,
            missing_keywords=missing,
        )

        return {
            "matched_keywords": matched[:max_matched],
            "missing_keywords": missing[:max_missing],
            "explanation": explanation,
            "score_breakdown": {
                "semantic": round(semantic_score * 100, 1),
                "keyword_coverage": round(coverage * 100, 1),
            },
        }

    # ------------------------------------------------------------------
    # Public: search the CSV corpus
    # ------------------------------------------------------------------

    def get_top_candidates(
        self,
        job_description: str,
        top_n: int = 5,
        min_score: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Rank resumes (from the CSV corpus) by cosine similarity against
        *job_description* and return fully explained results.
        """
        cleaned_jd = clean_text(job_description)
        if not cleaned_jd:
            return []

        jd_tokens = set(cleaned_jd.split())
        logger.info(
            "┌─ /api/match (corpus) ───────────────────────────────────────"
        )
        logger.info(
            "│  JD preview  : %.100s…", job_description.replace("\n", " ")
        )
        logger.info("│  JD tokens   : %d unique terms after cleaning", len(jd_tokens))
        logger.info("│  Corpus size : %d resumes", len(self._df))

        jd_embedding = self._model.encode([cleaned_jd], convert_to_numpy=True)
        cosine_scores = util.cos_sim(jd_embedding, self._embeddings)[0].numpy()

        top_indices = np.argsort(-cosine_scores)

        logger.info("│")
        logger.info(
            "│  %-4s  %-30s  %8s  %8s  %s",
            "Rank", "Job position (CSV)", "Semantic", "KwCov%", "Top matched keywords",
        )
        logger.info("│  " + "─" * 90)

        results: List[Dict[str, Any]] = []
        for idx in top_indices:
            if len(results) >= top_n:
                break
            score = float(cosine_scores[idx])
            if score < min_score:
                continue
            row = self._df.iloc[int(idx)]
            cv_clean = str(row[_COL_RESUME_CONTENT])

            explanation_data = self._explain_match(jd_tokens, cv_clean, score)

            skills_raw = row[_COL_SKILLS] if not pd.isna(row[_COL_SKILLS]) else ""
            top_skills = [t for t in clean_text_tokens(skills_raw) if len(t) > 3][:6]

            kw_coverage = explanation_data["score_breakdown"]["keyword_coverage"]
            tier = (
                "🟢 EXCELLENT" if score >= 0.75
                else "🟡 GOOD     " if score >= 0.60
                else "🟠 MODERATE " if score >= 0.45
                else "🔴 WEAK     " if score >= 0.30
                else "⚫ LOW      "
            )
            job_pos = str(row[self._pos_col])
            logger.info(
                "│  #%-3d  %-30s  %5.1f%%  %6.1f%%  %s",
                len(results) + 1,
                job_pos[:30],
                score * 100,
                kw_coverage,
                tier,
            )
            logger.info(
                "│         Matched: %s",
                ", ".join(explanation_data["matched_keywords"][:8]) or "(none)",
            )

            results.append(
                {
                    "id": int(idx),
                    "job_position": job_pos,
                    "score": round(score, 4),
                    "match_score": round(score * 100),
                    "summary": cv_clean[:200],
                    "skills_raw": str(skills_raw),
                    "top_skills": top_skills,
                    **explanation_data,
                }
            )

        logger.info("│  " + "─" * 90)
        logger.info(
            "│  Returned %d candidate(s)  |  top score: %.1f%%",
            len(results),
            results[0]["score"] * 100 if results else 0,
        )
        logger.info("└─────────────────────────────────────────────────────────────")

        return results

    # ------------------------------------------------------------------
    # Public: score user-provided CV texts on the fly
    # ------------------------------------------------------------------

    def score_custom_cvs(
        self,
        job_description: str,
        cv_texts: List[str],
        top_n: int = 20,
        min_score: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Encode user-provided raw CV strings with Sentence-BERT and rank them
        against *job_description* using cosine similarity.

        This is the endpoint used by the frontend when users paste their own CVs.
        Returns the same explained format as get_top_candidates().
        """
        cleaned_jd = clean_text(job_description)
        if not cleaned_jd:
            return []

        jd_tokens = set(cleaned_jd.split())
        logger.info(
            "┌─ /api/match-custom ─────────────────────────────────────────"
        )
        logger.info(
            "│  JD preview  : %.100s…", job_description.replace("\n", " ")
        )
        logger.info("│  JD tokens   : %d unique terms after cleaning", len(jd_tokens))
        logger.info("│  CVs received: %d", len(cv_texts))

        jd_embedding = self._model.encode([cleaned_jd], convert_to_numpy=True)

        # Clean all CVs and encode in a single batch for efficiency
        cleaned_cvs = [clean_text(cv) for cv in cv_texts]
        valid_indices = [i for i, c in enumerate(cleaned_cvs) if c]

        if not valid_indices:
            logger.warning("│  All CVs produced empty text after cleaning — aborting.")
            return []

        logger.info("│  Valid CVs   : %d (after cleaning)", len(valid_indices))

        valid_cleaned = [cleaned_cvs[i] for i in valid_indices]
        cv_embeddings = self._model.encode(
            valid_cleaned,
            show_progress_bar=True,
            batch_size=32,
            convert_to_numpy=True,
        )
        cosine_scores = util.cos_sim(jd_embedding, cv_embeddings)[0].numpy()

        logger.info("│")
        logger.info(
            "│  %-4s  %-26s  %-30s  %6s  %8s  %8s  %s",
            "Rank", "Name", "Role", "Yrs", "Semantic", "KwCov%", "Top matched keywords",
        )
        logger.info("│  " + "─" * 100)

        # Build results with full explanation
        raw_results = []
        for rank_pos, score_idx in enumerate(np.argsort(-cosine_scores)):
            orig_idx = valid_indices[int(score_idx)]
            score = float(cosine_scores[int(score_idx)])

            if score < min_score:
                continue

            raw_text = cv_texts[orig_idx]
            cv_clean = cleaned_cvs[orig_idx]

            explanation_data = self._explain_match(jd_tokens, cv_clean, score)

            # Heuristic extraction of candidate metadata from raw text
            name = _extract_candidate_name(raw_text) or f"Candidate {orig_idx + 1}"
            role = _extract_candidate_role(raw_text) or "Applicant"
            years_exp = _extract_years_experience(raw_text)

            matched_kws = explanation_data["matched_keywords"]
            kw_coverage = explanation_data["score_breakdown"]["keyword_coverage"]

            # Top skills: tokens from matched keywords (they are meaningful terms)
            top_skills = matched_kws[:6]
            if not top_skills:
                top_skills = clean_text_tokens(raw_text)[:6]

            # ── Per-candidate log line ──────────────────────────────────────
            tier = (
                "🟢 EXCELLENT" if score >= 0.75
                else "🟡 GOOD     " if score >= 0.60
                else "🟠 MODERATE " if score >= 0.45
                else "🔴 WEAK     " if score >= 0.30
                else "⚫ LOW      "
            )
            logger.info(
                "│  #%-3d  %-26s  %-30s  %3d yr  %5.1f%%  %6.1f%%  %s",
                rank_pos + 1,
                name[:26],
                role[:30],
                years_exp,
                score * 100,
                kw_coverage,
                tier,
            )
            logger.info(
                "│         Matched: %-60s",
                ", ".join(matched_kws[:8]) or "(none)",
            )
            missing_kws = explanation_data["missing_keywords"]
            logger.info(
                "│         Missing: %s",
                ", ".join(missing_kws[:6]) or "(none)",
            )

            raw_results.append(
                {
                    "id": str(orig_idx),
                    "name": name,
                    "role": role,
                    "years_experience": years_exp,
                    "job_position": role,
                    "score": round(score, 4),
                    "match_score": round(score * 100),
                    "summary": cv_clean[:220],
                    "skills_raw": "",
                    "top_skills": top_skills,
                    **explanation_data,
                }
            )

        logger.info("│  " + "─" * 100)
        logger.info(
            "│  Returned %d candidate(s)  |  top score: %.1f%%  |  bottom score: %.1f%%",
            len(raw_results),
            raw_results[0]["score"] * 100 if raw_results else 0,
            raw_results[-1]["score"] * 100 if raw_results else 0,
        )
        logger.info("└─────────────────────────────────────────────────────────────")

        return raw_results[:top_n]


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_engine: Optional[ScreeningEngine] = None


def get_engine(csv_path: Optional[Path] = None) -> ScreeningEngine:
    """
    Return (and lazily create) the module-level ScreeningEngine singleton.
    """
    global _engine
    if _engine is None:
        if csv_path is None:
            env_path = os.environ.get("RESUME_CSV_PATH")
            if env_path:
                csv_path = Path(env_path)
            else:
                csv_path = Path(__file__).parent.parent / "resume_data.csv"

        if not csv_path.exists():
            raise FileNotFoundError(
                f"resume_data.csv not found at '{csv_path}'. "
                "Set the RESUME_CSV_PATH environment variable or place the file "
                "next to the backend package."
            )

        _engine = ScreeningEngine(csv_path)
    return _engine
