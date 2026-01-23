'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SimpleAction, PokerRange } from '@/types';
import { isSimpleAction } from '@/types';
import { ALL_HANDS } from '@/data/hands';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsDisplay } from './ResultsDisplay';

interface RangeBuilderProps {
  /** The poker range to quiz against */
  range: PokerRange;
}

/**
 * Main container for the range builder quiz mode.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Single column stacked layout
 */
export function RangeBuilder({ range }: RangeBuilderProps) {
  const [userSelections, setUserSelections] = useState<Record<string, SimpleAction | null>>(() => {
    const initial: Record<string, SimpleAction | null> = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  const [selectedAction, setSelectedAction] = useState<SimpleAction | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const paintCell = useCallback((hand: string) => {
    if (selectedAction && !isSubmitted) {
      setUserSelections(prev => ({
        ...prev,
        [hand]: selectedAction,
      }));
    }
  }, [selectedAction, isSubmitted]);

  const handlePaintStart = useCallback((hand: string) => {
    setIsPainting(true);
    paintCell(hand);
  }, [paintCell]);

  useEffect(() => {
    const handleMouseUp = () => setIsPainting(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  const totalCells = ALL_HANDS.length;
  const allFilled = filledCount === totalCells;

  const calculateResults = () => {
    let correct = 0;
    ALL_HANDS.forEach(hand => {
      const userAnswer = userSelections[hand];
      const correctAnswer = range.data[hand];
      if (userAnswer && correctAnswer && isSimpleAction(correctAnswer)) {
        if (userAnswer === correctAnswer) correct++;
      }
    });
    return { correct, total: totalCells };
  };

  const results = isSubmitted ? calculateResults() : { correct: 0, total: totalCells };

  const handleSubmit = () => {
    if (allFilled) setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setUserSelections(() => {
      const reset: Record<string, SimpleAction | null> = {};
      ALL_HANDS.forEach(hand => {
        reset[hand] = null;
      });
      return reset;
    });
    setSelectedAction(null);
  };

  return (
    <div className={`p-4 lg:p-8 ${isPainting ? 'select-none' : ''}`}>
      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
        {/* Left column - Controls */}
        <div className="flex flex-col gap-4 lg:w-80 lg:flex-shrink-0">
          {/* Title and range info */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">Quiz Mode</h1>
            <p className="text-slate-600 mt-1">{range.meta.displayName}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                {range.meta.stackSize}+
              </span>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                {range.meta.position}
              </span>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                {range.meta.scenario.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Action palette */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <ActionPalette
              selectedAction={selectedAction}
              onSelectAction={setSelectedAction}
              disabled={isSubmitted}
            />
          </div>

          {/* Progress indicator */}
          {!isSubmitted && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-600">
                <div className="flex justify-between mb-2">
                  <span>Progress</span>
                  <span className="font-medium">{filledCount} / {totalCells}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(filledCount / totalCells) * 100}%` }}
                  />
                </div>
                {!selectedAction && filledCount === 0 && (
                  <p className="text-slate-400 mt-3 text-xs">
                    Select an action above, then paint the chart
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit/Reset buttons */}
          <div className="flex flex-col gap-2">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={!allFilled}
                className={`
                  w-full px-6 py-3 rounded-lg font-semibold text-white
                  transition-all duration-150
                  ${allFilled
                    ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed'
                  }
                `}
              >
                {allFilled ? 'Submit' : `Fill all cells`}
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150"
              >
                Try Again
              </button>
            )}
          </div>

          {/* Results display */}
          <ResultsDisplay
            correct={results.correct}
            total={results.total}
            isVisible={isSubmitted}
          />
        </div>

        {/* Right column - Grid */}
        <div className="flex-1 min-w-0">
          <RangeChart
            userSelections={userSelections}
            correctRange={isSubmitted ? range.data : undefined}
            isSubmitted={isSubmitted}
            isPainting={isPainting}
            selectedAction={selectedAction}
            onPaint={paintCell}
            onPaintStart={handlePaintStart}
          />
        </div>
      </div>
    </div>
  );
}

export default RangeBuilder;
