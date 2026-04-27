import { useState } from 'react';
import type { Candidate } from '../types';
import Button from './Button';

interface MatchResultsProps {
  likedCandidates: Candidate[];
  onRestart: () => void;
}

/** Horizontal score bar used in the detail panel */
function DetailBar({
  label,
  value,
  colorClass,
  hint,
}: {
  label: string;
  value: number;
  colorClass: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold text-slate-200">{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Pill chip */
function Chip({
  label,
  colorClass,
}: {
  label: string;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

export default function MatchResults({ likedCandidates, onRestart }: MatchResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const download = () => {
    const payload = likedCandidates.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      matchScore: c.matchScore,
      scoredByAI: c.scoredByAI ?? false,
      scoreBreakdown: c.scoreBreakdown,
      matchedKeywords: c.matchedKeywords,
      missingKeywords: c.missingKeywords,
      explanation: c.explanation,
      summary: c.summary,
      text: c.text,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swipehire-selected-candidates.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-white">Your Matches</h2>
        {likedCandidates.some((c) => c.scoredByAI) && (
          <span className="rounded-full border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
            AI · Sentence-BERT · all-MiniLM-L6-v2
          </span>
        )}
      </div>

      {likedCandidates.length === 0 ? (
        <p className="mt-4 text-slate-400">No likes this round. Tough crowd.</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {likedCandidates.map((c) => {
            const expanded = expandedId === c.id;
            const matchBg =
              c.matchScore >= 70
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : c.matchScore >= 45
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300';

            return (
              <li
                key={c.id}
                className="rounded-2xl border border-slate-700 bg-slate-950/70 overflow-hidden"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-xl border px-3 py-1 text-sm font-bold ${matchBg}`}>
                      {c.matchScore}%
                    </span>
                    <div>
                      <p className="font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-indigo-300 hover:text-indigo-200"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                  >
                    {expanded ? 'Collapse ↑' : 'View full analysis ↓'}
                  </button>
                </div>

                {/* Always-visible summary */}
                <div className="border-t border-slate-800/70 px-4 pb-4 pt-3">
                  <p className="text-sm text-slate-300">{c.summary}</p>
                </div>

                {/* Expanded: full explainability panel */}
                {expanded && (
                  <div className="border-t border-slate-800 px-4 pb-5 pt-4 space-y-5">

                    {/* Score breakdown bars */}
                    {c.scoreBreakdown && (
                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Score breakdown
                        </p>
                        <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
                          <DetailBar
                            label="Semantic alignment (Sentence-BERT cosine similarity)"
                            value={c.scoreBreakdown.semantic}
                            colorClass="bg-indigo-500"
                            hint="How closely the meaning of this profile matches the job description, as measured by the all-MiniLM-L6-v2 neural embedding model."
                          />
                          <DetailBar
                            label="Keyword coverage"
                            value={c.scoreBreakdown.keywordCoverage}
                            colorClass="bg-emerald-500"
                            hint="Percentage of the job description's key terms found verbatim in this profile."
                          />
                        </div>
                        {c.scoredByAI && (
                          <p className="mt-1.5 text-[10px] text-slate-500">
                            Scored by Sentence-BERT (all-MiniLM-L6-v2) · 384-dim cosine similarity
                          </p>
                        )}
                      </div>
                    )}

                    {/* AI explanation paragraph */}
                    {c.explanation && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                          AI explanation
                        </p>
                        <p className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-200">
                          {c.explanation}
                        </p>
                      </div>
                    )}

                    {/* Matched keywords */}
                    {c.matchedKeywords && c.matchedKeywords.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Matching terms ({c.matchedKeywords.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.matchedKeywords.map((kw) => (
                            <Chip
                              key={kw}
                              label={kw}
                              colorClass="border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing keywords */}
                    {c.missingKeywords && c.missingKeywords.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Notable gaps — JD terms not in this profile ({c.missingKeywords.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.missingKeywords.map((kw) => (
                            <Chip
                              key={kw}
                              label={kw}
                              colorClass="border-slate-600/60 bg-slate-800/60 text-slate-400"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Full CV text */}
                    {c.text && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                          Full profile
                        </p>
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-950/70 p-4">
                          <p className="whitespace-pre-wrap text-xs text-slate-400">{c.text}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={download} disabled={!likedCandidates.length}>
          Download selected candidates
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Restart
        </Button>
      </div>
    </section>
  );
}
