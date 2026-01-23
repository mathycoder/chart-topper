'use client';

interface ResultsDisplayProps {
  /** Number of correct answers */
  correct: number;
  /** Total number of hands */
  total: number;
  /** Whether results should be shown */
  isVisible: boolean;
}

/**
 * Displays the quiz results after submission.
 * 
 * Shows:
 * - Percentage correct as a large number
 * - Count of correct vs total
 * - Color-coded based on performance
 */
export function ResultsDisplay({
  correct,
  total,
  isVisible,
}: ResultsDisplayProps) {
  if (!isVisible) return null;

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const incorrect = total - correct;

  // Color based on performance
  const getPerformanceColor = () => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceMessage = () => {
    if (percentage === 100) return 'Perfect! 🎯';
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
          ✓ {correct} correct
        </span>
        <span className="text-red-600 font-medium">
          ✗ {incorrect} incorrect
        </span>
      </div>
      
      <span className="text-slate-600 font-medium mt-1">
        {getPerformanceMessage()}
      </span>
    </div>
  );
}

export default ResultsDisplay;
