'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PokerRange, RangeData, RangeNotes, Scenario, SimpleAction, QuizAction, BlendType } from '@/types';
import { isSimpleAction } from '@/types';
import { useUrlState, useQuizSelections, usePainting } from '@/hooks';
import { Card, PageHeader } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsDisplay } from './ResultsDisplay';
import { RangeDropdowns } from './RangeDropdowns';
import { gradeRangeSubmission, type ChartGradeSummary, type GradeAction } from '@/lib/gradeRange';

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
  const { position, stackSize, scenario, opponent, setPosition, setStackSize, setScenario, setOpponent } = useUrlState('/');
  const { userSelections, setCell, clearSelections, resetToFold, filledCount, totalCells, allFilled } = useQuizSelections();

  const [range, setRange] = useState<PokerRange | null>(null);
  const [rangeExists, setRangeExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradeSummary, setGradeSummary] = useState<ChartGradeSummary | null>(null);
  const [hasBlendedActions, setHasBlendedActions] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  
  // Selected action state (supports both simple and blend types)
  const [selectedAction, setSelectedAction] = useState<QuizAction | null>(null);

  // Painting state
  const painting = usePainting();

  // Paint cell callback - now supports blend types
  const paintCell = useCallback((hand: string) => {
    if (selectedAction && !isSubmitted) {
      setCell(hand, selectedAction);
    }
  }, [selectedAction, isSubmitted, setCell]);

  // Start painting and paint the initial cell
  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    if (selectedAction && !isSubmitted) {
      setCell(hand, selectedAction);
    }
  }, [painting, selectedAction, isSubmitted, setCell]);

  // Handle simple action selection
  const handleSelectAction = useCallback((action: SimpleAction) => {
    setSelectedAction(action);
    painting.setSelectedAction(action);
  }, [painting]);

  // Handle blend type selection
  const handleSelectBlendType = useCallback((blendType: BlendType) => {
    setSelectedAction(blendType);
    painting.setSelectedAction(null); // Blend types don't use painting drag
  }, [painting]);

  // Load range when dropdowns change
  useEffect(() => {
    const loadRange = async () => {
      setIsLoading(true);
      setIsSubmitted(false);
      setGradeSummary(null);
      setSelectedAction(null);
      resetToFold();

      try {
        const params = new URLSearchParams({ stackSize, position, scenario });
        if (opponent) params.set('opponent', opponent);
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          // Build display name based on scenario
          let displayName = `${stackSize}+ ${position} - ${SCENARIO_NAMES[scenario]}`;
          if (opponent && scenario !== 'rfi') {
            displayName = `${stackSize}+ ${position} vs ${opponent} - ${SCENARIO_NAMES[scenario]}`;
          }
          
          const rangeData = result.data as RangeData;
          
          // Check if range has any blended actions
          const hasBlended = Object.values(rangeData).some(action => !isSimpleAction(action));
          setHasBlendedActions(hasBlended);
          
          setRange({
            meta: {
              stackSize,
              position,
              scenario,
              opponentPosition: opponent || undefined,
              displayName,
            },
            data: rangeData,
            notes: result.notes as RangeNotes | undefined,
          });
          setRangeExists(true);
        } else {
          setRange(null);
          setRangeExists(false);
          setHasBlendedActions(false);
        }
      } catch (error) {
        console.error('Failed to load range:', error);
        setRange(null);
        setRangeExists(false);
        setHasBlendedActions(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadRange();
  }, [position, stackSize, scenario, opponent, resetToFold]);

  // Convert userSelections to GradeAction format for grading
  const userResultsForGrading = useMemo(() => {
    const results: Record<string, GradeAction> = {};
    for (const [hand, action] of Object.entries(userSelections)) {
      if (action) {
        results[hand] = action as GradeAction;
      }
    }
    return results;
  }, [userSelections]);

  const handleSubmit = () => {
    if (allFilled && range) {
      setIsSubmitted(true);
      // Run the grading function
      const summary = gradeRangeSubmission({
        expectedRange: range,
        userResults: userResultsForGrading,
      });
      setGradeSummary(summary);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setGradeSummary(null);
    setShowCorrectAnswers(false);
    resetToFold();
    setSelectedAction(null);
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
              opponent={opponent}
              onPositionChange={setPosition}
              onStackSizeChange={setStackSize}
              onScenarioChange={setScenario}
              onOpponentChange={setOpponent}
              disabled={isSubmitted}
            />
          </Card>

          {rangeExists && (
            <Card>
              <ActionPalette
                selectedAction={selectedAction}
                onSelectAction={handleSelectAction}
                disabled={isSubmitted || !rangeExists}
                mode="quiz"
                showBlendOptions={hasBlendedActions}
                onSelectBlendType={handleSelectBlendType}
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
            gradeSummary={gradeSummary}
            isVisible={isSubmitted}
          />
        </div>

        {/* Right column - Grid */}
        <div className="flex-1 min-w-0 relative">
          {/* Toggle between user answers and correct answers */}
          {isSubmitted && rangeExists && (
            <div className="flex justify-center mb-3">
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => setShowCorrectAnswers(false)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${!showCorrectAnswers 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  My Answers
                </button>
                <button
                  onClick={() => setShowCorrectAnswers(true)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${showCorrectAnswers 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                    }
                  `}
                >
                  Correct Answers
                </button>
              </div>
            </div>
          )}
          
          <RangeChart
            userSelections={userSelections}
            correctRange={isSubmitted && range ? range.data : undefined}
            isSubmitted={isSubmitted}
            isPainting={painting.isPainting && rangeExists && !isSubmitted}
            selectedAction={rangeExists && !isSubmitted ? (typeof selectedAction === 'string' && ['raise', 'call', 'fold'].includes(selectedAction) ? selectedAction as SimpleAction : null) : null}
            onPaint={rangeExists && !isSubmitted ? paintCell : () => {}}
            onPaintStart={rangeExists && !isSubmitted ? handlePaintStart : () => {}}
            showCorrectAnswers={showCorrectAnswers}
          />
          
          {!rangeExists && !isLoading && (
            <div className="absolute inset-0 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
              <p className="text-slate-400 text-lg mb-4">
                This range hasn&apos;t been created yet
              </p>
              <a 
                href={`/builder?position=${position}&stackSize=${stackSize}&scenario=${scenario}${opponent ? `&opponent=${opponent}` : ''}`}
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
