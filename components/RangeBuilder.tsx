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
 * 
 * Manages all state:
 * - User's selections for each hand
 * - Currently selected action/brush
 * - Painting (drag) state
 * - Submission state
 * 
 * Teaching note: This component "lifts state up" - it owns all the state
 * and passes it down to children. This makes the data flow predictable
 * and keeps child components simple and reusable.
 */
export function RangeBuilder({ range }: RangeBuilderProps) {
  // User's current selections for each hand (null = not yet filled)
  const [userSelections, setUserSelections] = useState<Record<string, SimpleAction | null>>(() => {
    // Initialize all hands as null (unfilled)
    const initial: Record<string, SimpleAction | null> = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  // Currently selected brush action
  const [selectedAction, setSelectedAction] = useState<SimpleAction | null>(null);

  // Whether the user is currently dragging to paint
  const [isPainting, setIsPainting] = useState(false);

  // Whether the quiz has been submitted
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Paint a single cell
  const paintCell = useCallback((hand: string) => {
    if (selectedAction && !isSubmitted) {
      setUserSelections(prev => ({
        ...prev,
        [hand]: selectedAction,
      }));
    }
  }, [selectedAction, isSubmitted]);

  // Start painting (mouse down)
  const handlePaintStart = useCallback((hand: string) => {
    setIsPainting(true);
    paintCell(hand);
  }, [paintCell]);

  // Stop painting on mouse up (anywhere in document)
  useEffect(() => {
    const handleMouseUp = () => {
      setIsPainting(false);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Calculate how many cells are filled
  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  const totalCells = ALL_HANDS.length; // 169
  const allFilled = filledCount === totalCells;

  // Calculate results
  const calculateResults = () => {
    let correct = 0;
    
    ALL_HANDS.forEach(hand => {
      const userAnswer = userSelections[hand];
      const correctAnswer = range.data[hand];
      
      if (userAnswer && correctAnswer) {
        // For simple actions, direct comparison
        if (isSimpleAction(correctAnswer)) {
          if (userAnswer === correctAnswer) {
            correct++;
          }
        }
        // For blended actions, we'd need different logic (future feature)
      }
    });

    return { correct, total: totalCells };
  };

  const results = isSubmitted ? calculateResults() : { correct: 0, total: totalCells };

  // Handle submit
  const handleSubmit = () => {
    if (allFilled) {
      setIsSubmitted(true);
    }
  };

  // Handle reset
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
    <div 
      className={`flex flex-col gap-6 p-6 max-w-2xl mx-auto ${isPainting ? 'painting' : ''}`}
    >
      {/* Header with range info */}
      <header className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          Range Builder
        </h1>
        <p className="text-lg text-slate-600 mt-1">
          {range.meta.displayName}
        </p>
        <div className="flex justify-center gap-3 mt-2">
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
      </header>

      {/* Action palette (brush selector) */}
      <div className="flex justify-center">
        <ActionPalette
          selectedAction={selectedAction}
          onSelectAction={setSelectedAction}
          disabled={isSubmitted}
        />
      </div>

      {/* Progress indicator */}
      {!isSubmitted && (
        <div className="text-center text-sm text-slate-500">
          {filledCount} / {totalCells} cells filled
          {!selectedAction && (
            <span className="block text-slate-400 mt-1">
              Select an action above, then paint the chart
            </span>
          )}
        </div>
      )}

      {/* The range chart */}
      <RangeChart
        userSelections={userSelections}
        correctRange={isSubmitted ? range.data : undefined}
        isSubmitted={isSubmitted}
        isPainting={isPainting}
        selectedAction={selectedAction}
        onPaint={paintCell}
        onPaintStart={handlePaintStart}
      />

      {/* Submit/Reset buttons */}
      <div className="flex justify-center gap-4">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className={`
              px-6 py-3 rounded-lg font-semibold text-white
              transition-all duration-150
              ${allFilled
                ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed'
              }
            `}
          >
            {allFilled ? 'Submit' : `Fill all cells (${filledCount}/${totalCells})`}
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Results display */}
      <div className="flex justify-center">
        <ResultsDisplay
          correct={results.correct}
          total={results.total}
          isVisible={isSubmitted}
        />
      </div>
    </div>
  );
}

export default RangeBuilder;
