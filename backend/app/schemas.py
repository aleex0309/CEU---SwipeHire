"""
Pydantic schemas for the SwipeHire API.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Explainability sub-model (shared by both corpus and custom endpoints)
# ---------------------------------------------------------------------------

class ScoreBreakdown(BaseModel):
    """Numerical breakdown of the two scoring signals."""

    semantic: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Sentence-BERT cosine similarity × 100 (0–100).",
    )
    keyword_coverage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description=(
            "Percentage of the job-description's key terms found verbatim "
            "in the candidate's profile (0–100)."
        ),
    )


# ---------------------------------------------------------------------------
# Candidate with full explainability
# ---------------------------------------------------------------------------

class CandidateExplained(BaseModel):
    """A ranked candidate with transparent scoring details."""

    id: str = Field(..., description="Candidate identifier (row index or original index).")
    job_position: str = Field(..., description="Role / job title from the candidate's profile.")
    score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Raw cosine similarity score [0, 1].",
    )
    match_score: int = Field(
        ..., ge=0, le=100,
        description="Score as a 0–100 integer, ready for display in the UI.",
    )
    summary: str = Field(..., description="First ~200 chars of the cleaned profile text.")
    skills_raw: str = Field(default="", description="Raw skills field (may be a stringified list).")
    top_skills: List[str] = Field(default_factory=list, description="Top extracted skill tokens.")

    # Explainability fields
    matched_keywords: List[str] = Field(
        default_factory=list,
        description="Job-description terms found in the candidate's profile.",
    )
    missing_keywords: List[str] = Field(
        default_factory=list,
        description="Significant job-description terms absent from this profile.",
    )
    explanation: str = Field(
        default="",
        description=(
            "Human-readable explanation of the score: why the candidate ranked "
            "here, what matched, and what gaps exist."
        ),
    )
    score_breakdown: ScoreBreakdown = Field(
        ...,
        description="Numeric breakdown of the two scoring signals (semantic + keyword).",
    )

    # Optional: present only for custom (user-pasted) CVs
    name: Optional[str] = Field(default=None, description="Extracted candidate name (custom CVs only).")
    role: Optional[str] = Field(default=None, description="Extracted role title (custom CVs only).")
    years_experience: Optional[int] = Field(default=None, description="Extracted years of experience (custom CVs only).")


# ---------------------------------------------------------------------------
# Shared response envelope
# ---------------------------------------------------------------------------

class MatchResponse(BaseModel):
    """Response envelope returned by both /api/match and /api/match-custom."""

    candidates: List[CandidateExplained]
    total: int = Field(..., description="Number of candidates returned.")
    job_description_preview: str = Field(
        ..., description="First 150 characters of the received job description."
    )
    model: str = Field(..., description="Sentence-BERT model used for encoding.")


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class MatchRequest(BaseModel):
    """Body of POST /api/match (search the built-in CSV corpus)."""

    job_description: str = Field(
        ...,
        min_length=10,
        description="Full text of the job description to match against resumes.",
        example=(
            "We are looking for a Senior Data Engineer with experience in "
            "Python, Spark, SQL, and cloud platforms (AWS or GCP). "
            "Strong communication and teamwork skills required."
        ),
    )
    top_n: int = Field(default=5, ge=1, le=50, description="Number of top candidates (1–50).")
    min_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum cosine-similarity threshold.")


class CustomMatchRequest(BaseModel):
    """Body of POST /api/match-custom (score user-provided CVs in real time)."""

    job_description: str = Field(
        ...,
        min_length=10,
        description="Full text of the job description.",
        example=(
            "We need a product-minded full-stack engineer with React, TypeScript, "
            "cloud deployment experience and strong communication skills."
        ),
    )
    cv_texts: List[str] = Field(
        ...,
        min_length=1,
        description="List of raw CV texts to score against the job description.",
    )
    top_n: int = Field(default=20, ge=1, le=100, description="Maximum number of results to return.")
    min_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Minimum cosine-similarity threshold.")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    model: str
    resumes_loaded: int
