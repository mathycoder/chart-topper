'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { SimpleAction, PokerRange, Position, StackSize, Scenario, RangeData } from '@/types';
import { isSimpleAction } from '@/types';
import { ALL_HANDS } from '@/data/hands';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsDisplay } from './ResultsDisplay';
import { RangeDropdowns } from './RangeDropdowns';

/**
 * Main container for the range builder quiz mode.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Single column stacked layout
 */
export function RangeBuilder() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [position, setPosition] = useState<Position>(
    (searchParams.get('position') as Position) || 'UTG'
  );
  const [stackSize, setStackSize] = useState<StackSize>(
    (searchParams.get('stackSize') as StackSize) || '80bb'
  );
  const [scenario, setScenario] = useState<Scenario>(
    (searchParams.get('scenario') as Scenario) || 'rfi'
  );

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('position', position);
    params.set('stackSize', stackSize);
    params.set('scenario', scenario);
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [position, stackSize, scenario, router]);
  
  const [range, setRange] = useState<PokerRange | null>(null);
  const [rangeExists, setRangeExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load range when dropdowns change
  useEffect(() => {
    const loadRange = async () => {
      setIsLoading(true);
      setIsSubmitted(false);
      
      // Reset selections when changing ranges
      setUserSelections(() => {
        const reset: Record<string, SimpleAction | null> = {};
        ALL_HANDS.forEach(hand => {
          reset[hand] = null;
        });
        return reset;
      });

      try {
        const params = new URLSearchParams({ stackSize, position, scenario });
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          const scenarioNames: Record<Scenario, string> = {
            'rfi': 'Raise First In',
            'vs-raise': 'vs Raise',
            'vs-3bet': 'vs 3-Bet',
            'vs-4bet': 'vs 4-Bet',
            'after-limp': 'After Limp',
          };
          
          setRange({
            meta: {
              stackSize,
              position,
              scenario,
              displayName: `${stackSize}+ ${position} - ${scenarioNames[scenario]}`,
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
  }, [position, stackSize, scenario]);

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
          {/* Title */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <h1 className="text-xl font-bold text-slate-900">Quiz Mode</h1>
            <p className="text-slate-600 text-sm mt-1">Test your poker range knowledge</p>
          </div>

          {/* Dropdowns */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <RangeDropdowns
              position={position}
              stackSize={stackSize}
              scenario={scenario}
              onPositionChange={setPosition}
              onStackSizeChange={setStackSize}
              onScenarioChange={setScenario}
              disabled={isSubmitted}
            />
          </div>

          {/* Action palette - only show when range exists */}
          {rangeExists && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <ActionPalette
                selectedAction={selectedAction}
                onSelectAction={setSelectedAction}
                disabled={isSubmitted || !rangeExists}
              />
            </div>
          )}

          {/* Submit/Reset buttons - only show when range exists */}
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
          )}

          {/* Results display */}
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
            isPainting={isPainting && rangeExists}
            selectedAction={rangeExists ? selectedAction : null}
            onPaint={rangeExists ? paintCell : () => {}}
            onPaintStart={rangeExists ? handlePaintStart : () => {}}
          />
          
          {/* Overlay when range doesn't exist */}
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

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <div className="text-slate-600">Loading...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RangeBuilder;
