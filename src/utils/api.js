import axios from 'axios';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const toPercentScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 1) return Math.round(numeric * 100);
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeCandidate = (candidate, index) => ({
  ...candidate,
  id: candidate.id || `res-${index}`,
  name: candidate.name || `Candidate ${index + 1}`,
  category: candidate.category || candidate.role || 'General',
  text: candidate.text || candidate.resume || '',
  score: toPercentScore(candidate.match_score ?? candidate.matchScore ?? candidate.score),
});

export const matchResumes = async (jobDescription, candidates = [], topN = 10) => {
  const cvTexts = candidates.map((candidate) => candidate.text).filter(Boolean);
  try {
    const response = await api.post('/api/match-custom', {
      job_description: jobDescription,
      cv_texts: cvTexts,
      top_n: topN,
      min_score: 0,
    });

    const apiCandidates = response.data?.candidates || [];
    const mapped = apiCandidates.map((candidate, index) => {
      const originalIndex = Number.parseInt(candidate.id, 10);
      const source = Number.isNaN(originalIndex) ? candidates[index] : candidates[originalIndex];
      return normalizeCandidate(
        {
          ...source,
          ...candidate,
          text: source?.text || '',
          category: source?.category || candidate.role || candidate.job_position,
        },
        index
      );
    });

    return { candidates: mapped };
  } catch (error) {
    console.error('Error matching resumes:', error);
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/healthz');
    return response.data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { status: 'offline' };
  }
};

export { toPercentScore, normalizeCandidate };
export default api;
