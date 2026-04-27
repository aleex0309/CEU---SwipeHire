import { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import CVInput from './CVInput';
import JobInput from './JobInput';
import MatchResults from './MatchResults';
import SwipeCardStack from './SwipeCardStack';
import { buildCandidatesLocal, mockCvs, mockJobOffer, parseCvs } from '../lib/matching';
import type { Candidate } from '../types';

const LIKED_STORAGE_KEY = 'swipehire-liked-candidates';

export default function SwipeHireApp() {
  const [jobOffer, setJobOffer] = useState('');
  const [cvInput, setCvInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [likedCandidates, setLikedCandidates] = useState<Candidate[]>([]);
  const [discardedCandidates, setDiscardedCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(LIKED_STORAGE_KEY);
    if (stored) {
      try {
        setLikedCandidates(JSON.parse(stored));
      } catch {
        localStorage.removeItem(LIKED_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(likedCandidates));
  }, [likedCandidates]);

  const hasFinishedDeck = useMemo(
    () => candidates.length > 0 && likedCandidates.length + discardedCandidates.length >= candidates.length,
    [candidates.length, likedCandidates.length, discardedCandidates.length]
  );

  const analyze = async () => {
    if (!jobOffer.trim() || !cvInput.trim()) return;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const cvs = parseCvs(cvInput);
    const scored = buildCandidatesLocal(jobOffer, cvs);
    setCandidates(scored);
    setLikedCandidates([]);
    setDiscardedCandidates([]);
    setLoading(false);
  };

  const onSwipe = (candidate: Candidate, direction: 'like' | 'nope') => {
    if (direction === 'like') setLikedCandidates((prev) => [...prev, candidate]);
    if (direction === 'nope') setDiscardedCandidates((prev) => [...prev, candidate]);
  };

  const restart = () => {
    setCandidates([]);
    setLikedCandidates([]);
    setDiscardedCandidates([]);
  };

  const fillMockData = () => {
    setJobOffer(mockJobOffer());
    setCvInput(mockCvs().join('\n\n'));
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">SwipeHire Studio</h1>
          <p className="mt-1 text-slate-400">Recruit like it is 2026, not 2006.</p>
        </div>
        <Button variant="secondary" onClick={fillMockData}>
          Generate mock CV data
        </Button>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <JobInput value={jobOffer} onChange={setJobOffer} />
        <CVInput value={cvInput} onChange={setCvInput} />
      </section>

      <div className="mt-6">
        <Button onClick={analyze} disabled={loading || !jobOffer.trim() || !cvInput.trim()}>
          {loading ? 'Analyzing candidates...' : 'Analyze & Start Matching'}
        </Button>
      </div>

      {candidates.length > 0 && !hasFinishedDeck && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-white">Swipe candidates</h2>
          <SwipeCardStack candidates={candidates} onSwipe={onSwipe} />
        </section>
      )}

      {hasFinishedDeck && (
        <section className="mt-10">
          <MatchResults likedCandidates={likedCandidates} onRestart={restart} />
        </section>
      )}
    </main>
  );
}
