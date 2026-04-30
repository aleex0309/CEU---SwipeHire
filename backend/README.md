# SwipeHire Backend (FastAPI + SBERT)

Semantic resume-screening API using **Sentence-BERT** (`all-MiniLM-L6-v2`) with explainable scoring.
The backend mirrors and operationalizes the notebook logic from `talento_screening_poc_V2.ipynb`.

---

## At a Glance

- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Embedding size:** `384`
- **Core scoring:** cosine similarity between JD embedding and CV embedding
- **Explainability signals:** semantic score + keyword coverage + matched/missing keywords + natural-language explanation
- **Data modes:**
  - `POST /api/match`: score against the internal corpus (`resume_data.csv`, 9,544 rows)
  - `POST /api/match-custom`: score user-pasted CVs in real time

---

## End-to-End Flow (Schema)

```text
Frontend (/app) 
   │  POST /api/match-custom
   ▼
FastAPI Router (main.py)
   │  Pydantic validation (schemas.py)
   ▼
ScreeningEngine (engine.py)
   ├─ Text processing branch
   │    ├─ clean_text()
   │    ├─ SBERT.encode()
   │    └─ cosine similarity
   ├─ Metadata branch
   │    ├─ extract name (heuristic)
   │    ├─ extract role (heuristic)
   │    └─ extract years_experience (regex)
   └─ Explainability merge
        ├─ matched_keywords
        ├─ missing_keywords
        ├─ keyword_coverage
        └─ explanation paragraph
   ▼
MatchResponse JSON
   ▼
Frontend (/swipe): cards + score bars + explanation + keyword gaps
```

---

## Request Lifecycle (Detailed)

### 1) Startup warm-up (once per process)

On app startup (`lifespan` in `main.py`):

1. `get_engine()` loads `resume_data.csv`
2. Builds `resume_content = career_objective + skills + responsibilities`
3. Applies `clean_text()` to every row
4. Encodes all cleaned rows with SBERT in batch
5. Caches embeddings in a singleton `ScreeningEngine`

This avoids re-encoding the corpus on every request.

### 2) Real-time scoring (`POST /api/match-custom`)

For a request with a JD and `cv_texts[]`:

1. Clean job description text
2. Encode JD to embedding
3. Clean each CV text
4. Encode valid CVs in batch
5. Compute `cos_sim(JD, each CV)`
6. Sort descending and apply thresholds
7. Build explainability payload per candidate
8. Return `MatchResponse`

---

## Scoring Formula

### Semantic score (primary)

\[
\text{semantic\_score} = \cos(\mathbf{e}_{JD}, \mathbf{e}_{CV})
\]

where:
- \(\mathbf{e}_{JD}\): SBERT embedding of cleaned job description
- \(\mathbf{e}_{CV}\): SBERT embedding of cleaned candidate profile

### UI match score

\[
\text{match\_score} = \text{round}(100 \times \text{semantic\_score})
\]

### Keyword coverage (secondary explainability signal)

\[
\text{keyword\_coverage} = \frac{|JD\_tokens \cap CV\_tokens|}{|JD\_tokens|}
\]

---

## Explainability Output

Each returned candidate includes:

- `score` (`0..1`): raw cosine similarity
- `match_score` (`0..100`): UI-friendly score
- `score_breakdown.semantic`: semantic percentage
- `score_breakdown.keyword_coverage`: lexical coverage percentage
- `matched_keywords`: terms in JD found in CV
- `missing_keywords`: key JD terms absent in CV
- `explanation`: recruiter-readable explanation text

---

## Explainability Methodology

This backend uses a **hybrid explainability strategy**:

1. **Semantic relevance (primary signal)** via SBERT cosine similarity
2. **Lexical evidence (secondary signal)** via keyword overlap

It is intentionally transparent and deterministic: every explainability field is computed from cleaned text and can be audited.

### Step 1 — Text normalization

Both job description and CV text pass through `clean_text()`:

- parse list-like strings (for corpus fields like `skills`)
- remove URLs, emails, phone-like numbers
- remove non-alphabetic characters
- lowercase
- remove stopwords
- keep tokens with length `> 2`

This yields normalized text for embedding and token comparison.

### Step 2 — Semantic score (SBERT)

The system embeds:

- `e_JD = SBERT(cleaned_job_description)`
- `e_CV = SBERT(cleaned_cv_text)`

and computes:

\[
\text{semantic\_score} = \cos(e_{JD}, e_{CV}) \in [0,1]
\]

UI-facing score:

\[
\text{match\_score} = \text{round}(100 \cdot \text{semantic\_score})
\]

### Step 3 — Keyword evidence

From cleaned tokens:

- `JD_tokens = set(cleaned_jd.split())`
- `CV_tokens = set(cleaned_cv.split())`

Compute:

- `matched_keywords = JD_tokens ∩ CV_tokens`
- `missing_keywords = JD_tokens - CV_tokens`
- `keyword_coverage = |matched_keywords| / |JD_tokens|`

Returned as:

- `score_breakdown.keyword_coverage` (percentage)
- `matched_keywords` (top terms that support the match)
- `missing_keywords` (notable requirement gaps)

### Step 4 — Natural-language explanation

`_build_explanation()` produces a recruiter-readable paragraph combining:

- semantic tier (Excellent / Good / Partial / Weak / Poor)
- keyword coverage %
- top matched terms
- top missing terms

### Why this works in practice

- **Semantic score** captures meaning/context beyond exact wording.
- **Keyword coverage** provides explicit, auditable evidence.
- **Matched/missing lists** make decisions actionable for recruiters.
- **Explanation text** translates numeric output into hiring language.

### Implementation references

- `app/engine.py`
  - `clean_text()`
  - `_explain_match()`
  - `_build_explanation()`
  - `score_custom_cvs()`
  - `get_top_candidates()`

### Tiering logic used in explanations

- `>= 75%` → Excellent fit
- `60–74%` → Good fit
- `45–59%` → Partial fit
- `30–44%` → Weak fit
- `< 30%` → Poor fit

---

## API Reference

### `GET /healthz`

Health probe:

```json
{
  "status": "ok",
  "model": "all-MiniLM-L6-v2",
  "resumes_loaded": 9544
}
```

### `POST /api/match`

Scores against internal corpus (`resume_data.csv`).

Request:

```json
{
  "job_description": "We need a senior data engineer with Python, Spark and SQL...",
  "top_n": 5,
  "min_score": 0.0
}
```

### `POST /api/match-custom`

Scores user-provided CVs in real time.

Request:

```json
{
  "job_description": "We need a full-stack engineer with React, TypeScript and cloud...",
  "cv_texts": [
    "Candidate A full CV text...",
    "Candidate B full CV text..."
  ],
  "top_n": 20,
  "min_score": 0.0
}
```

Response (shape):

```json
{
  "candidates": [
    {
      "id": "0",
      "name": "Elena Alvarez",
      "role": "Senior Full Stack Engineer",
      "years_experience": 9,
      "job_position": "Senior Full Stack Engineer",
      "score": 0.875,
      "match_score": 88,
      "summary": "product minded senior engineer ...",
      "top_skills": ["react", "typescript", "node", "aws"],
      "matched_keywords": ["react", "typescript", "aws"],
      "missing_keywords": ["kubernetes"],
      "score_breakdown": {
        "semantic": 87.5,
        "keyword_coverage": 80.0
      },
      "explanation": "Excellent fit..."
    }
  ],
  "total": 2,
  "job_description_preview": "We need a full-stack engineer...",
  "model": "all-MiniLM-L6-v2"
}
```

Docs:
- Swagger: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

---

## Logging (Per Candidate)

`engine.py` logs detailed lines for each candidate in `/api/match-custom`, including:

- rank
- name
- role
- years
- semantic %
- keyword coverage %
- tier
- matched keywords
- missing keywords

This makes backend decisions auditable directly in container logs.

---

## Project Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── engine.py       # SBERT pipeline + explainability + candidate logging
│   ├── main.py         # FastAPI app, routes, lifespan warm-up, CORS
│   └── schemas.py      # Pydantic contracts (requests/responses)
├── resume_data.csv     # internal candidate corpus (9544 rows)
├── run.py              # uvicorn entrypoint
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## Quick Start (Local)

```bash
# 1) Create venv
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 2) Install deps
pip install -r requirements.txt

# 3) Download NLTK stopwords (one time)
python -c "import nltk; nltk.download('stopwords')"

# 4) Run API
python run.py
```

Server:
- `http://localhost:8000`
- `http://localhost:8000/api/docs`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RESUME_CSV_PATH` | `../resume_data.csv` (relative to `run.py`) | Path to resume dataset |
| `HOST` | `0.0.0.0` | Bind host |
| `PORT` | `8000` | Bind port |
