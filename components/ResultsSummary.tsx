'use client';

import type { ChartGradeSummary } from '@/lib/gradeRange';

interface ResultsSummaryProps {
  gradeSummary: ChartGradeSummary;
}

/**
 * Displays the quiz results summary after submission.
 * Shows percentage, correct/incorrect counts, and action breakdown.
 */
export function ResultsSummary({ gradeSummary }: ResultsSummaryProps) {
  const percentage = Math.round(gradeSummary.overall.accuracy * 100);
  
  // Calculate total playable hands (excludes black hands which are not in hero's range)
  const { attempted, unanswered } = gradeSummary.overall;
  const totalPlayable = attempted + unanswered;

  const getPerformanceColor = () => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceMessage = () => {
    if (percentage === 100) return 'Perfect!';
    if (percentage >= 90) return 'Excellent!';
    if (percentage >= 70) return 'Good job!';
    if (percentage >= 50) return 'Keep practicing';
    return 'Study this range more';
  };

  // Build action breakdown - only show actions that have expected hands
  const actionBreakdown = [
    { key: 'raise', label: 'Raise', bgClass: 'bg-red-100', textClass: 'text-red-700' },
    { key: 'call', label: 'Call', bgClass: 'bg-green-100', textClass: 'text-green-700' },
    { key: 'fold', label: 'Fold', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
    { key: 'shove', label: 'Shove', bgClass: 'bg-rose-200', textClass: 'text-rose-800' },
  ].filter(action => {
    const stats = gradeSummary.overall.byAction[action.key as keyof typeof gradeSummary.overall.byAction];
    return stats && stats.expected > 0;
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
            ½ {gradeSummary.overall.halfCredit} half credit
          </span>
        )}
        <span className="text-red-600 font-medium">
          ✗ {gradeSummary.overall.wrong} incorrect
        </span>
      </div>
      
      {/* Show total playable hands if not 169 (indicates black hands were excluded) */}
      {totalPlayable < 169 && (
        <span className="text-xs text-slate-500">
          {totalPlayable} playable hands (out of 169)
        </span>
      )}
      
      <span className="text-slate-600 font-medium mt-1">
        {getPerformanceMessage()}
      </span>

      {/* Action breakdown - only show actions with expected hands */}
      {actionBreakdown.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-3 text-xs">
          {actionBreakdown.map(action => {
            const stats = gradeSummary.overall.byAction[action.key as keyof typeof gradeSummary.overall.byAction];
            return (
              <div key={action.key} className={`px-2 py-1 ${action.bgClass} ${action.textClass} rounded`}>
                {action.label}: {Math.round(stats.accuracy * 100)}%
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ResultsSummary;
