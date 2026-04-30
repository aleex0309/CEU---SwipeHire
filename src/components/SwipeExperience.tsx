import { useEffect, useMemo, useState } from 'react';
import type { Candidate } from '../types';
import {
  SWIPEHIRE_CANDIDATES_KEY,
  SWIPEHIRE_JOB_OFFER_KEY,
  SWIPEHIRE_LIKED_KEY,
} from '../lib/storage';
import SwipeCardStack from './SwipeCardStack';
import MatchResults from './MatchResults';

const toPercentScore = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 1) return Math.round(numeric * 100);
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeCandidate = (raw: Candidate & { score?: unknown; match_score?: unknown }): Candidate => ({
  ...raw,
  matchScore: toPercentScore(raw.matchScore ?? raw.match_score ?? raw.score),
});

export default function SwipeExperience() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [likedCandidates, setLikedCandidates] = useState<Candidate[]>([]);
  const [discardedCandidates, setDiscardedCandidates] = useState<Candidate[]>([]);
  const [jobOffer, setJobOffer] = useState('');

  useEffect(() => {
    const deck = localStorage.getItem(SWIPEHIRE_CANDIDATES_KEY);
    const storedJobOffer = localStorage.getItem(SWIPEHIRE_JOB_OFFER_KEY);

    if (deck) {
      try {
        const parsed = JSON.parse(deck) as Array<Candidate & { score?: unknown; match_score?: unknown }>;
        setCandidates(parsed.map(normalizeCandidate));
      } catch {
        localStorage.removeItem(SWIPEHIRE_CANDIDATES_KEY);
      }
    }
    if (storedJobOffer) setJobOffer(storedJobOffer);

    // Always start a fresh swipe session (no restore from prior likes/discards).
    setLikedCandidates([]);
    setDiscardedCandidates([]);
    localStorage.removeItem(SWIPEHIRE_LIKED_KEY);
  }, []);

  useEffect(() => {
    localStorage.setItem(SWIPEHIRE_LIKED_KEY, JSON.stringify(likedCandidates));
  }, [likedCandidates]);

  const hasFinishedDeck = useMemo(
    () => candidates.length > 0 && likedCandidates.length + discardedCandidates.length >= candidates.length,
    [candidates.length, likedCandidates.length, discardedCandidates.length]
  );
  const total = candidates.length;
  const liked = likedCandidates.length;
  const discarded = discardedCandidates.length;
  const remaining = Math.max(total - liked - discarded, 0);
  const completion = total ? Math.round(((liked + discarded) / total) * 100) : 0;

  const onSwipe = (candidate: Candidate, direction: 'like' | 'nope') => {
    if (direction === 'like') setLikedCandidates((prev) => [...prev, candidate]);
    if (direction === 'nope') setDiscardedCandidates((prev) => [...prev, candidate]);
  };

  const clearDeck = () => {
    localStorage.removeItem(SWIPEHIRE_CANDIDATES_KEY);
    localStorage.removeItem(SWIPEHIRE_LIKED_KEY);
    localStorage.removeItem(SWIPEHIRE_JOB_OFFER_KEY);
    setCandidates([]);
    setLikedCandidates([]);
    setDiscardedCandidates([]);
    setJobOffer('');
  };

  const restart = () => {
    setLikedCandidates([]);
    setDiscardedCandidates([]);
  };

  if (!candidates.length) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
        <h1 className="text-3xl font-black text-white">No deck ready yet</h1>
        <p className="mt-3 text-slate-300">Go to the studio page, analyze CVs, then come back and swipe.</p>
        <a
          href="/app"
          className="mt-6 inline-flex rounded-2xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400"
        >
          Go to Studio
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-screen w-full max-w-7xl flex-col overflow-hidden px-5 py-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Swipe mode</p>
          <h1 className="text-2xl font-black text-white">Candidate Deck</h1>
          <p className="mt-1 text-sm text-slate-400">Drag, flick, or tap. One profile, one decision.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={clearDeck}
            className="text-sm text-rose-400 hover:text-rose-300"
          >
            Clear deck
          </button>
          <a href="/app" className="text-sm text-indigo-300 hover:text-indigo-200">
            Back to job and CV setup
          </a>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[260px_1fr_260px]">
        <aside className="rounded-3xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Swipe Stats</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-emerald-200">OK / Liked</p>
              <p className="text-2xl font-black text-emerald-300">{liked}</p>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3">
              <p className="text-rose-200">Discarded</p>
              <p className="text-2xl font-black text-rose-300">{discarded}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-slate-300">Remaining</p>
              <p className="text-2xl font-black text-white">{remaining}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-slate-300">Completion</p>
              <p className="text-2xl font-black text-indigo-300">{completion}%</p>
            </div>
          </div>
        </aside>

        <div className="min-h-0 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/65 to-slate-950/65 p-4 shadow-2xl backdrop-blur">
          {!hasFinishedDeck ? (
            <div className="flex h-full items-center justify-center">
              <SwipeCardStack candidates={candidates} onSwipe={onSwipe} jobOffer={jobOffer} />
            </div>
          ) : (
            <div className="h-full overflow-y-auto pr-1">
              <MatchResults likedCandidates={likedCandidates} onRestart={restart} />
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Session Quality</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3">
              <p className="text-indigo-200">Deck in queue</p>
              <p className="text-2xl font-black text-indigo-300">{remaining}</p>
              <p className="mt-0.5 text-[11px] text-indigo-200/80">from {total} total candidates</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-slate-300">Current focus</p>
              <p className="mt-1 font-semibold text-white">{remaining > 0 ? 'Single profile decision mode' : 'Review finished'}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-slate-300">Tip</p>
              <p className="mt-1 text-slate-200">Short, decisive swipes improve consistency and reduce bias.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
