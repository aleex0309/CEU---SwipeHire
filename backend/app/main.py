"""
FastAPI application — SwipeHire Screening API.

Routes
------
GET  /healthz                — liveness probe (engine ready?)
POST /api/match              — rank the built-in CSV corpus against a JD
POST /api/match-custom       — rank user-provided CV texts against a JD (real-time)
GET  /api/docs               — Swagger UI (built-in via FastAPI)
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .engine import MODEL_NAME, get_engine
from .schemas import (
    CustomMatchRequest,
    HealthResponse,
    MatchRequest,
    MatchResponse,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan (warm-up the engine at start-up)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Warm-up: load CSV & encode all resumes before accepting requests."""
    logger.info("⏳ Warming up ScreeningEngine…")
    try:
        get_engine()
        logger.info("✅ ScreeningEngine ready.")
    except FileNotFoundError as exc:
        logger.error("❌ %s", exc)
    yield


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SwipeHire Screening API",
    description=(
        "Semantic resume-screening powered by Sentence-BERT (all-MiniLM-L6-v2). "
        "Every response includes a full explainability breakdown: semantic score, "
        "keyword coverage, matched terms, and a human-readable explanation."
    ),
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get(
    "/healthz",
    response_model=HealthResponse,
    summary="Health check",
    tags=["ops"],
)
def health_check() -> HealthResponse:
    """Returns 200 when the engine is loaded, 503 otherwise."""
    try:
        engine = get_engine()
        return HealthResponse(
            status="ok",
            model=MODEL_NAME,
            resumes_loaded=len(engine._df),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Engine not ready: {exc}",
        )


@app.post(
    "/api/match",
    response_model=MatchResponse,
    summary="Match a job description against the built-in resume corpus",
    tags=["screening"],
)
def match_resumes(req: MatchRequest) -> MatchResponse:
    """
    **Semantic resume screening against the built-in CSV corpus.**

    Returns a ranked list of candidates with full explainability:
    - Cosine-similarity score (Sentence-BERT)
    - Keyword coverage percentage
    - Matched and missing keywords
    - Human-readable explanation
    """
    try:
        engine = get_engine()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    candidates_raw = engine.get_top_candidates(
        job_description=req.job_description,
        top_n=req.top_n,
        min_score=req.min_score,
    )

    if not candidates_raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The job description produced an empty text after cleaning. "
                "Please provide more meaningful content."
            ),
        )

    # Coerce id to string for the unified schema
    for c in candidates_raw:
        c["id"] = str(c["id"])

    return MatchResponse(
        candidates=candidates_raw,
        total=len(candidates_raw),
        job_description_preview=req.job_description[:150],
        model=MODEL_NAME,
    )


@app.post(
    "/api/match-custom",
    response_model=MatchResponse,
    summary="Score user-provided CV texts against a job description (real-time)",
    tags=["screening"],
)
def match_custom_cvs(req: CustomMatchRequest) -> MatchResponse:
    """
    **Semantic scoring of user-provided CVs.**

    The user sends a job description plus a list of raw CV texts.
    The engine encodes all CVs with Sentence-BERT on the fly and returns
    a ranked, explained response.

    This is the endpoint used by the SwipeHire frontend.

    Response per candidate includes:
    - `score` (cosine similarity 0–1) and `match_score` (0–100 for UI)
    - `score_breakdown.semantic` — SBERT cosine × 100
    - `score_breakdown.keyword_coverage` — % of JD keywords present in CV
    - `matched_keywords` — JD terms found in the profile
    - `missing_keywords` — significant JD terms absent from the profile
    - `explanation` — recruiter-facing natural language explanation
    """
    try:
        engine = get_engine()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    if not req.cv_texts or all(not cv.strip() for cv in req.cv_texts):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="cv_texts must contain at least one non-empty CV.",
        )

    candidates_raw = engine.score_custom_cvs(
        job_description=req.job_description,
        cv_texts=req.cv_texts,
        top_n=req.top_n,
        min_score=req.min_score,
    )

    if not candidates_raw:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The job description or all CV texts produced empty text after cleaning. "
                "Please provide more meaningful content."
            ),
        )

    return MatchResponse(
        candidates=candidates_raw,
        total=len(candidates_raw),
        job_description_preview=req.job_description[:150],
        model=MODEL_NAME,
    )
