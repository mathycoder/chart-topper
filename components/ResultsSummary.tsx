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
      
      <span className="text-slate-600 font-medium mt-1">
        {getPerformanceMessage()}
      </span>

      {/* Action breakdown */}
      <div className="flex gap-3 mt-3 text-xs">
        <div className="px-2 py-1 bg-green-100 text-green-700 rounded">
          Raise: {Math.round(gradeSummary.overall.byAction.raise.accuracy * 100)}%
        </div>
        <div className="px-2 py-1 bg-red-100 text-red-700 rounded">
          Fold: {Math.round(gradeSummary.overall.byAction.fold.accuracy * 100)}%
        </div>
      </div>
    </div>
  );
}

export default ResultsSummary;
