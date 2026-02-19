'use client';

import type { RangeData } from '@/types';
import type { ChartGradeSummary } from '@/lib/gradeRange';

interface ResultsSummaryProps {
  gradeSummary: ChartGradeSummary;
  /** The correct range to derive action-composition percentages from (matches ViewMode stats). */
  rangeData?: RangeData;
  isDeltaMode?: boolean;
}

/**
 * Displays the quiz results summary after submission.
 * Shows percentage, correct/incorrect counts, and action breakdown.
 */
/** Count weighted combo frequencies in a range (mirrors ViewMode's countActions). */
function countRangeActions(data: RangeData) {
  let raise = 0, call = 0, fold = 0, shove = 0, black = 0;
  for (const action of Object.values(data)) {
    if (typeof action === 'string') {
      if (action === 'raise') raise++;
      else if (action === 'call') call++;
      else if (action === 'fold') fold++;
      else if (action === 'shove') shove++;
      else if (action === 'black') black++;
    } else {
      raise += (action.raise ?? 0) / 100;
      call  += (action.call  ?? 0) / 100;
      fold  += (action.fold  ?? 0) / 100;
      shove += (action.shove ?? 0) / 100;
    }
  }
  const playable = 169 - black;
  return { raise, call, fold, shove, black, playable };
}

export function ResultsSummary({ gradeSummary, rangeData, isDeltaMode = false }: ResultsSummaryProps) {
  const percentage = Math.round(gradeSummary.overall.accuracy * 100);

  // Total graded hands (excludes 'black' hands not in hero's range)
  const { attempted, unanswered } = gradeSummary.overall;
  const totalPlayable = attempted + unanswered;

  // Range composition stats — same calculation as ViewMode
  const rangeStats = rangeData ? countRangeActions(rangeData) : null;

  const getPerformanceColor = () => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const ACTION_META = [
    { key: 'raise' as const, label: 'Raise', bgClass: 'bg-red-100',  textClass: 'text-red-700'  },
    { key: 'call'  as const, label: 'Call',  bgClass: 'bg-green-100', textClass: 'text-green-700' },
    { key: 'fold'  as const, label: 'Fold',  bgClass: 'bg-blue-100',  textClass: 'text-blue-700'  },
    { key: 'shove' as const, label: 'Shove', bgClass: 'bg-rose-200',  textClass: 'text-rose-800'  },
  ];

  // Show pills for actions that exist in the correct range (or graded range if no rangeData)
  const actionBreakdown = ACTION_META.filter(({ key }) => {
    if (rangeStats) return rangeStats[key] > 0;
    return (gradeSummary.overall.byAction[key]?.expected ?? 0) > 0;
  });

  return (
    <div className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
        Results
      </span>

      <div className={`text-5xl font-bold ${getPerformanceColor()}`}>
        {percentage}%
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-green-600 font-medium">
          ✓ {gradeSummary.overall.correct} correct
        </span>
        {gradeSummary.overall.halfCredit > 0 && (
          <span className="text-amber-600 font-medium">
            ½ {gradeSummary.overall.halfCredit} partial
          </span>
        )}
        <span className="text-red-600 font-medium">
          ✗ {gradeSummary.overall.wrong} incorrect
        </span>
      </div>

      {/* Contextual hand count */}
      {isDeltaMode ? (
        <span className="text-xs text-slate-500">
          {totalPlayable} hand{totalPlayable !== 1 ? 's' : ''} changed
        </span>
      ) : totalPlayable < 169 ? (
        <span className="text-xs text-slate-500">
          {totalPlayable} playable hands
        </span>
      ) : null}

      {/* Action composition pills — percentages match ViewMode's range summary */}
      {actionBreakdown.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-3 text-xs">
          {actionBreakdown.map(({ key, label, bgClass, textClass }) => {
            let pct: number;
            if (rangeStats && rangeStats.playable > 0) {
              pct = Math.round((rangeStats[key] / rangeStats.playable) * 100);
            } else {
              const stats = gradeSummary.overall.byAction[key];
              const score = stats.correct + stats.halfCredit * 0.5;
              pct = totalPlayable > 0 ? Math.round((score / totalPlayable) * 100) : 0;
            }
            return (
              <div key={key} className={`px-2 py-1 ${bgClass} ${textClass} rounded`}>
                {label}: {pct}%
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ResultsSummary;
