/**
 * ScoreBreakdown holds the two scoring signals returned by the backend:
 *  - semantic: Sentence-BERT cosine similarity × 100  (0–100)
 *  - keywordCoverage: % of JD key terms found in the profile (0–100)
 */
export interface ScoreBreakdown {
  semantic: number;
  keywordCoverage: number;
}

/**
 * Candidate is the unified model used throughout the frontend.
 *
 * When the backend API is available, the explainability fields are populated.
 * When running in offline / fallback mode they are omitted.
 */
export interface Candidate {
  id: string;
  name: string;
  role: string;
  location: string;
  yearsExperience: number;
  topSkills: string[];
  text: string;
  matchScore: number; // 0–100 integer, ready for display

  summary: string;

  // ── Explainability (from Sentence-BERT backend) ────────────────────────
  matchedKeywords?: string[];   // JD terms found in the candidate's profile
  missingKeywords?: string[];   // Significant JD terms absent from the profile
  explanation?: string;         // Human-readable explanation of the score
  scoreBreakdown?: ScoreBreakdown;

  /** True when the score came from the SBERT API, false = local token overlap */
  scoredByAI?: boolean;
}
