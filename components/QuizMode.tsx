'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PokerRange, RangeData, Scenario, SimpleAction } from '@/types';
import { isSimpleAction } from '@/types';
import { ALL_HANDS } from '@/data/hands';
import { useUrlState, useRangeSelections, usePainting } from '@/hooks';
import { Card, PageHeader } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsDisplay } from './ResultsDisplay';
import { RangeDropdowns } from './RangeDropdowns';

const SCENARIO_NAMES: Record<Scenario, string> = {
  'rfi': 'Raise First In',
  'vs-raise': 'vs Raise',
  'vs-3bet': 'vs 3-Bet',
  'vs-4bet': 'vs 4-Bet',
  'after-limp': 'After Limp',
};

/**
 * Quiz Mode - Test your poker range knowledge.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Single column stacked layout
 */
export function QuizMode() {
  const { position, stackSize, scenario, setPosition, setStackSize, setScenario } = useUrlState('/');
  const { userSelections, setCell, clearSelections, filledCount, totalCells, allFilled } = useRangeSelections();

  const [range, setRange] = useState<PokerRange | null>(null);
  const [rangeExists, setRangeExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Painting state
  const painting = usePainting();

  // Paint cell callback
  const paintCell = useCallback((hand: string) => {
    if (painting.selectedAction && !isSubmitted) {
      setCell(hand, painting.selectedAction);
    }
  }, [painting.selectedAction, isSubmitted, setCell]);

  // Start painting and paint the initial cell
  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    if (painting.selectedAction && !isSubmitted) {
      setCell(hand, painting.selectedAction);
    }
  }, [painting, isSubmitted, setCell]);

  // Load range when dropdowns change
  useEffect(() => {
    const loadRange = async () => {
      setIsLoading(true);
      setIsSubmitted(false);
      clearSelections();

      try {
        const params = new URLSearchParams({ stackSize, position, scenario });
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          setRange({
            meta: {
              stackSize,
              position,
              scenario,
              displayName: `${stackSize}+ ${position} - ${SCENARIO_NAMES[scenario]}`,
            },
            data: result.data as RangeData,
          });
          setRangeExists(true);
        } else {
          setRange(null);
          setRangeExists(false);
        }
      } catch (error) {
        console.error('Failed to load range:', error);
        setRange(null);
        setRangeExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadRange();
  }, [position, stackSize, scenario, clearSelections]);

  const calculateResults = () => {
    if (!range) return { correct: 0, total: totalCells };
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
    clearSelections();
    painting.setSelectedAction(null);
  };

  return (
    <main className={`min-h-screen p-4 lg:p-8 ${painting.isPainting ? 'select-none' : ''} max-w-[1050px] mx-auto`}>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
        {/* Left column - Controls */}
        <div className="flex flex-col gap-4 lg:w-80 lg:flex-shrink-0">
          <PageHeader
            title="Quiz Mode"
            description="Test your poker range knowledge"
          />

          <Card>
            <RangeDropdowns
              position={position}
              stackSize={stackSize}
              scenario={scenario}
              onPositionChange={setPosition}
              onStackSizeChange={setStackSize}
              onScenarioChange={setScenario}
              disabled={isSubmitted}
            />
          </Card>

          {rangeExists && (
            <Card>
              <ActionPalette
                selectedAction={painting.selectedAction}
                onSelectAction={painting.setSelectedAction}
                disabled={isSubmitted || !rangeExists}
              />
            </Card>
          )}

          {rangeExists && (
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
                  {allFilled ? 'Submit' : 'Fill all cells'}
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
          )}

          <ResultsDisplay
            correct={results.correct}
            total={results.total}
            isVisible={isSubmitted}
          />
        </div>

        {/* Right column - Grid */}
        <div className="flex-1 min-w-0 relative">
          <RangeChart
            userSelections={userSelections}
            correctRange={isSubmitted && range ? range.data : undefined}
            isSubmitted={isSubmitted}
            isPainting={painting.isPainting && rangeExists}
            selectedAction={rangeExists ? painting.selectedAction : null}
            onPaint={rangeExists ? paintCell : () => {}}
            onPaintStart={rangeExists ? handlePaintStart : () => {}}
          />
          
          {!rangeExists && !isLoading && (
            <div className="absolute inset-0 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
              <p className="text-slate-400 text-lg mb-4">
                This range hasn&apos;t been created yet
              </p>
              <a 
                href={`/builder?position=${position}&stackSize=${stackSize}&scenario=${scenario}`}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                Create in Builder
              </a>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <div className="text-slate-600">Loading...</div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default QuizMode;
