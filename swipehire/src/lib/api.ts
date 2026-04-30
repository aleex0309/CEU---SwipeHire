/**
 * SwipeHire API client
 *
 * Calls the FastAPI backend (Sentence-BERT screening engine) and maps the
 * response to the frontend Candidate type — including all explainability fields.
 *
 * Base URL resolution order:
 *   1. import.meta.env.PUBLIC_API_URL   (set in .env or Vercel dashboard)
 *   2. http://localhost:8000            (local development default)
 */

import type { Candidate, ScoreBreakdown } from '../types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE: string =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Raw response shapes (as returned by the backend)
// ---------------------------------------------------------------------------

interface ApiScoreBreakdown {
  semantic: number;
  keyword_coverage: number;
}

interface ApiCandidate {
  id: string;
  job_position: string;
  score: number;
  match_score: number;
  summary: string;
  skills_raw: string;
  top_skills: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  explanation: string;
  score_breakdown: ApiScoreBreakdown;
  // Only present for custom CVs
  name?: string;
  role?: string;
  years_experience?: number;
}

interface ApiMatchResponse {
  candidates: ApiCandidate[];
  total: number;
  job_description_preview: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_LOCATIONS = ['Madrid', 'Barcelona', 'Valencia', 'Remote (EU)', 'Seville', 'Bilbao'];

function mapApiCandidate(
  api: ApiCandidate,
  originalCvText: string,
  index: number,
): Candidate {
  const breakdown: ScoreBreakdown = {
    semantic: api.score_breakdown.semantic,
    keywordCoverage: api.score_breakdown.keyword_coverage,
  };

  return {
    id: `api-${api.id}-${index}`,
    name: api.name ?? `Candidate ${index + 1}`,
    role: api.role ?? api.job_position ?? 'Applicant',
    location: SAMPLE_LOCATIONS[index % SAMPLE_LOCATIONS.length],
    yearsExperience: api.years_experience ?? 0,
    topSkills: api.top_skills?.length ? api.top_skills : api.matched_keywords.slice(0, 5),
    text: originalCvText,
    matchScore: api.match_score,
    summary: api.summary,

    // Explainability
    matchedKeywords: api.matched_keywords,
    missingKeywords: api.missing_keywords,
    explanation: api.explanation,
    scoreBreakdown: breakdown,
    scoredByAI: true,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Check that the backend is reachable and the engine is ready.
 * Returns true on success, false on any error.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/healthz`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send user-pasted CV texts to the backend for real-time Sentence-BERT scoring.
 *
 * @param jobDescription  The full job description text
 * @param cvTexts         Array of raw CV strings (one per candidate)
 * @param topN            Max results to return (default 20)
 * @param minScore        Minimum cosine-similarity threshold 0–1 (default 0)
 */
export async function matchCustomCvs(
  jobDescription: string,
  cvTexts: string[],
  topN = 20,
  minScore = 0.0,
): Promise<Candidate[]> {
  const res = await fetch(`${API_BASE}/api/match-custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_description: jobDescription,
      cv_texts: cvTexts,
      top_n: topN,
      min_score: minScore,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new ApiError(res.status, String(body.detail ?? `API error ${res.status}`));
  }

  const data: ApiMatchResponse = await res.json();

  // Map API candidates back to the frontend Candidate type.
  // We preserve the original CV text so the "Show full CV" feature still works.
  return data.candidates.map((apiC, index) => {
    // The backend returns the original CV index as the id string (e.g. "0", "2")
    const origIndex = parseInt(apiC.id, 10);
    const originalText = cvTexts[isNaN(origIndex) ? index : origIndex] ?? '';
    return mapApiCandidate(apiC, originalText, index);
  });
}
