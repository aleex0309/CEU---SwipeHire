import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls, useMotionValue, useTransform } from 'framer-motion';
import type { Candidate } from '../types';
import SwipeCard from './SwipeCard';

interface SwipeCardStackProps {
  candidates: Candidate[];
  onSwipe: (candidate: Candidate, direction: 'like' | 'nope') => void;
}

const SWIPE_THRESHOLD = 140;
const VELOCITY_THRESHOLD = 750;

export default function SwipeCardStack({ candidates, onSwipe }: SwipeCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
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
    </div>
  );
}
