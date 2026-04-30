import { useState } from 'react';
import Button from './Button';
import CVInput from './CVInput';
import JobInput from './JobInput';
import { checkHealth, matchCustomCvs } from '../lib/api';
import { buildCandidatesLocal, mockCvs, mockJobOffer, parseCvs } from '../lib/matching';
import { SWIPEHIRE_CANDIDATES_KEY, SWIPEHIRE_JOB_OFFER_KEY } from '../lib/storage';

type AnalysisMode = 'idle' | 'checking' | 'scoring-ai' | 'scoring-local' | 'done' | 'error';

export default function SwipeHireStudio() {
  const [jobOffer, setJobOffer] = useState('');
  const [cvInput, setCvInput] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const cvCount = cvInput.trim() ? parseCvs(cvInput).length : 0;

  const analyze = async (forceLocal = false) => {
    if (!jobOffer.trim() || !cvInput.trim()) return;

    setMode('checking');
    setErrorMessage('');

    const cvs = parseCvs(cvInput);

    try {
      if (!forceLocal) {
        const healthy = await checkHealth();

        if (healthy) {
          setMode('scoring-ai');
          const candidates = await matchCustomCvs(jobOffer, cvs, cvs.length);
          localStorage.setItem(SWIPEHIRE_CANDIDATES_KEY, JSON.stringify(candidates));
          localStorage.setItem(SWIPEHIRE_JOB_OFFER_KEY, jobOffer);
          setMode('done');
          window.location.href = '/swipe';
          return;
        }
      }

      // Fallback: local token-overlap scoring
      setMode('scoring-local');
      await new Promise((r) => setTimeout(r, 400));
      const candidates = buildCandidatesLocal(jobOffer, cvs);
      localStorage.setItem(SWIPEHIRE_CANDIDATES_KEY, JSON.stringify(candidates));
      localStorage.setItem(SWIPEHIRE_JOB_OFFER_KEY, jobOffer);
      setMode('done');
      window.location.href = '/swipe';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setMode('error');
    }
  };

  const fillMockData = () => {
    setJobOffer(mockJobOffer());
    setCvInput(mockCvs().join('\n\n'));
    setMode('idle');
  };

  const isLoading = mode === 'checking' || mode === 'scoring-ai' || mode === 'scoring-local';

  const statusLabel: Record<AnalysisMode, string> = {
    idle: 'Analyze & Open Swipe Deck',
    checking: 'Connecting to AI engine…',
    'scoring-ai': 'Scoring with Sentence-BERT (all-MiniLM-L6-v2)…',
    'scoring-local': 'Scoring locally (backend offline)…',
    done: 'Done! Redirecting…',
    error: 'Retry',
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <header className="mb-7 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SwipeHire SaaS Workspace</p>
            <h1 className="mt-1 text-3xl font-black text-white">Candidate Matching Console</h1>
            <p className="mt-1 text-slate-400">
              Create your role profile, ingest CVs, and let{' '}
              <span className="font-semibold text-indigo-300">Sentence-BERT</span> rank &amp; explain every candidate.
            </p>
          </div>
          <Button variant="secondary" onClick={fillMockData}>
            Load example pipeline data
          </Button>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6 lg:grid-cols-2">
          <JobInput value={jobOffer} onChange={setJobOffer} />
          <CVInput value={cvInput} onChange={setCvInput} />
        </div>

        <aside className="rounded-3xl border border-slate-800/90 bg-slate-900/70 p-6">
          <h2 className="text-lg font-bold text-white">Pipeline health</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-slate-400">Job brief completeness</p>
              <p className="mt-1 text-xl font-bold text-indigo-300">
                {jobOffer.trim().length > 120 ? 'High' : 'Draft'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-slate-400">Candidate profiles detected</p>
              <p className="mt-1 text-xl font-bold text-emerald-300">{cvCount}</p>
            </div>
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
              <p className="text-indigo-200">Scoring engine</p>
              <p className="mt-1 font-semibold text-white">Sentence-BERT · all-MiniLM-L6-v2</p>
              <p className="mt-0.5 text-xs text-indigo-300/70">
                Cosine similarity + keyword coverage → explainable score
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-slate-400">Next step</p>
              <p className="mt-1 font-semibold text-slate-200">Analyze → swipe deck with AI explanations</p>
            </div>
          </div>
        </aside>
      </section>

      {/* Status bar */}
      {isLoading && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <span className="text-sm text-indigo-200">{statusLabel[mode]}</span>
          {mode === 'scoring-ai' && (
            <span className="ml-auto text-xs text-indigo-400/70">
              Encoding {cvCount} CV{cvCount !== 1 ? 's' : ''} with neural embeddings…
            </span>
          )}
        </div>
      )}

      {mode === 'error' && (
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-300">Backend error: {errorMessage}</p>
          <p className="mt-1 text-xs text-rose-400/80">
            The AI engine is unreachable. You can retry or fall back to local keyword scoring.
          </p>
          <div className="mt-3 flex gap-3">
            <Button onClick={() => void analyze(false)}>Retry AI scoring</Button>
            <Button variant="secondary" onClick={() => void analyze(true)}>
              Use local scoring (offline)
            </Button>
          </div>
        </div>
      )}

      {mode !== 'error' && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void analyze(false)}
            disabled={isLoading || !jobOffer.trim() || !cvInput.trim()}
          >
            {statusLabel[mode]}
          </Button>
          <a href="/swipe" className="text-sm text-indigo-300 hover:text-indigo-200">
            Already have a deck? Open swipe page →
          </a>
        </div>
      )}
    </main>
  );
}
