import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useTransform } from 'framer-motion';
import type { Candidate } from '../types';
import SwipeCard from './SwipeCard.tsx';

interface SwipeCardStackProps {
  candidates: Candidate[];
  onSwipe: (candidate: Candidate, direction: 'like' | 'nope') => void;
  jobOffer?: string;
}

const SWIPE_THRESHOLD = 140;
const VELOCITY_THRESHOLD = 750;

export default function SwipeCardStack({ candidates, onSwipe, jobOffer = '' }: SwipeCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const x = useMotionValue(0);
  const controls = useAnimationControls();

  const current = candidates[currentIndex];
  const next = candidates[currentIndex + 1];
  const likeOpacity = useTransform(x, [0, 120], [0, 1]);
  const nopeOpacity = useTransform(x, [-120, 0], [1, 0]);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const nextScale = useTransform(x, [-180, 0, 180], [0.965, 0.95, 0.965]);
  const nextOpacity = useTransform(x, [-180, 0, 180], [0.82, 0.68, 0.82]);

  const progress = useMemo(
    () => `${Math.min(currentIndex + 1, candidates.length)}/${candidates.length}`,
    [currentIndex, candidates.length]
  );

  const completeSwipe = async (direction: 'like' | 'nope') => {
    if (!current) return;
    const targetX = direction === 'like' ? 700 : -700;
    await controls.start({
      x: targetX,
      rotate: direction === 'like' ? 18 : -18,
      opacity: 0.1,
      transition: { duration: 0.22, ease: 'easeOut' }
    });
    onSwipe(current, direction);
    setCurrentIndex((idx) => idx + 1);
    x.set(0);
    controls.set({ x: 0, rotate: 0, opacity: 1 });
  };

  if (!current) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <p className="text-lg font-semibold text-white">Deck complete. No more candidates to swipe.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="mb-3 text-sm text-slate-400">Card {progress}</div>
      <div className="relative h-[500px]">
        {next && (
          <motion.div className="absolute inset-0 translate-y-3" style={{ scale: nextScale, opacity: nextOpacity }}>
            <SwipeCard candidate={next} showStamps={false} />
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            animate={controls}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            whileDrag={{ scale: 1.02 }}
            style={{ touchAction: 'pan-y', x, rotate }}
            onDragEnd={(_, info) => {
              const shouldSwipeRight =
                info.offset.x > SWIPE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD;
              const shouldSwipeLeft =
                info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD;

              if (shouldSwipeRight) {
                void completeSwipe('like');
                return;
              }

              if (shouldSwipeLeft) {
                void completeSwipe('nope');
                return;
              }
              void controls.start({
                x: 0,
                rotate: 0,
                transition: { type: 'spring', stiffness: 360, damping: 28 }
              });
            }}
            className="absolute inset-0"
          >
            <SwipeCard candidate={current} likeOpacity={likeOpacity} nopeOpacity={nopeOpacity} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setSelectedCandidate(current)}
          className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
        >
          View details
        </button>
      </div>

      {selectedCandidate && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Candidate Lookup</p>
                <h3 className="mt-1 text-xl font-bold text-white">{selectedCandidate.name}</h3>
                <p className="text-sm text-slate-400">{selectedCandidate.role}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                onClick={() => setSelectedCandidate(null)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Match score</p>
                <p className="mt-1 text-3xl font-black text-white">{selectedCandidate.matchScore}%</p>
                <p className="mt-2 text-xs text-indigo-100/90">
                  Semantic: {Math.round(selectedCandidate.scoreBreakdown?.semantic ?? selectedCandidate.matchScore)}% ·
                  Keyword: {Math.round(selectedCandidate.scoreBreakdown?.keywordCoverage ?? 0)}%
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">SBERT explanation</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  {selectedCandidate.explanation || 'No explanation available for this profile.'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Job offer</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                {jobOffer || 'Job offer text is not available in this session.'}
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Matched JD keywords</p>
                <p className="mt-2 text-sm leading-relaxed text-emerald-100">
                  {(selectedCandidate.matchedKeywords || []).join(', ') || 'No matched keywords found.'}
                </p>
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">Missing JD keywords</p>
                <p className="mt-2 text-sm leading-relaxed text-rose-100">
                  {(selectedCandidate.missingKeywords || []).join(', ') || 'No missing keywords reported.'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Curriculum (full text)</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                {selectedCandidate.text || 'No profile text available.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
