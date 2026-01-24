'use client';

import { useState } from 'react';
import type { ChartGradeSummary, LeakGroup, HandDiff } from '@/lib/gradeRange';

interface ResultsDisplayProps {
  /** The grading summary from gradeRangeSubmission */
  gradeSummary: ChartGradeSummary | null;
  /** Whether results should be shown */
  isVisible: boolean;
}

/**
 * Displays the quiz results after submission.
 * 
 * Shows:
 * - Percentage correct as a large number
 * - Count of correct vs total
 * - Strengths and priority fixes
 * - Top leaks with examples
 */
export function ResultsDisplay({
  gradeSummary,
  isVisible,
}: ResultsDisplayProps) {
  const [expandedLeak, setExpandedLeak] = useState<string | null>(null);

  if (!isVisible || !gradeSummary) return null;

  const { overall, strengths, priorityFixes, topLeaks } = gradeSummary;
  const percentage = Math.round(overall.accuracy * 100);

  // Color based on performance
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

  const getSeverityColor = (severity: HandDiff['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-amber-600 bg-amber-50';
      case 'low': return 'text-slate-600 bg-slate-50';
    }
  };

  const getMistakeTypeLabel = (type: HandDiff['mistakeType']) => {
    switch (type) {
      case 'too_tight': return 'Too tight';
      case 'too_loose': return 'Too loose';
      case 'over_aggressive': return 'Over-aggressive';
      case 'under_aggressive': return 'Under-aggressive';
      case 'wrong_blend': return 'Wrong blend';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Score Card */}
      <div className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
        <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">
          Results
        </span>
        
        <div className={`text-5xl font-bold ${getPerformanceColor()}`}>
          {percentage}%
        </div>
        
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 font-medium">
            ✓ {overall.correct} correct
          </span>
          {overall.halfCredit > 0 && (
            <span className="text-amber-600 font-medium">
              ½ {overall.halfCredit} half credit
            </span>
          )}
          <span className="text-red-600 font-medium">
            ✗ {overall.wrong} incorrect
          </span>
        </div>
        
        <span className="text-slate-600 font-medium mt-1">
          {getPerformanceMessage()}
        </span>

        {/* Action breakdown */}
        <div className="flex gap-3 mt-3 text-xs">
          <div className="px-2 py-1 bg-green-100 text-green-700 rounded">
            Raise: {Math.round(overall.byAction.raise.accuracy * 100)}%
          </div>
          <div className="px-2 py-1 bg-red-100 text-red-700 rounded">
            Fold: {Math.round(overall.byAction.fold.accuracy * 100)}%
          </div>
        </div>
      </div>

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Strengths</h3>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Priority Fixes */}
      {priorityFixes.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Priority Fixes</h3>
          <ul className="space-y-1">
            {priorityFixes.map((p, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">→</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top Leaks */}
      {topLeaks.length > 0 && (
        <div className="p-4 bg-white rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Top Leaks</h3>
          <div className="space-y-3">
            {topLeaks.map((leak) => (
              <LeakCard
                key={leak.id}
                leak={leak}
                isExpanded={expandedLeak === leak.id}
                onToggle={() => setExpandedLeak(expandedLeak === leak.id ? null : leak.id)}
                getSeverityColor={getSeverityColor}
                getMistakeTypeLabel={getMistakeTypeLabel}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface LeakCardProps {
  leak: LeakGroup;
  isExpanded: boolean;
  onToggle: () => void;
  getSeverityColor: (severity: HandDiff['severity']) => string;
  getMistakeTypeLabel: (type: HandDiff['mistakeType']) => string;
}

function LeakCard({ leak, isExpanded, onToggle, getSeverityColor, getMistakeTypeLabel }: LeakCardProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 text-sm">{leak.title}</span>
          <span className="text-xs text-slate-500">({leak.examples.length} hands)</span>
        </div>
        <span className="text-slate-400 text-sm">
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="p-3 space-y-3">
          <p className="text-sm text-slate-600">{leak.diagnosis}</p>
          
          <div className="text-sm">
            <span className="font-medium text-slate-700">What to do: </span>
            <span className="text-slate-600">{leak.whatToDo}</span>
          </div>
          
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-500 uppercase">Examples</span>
            {leak.examples.slice(0, 5).map((ex) => (
              <div
                key={ex.hand}
                className={`p-2 rounded text-sm ${getSeverityColor(ex.severity)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold">{ex.hand}</span>
                  <span className="text-xs opacity-75">
                    {getMistakeTypeLabel(ex.mistakeType)}
                  </span>
                </div>
                <div className="text-xs mb-1">
                  You: <span className="font-medium">{ex.got}</span> → Should: <span className="font-medium">{ex.expectedBlendType || ex.expectedPrimary}</span>
                  {ex.isHalfCredit && <span className="ml-1 text-amber-600">(½ credit)</span>}
                </div>
                <div className="text-xs opacity-90">{ex.why}</div>
              </div>
            ))}
          </div>
          
          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs text-slate-500">{leak.drill}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultsDisplay;
