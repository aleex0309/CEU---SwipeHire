import { motion, type MotionValue } from 'framer-motion';
import type { Candidate } from '../types';

interface SwipeCardProps {
  candidate: Candidate;
  likeOpacity?: MotionValue<number>;
  nopeOpacity?: MotionValue<number>;
  showStamps?: boolean;
}

/** Thin horizontal progress bar with label */
function ScoreBar({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-[10px] font-semibold text-slate-300">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export default function SwipeCard({
  candidate,
  likeOpacity,
  nopeOpacity,
  showStamps = true,
}: SwipeCardProps) {
  const matchScore = Number.isFinite(candidate.matchScore)
    ? candidate.matchScore
    : Math.max(0, Math.min(100, Math.round(Number((candidate as Candidate & { score?: number }).score) || 0)));
  const { scoreBreakdown, matchedKeywords, scoredByAI, explanation } = candidate;

  const badgeClass =
    matchScore >= 70
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : matchScore >= 45
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  const topMatched = matchedKeywords?.slice(0, 5) ?? candidate.topSkills.slice(0, 5);

  return (
    <motion.article
      className="relative h-[500px] w-full overflow-hidden rounded-[2rem] border border-white/15 bg-slate-900 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      initial={{ scale: 0.98, opacity: 0.95 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/28 via-fuchsia-500/18 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_75%_8%,rgba(34,197,94,0.2),transparent_20%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,.92)_85%)]" />

      {/* Swipe stamps */}
      {showStamps && (
        <>
          <motion.div
            className="absolute left-6 top-8 z-20 -rotate-12 rounded-md border-4 border-emerald-400 px-4 py-1 text-2xl font-extrabold tracking-wider text-emerald-300"
            style={{ opacity: likeOpacity ?? 0 }}
          >
            LIKE
          </motion.div>
          <motion.div
            className="absolute right-6 top-8 z-20 rotate-12 rounded-md border-4 border-rose-400 px-4 py-1 text-2xl font-extrabold tracking-wider text-rose-300"
            style={{ opacity: nopeOpacity ?? 0 }}
          >
            NOPE
          </motion.div>
        </>
      )}

      {/* AI badge (top-right) */}
      {scoredByAI && (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-indigo-500/40 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-300">
          AI · SBERT
        </div>
      )}

      {/* Card body */}
      <div className="absolute bottom-0 left-0 right-0 z-10 space-y-3 p-5">

        {/* Name + score badge */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black text-white leading-tight">{candidate.name}</h3>
          <span className={`shrink-0 rounded-xl border px-3 py-1 text-sm font-semibold ${badgeClass}`}>
            {matchScore}% match
          </span>
        </div>

        {/* Role + meta */}
        <p className="text-xs text-slate-300">
          {candidate.role}
          {candidate.yearsExperience > 0 && ` · ${candidate.yearsExperience} yrs`}
          {candidate.location && ` · ${candidate.location}`}
        </p>

        {/* Score breakdown bars — only when AI-scored */}
        {scoreBreakdown && (
          <div className="space-y-1.5 rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2.5">
            <ScoreBar
              label="Semantic alignment (SBERT)"
              value={scoreBreakdown.semantic}
              colorClass="bg-indigo-400"
            />
            <ScoreBar
              label="Keyword coverage"
              value={scoreBreakdown.keywordCoverage}
              colorClass="bg-emerald-400"
            />
            <p className="pt-1 text-[10px] leading-relaxed text-slate-400">
              Final match score combines semantic similarity and keyword coverage for an explainable rank.
            </p>
          </div>
        )}

        {scoredByAI && (
          <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
              SBERT Detail
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-indigo-100/90">
              Semantic: {Math.round(scoreBreakdown?.semantic ?? matchScore)}% · Keyword: {Math.round(scoreBreakdown?.keywordCoverage ?? 0)}%
            </p>
            {explanation && (
              <p className="mt-1 text-[10px] leading-relaxed text-indigo-100/80 line-clamp-3">
                {explanation}
              </p>
            )}
          </div>
        )}

        {/* Matched keyword pills */}
        {topMatched.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topMatched.map((kw) => (
              <span
                key={`${candidate.id}-${kw}`}
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-300"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Summary */}
        <p className="text-xs text-slate-400 line-clamp-2">{candidate.summary}</p>
      </div>
    </motion.article>
  );
}
