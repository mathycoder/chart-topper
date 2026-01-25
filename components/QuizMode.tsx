'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PokerRange, RangeData, RangeNotes, Scenario, SimpleAction, QuizAction, BlendType } from '@/types';
import { isSimpleAction } from '@/types';
import { useUrlState, useQuizSelections, usePainting } from '@/hooks';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsDisplay } from './ResultsDisplay';
import { RangeDropdowns } from './RangeDropdowns';
import { MobileActionBar, deriveBlendType } from './MobileActionBar';
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
 * Mobile: Grid-first with fixed bottom action bar
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
  
  // Mobile UI state
  const [mobileSelectedActions, setMobileSelectedActions] = useState<Set<SimpleAction>>(new Set());
  
  // Selected action state for desktop (supports both simple and blend types)
  const [selectedAction, setSelectedAction] = useState<QuizAction | null>(null);

  // Painting state
  const painting = usePainting();
  
  // Mobile multi-select toggle
  const handleToggleMobileAction = useCallback((action: SimpleAction) => {
    setMobileSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  }, []);
  
  // Derive the effective action from mobile multi-select
  const mobileEffectiveAction = useMemo((): QuizAction | null => {
    if (mobileSelectedActions.size === 0) return null;
    if (mobileSelectedActions.size === 1) {
      return Array.from(mobileSelectedActions)[0];
    }
    return deriveBlendType(mobileSelectedActions);
  }, [mobileSelectedActions]);

  // Paint cell callback - uses mobile action on mobile, desktop action on desktop
  const paintCell = useCallback((hand: string) => {
    // Use mobile action if available (detected by checking mobileSelectedActions), else desktop
    const action = mobileEffectiveAction || selectedAction;
    if (action && !isSubmitted) {
      setCell(hand, action);
    }
  }, [mobileEffectiveAction, selectedAction, isSubmitted, setCell]);

  // Start painting and paint the initial cell
  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    const action = mobileEffectiveAction || selectedAction;
    if (action && !isSubmitted) {
      setCell(hand, action);
    }
  }, [painting, mobileEffectiveAction, selectedAction, isSubmitted, setCell]);

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
    setMobileSelectedActions(new Set());
    painting.setSelectedAction(null);
  };

  // Determine effective selected action for painting (combines mobile and desktop)
  const effectiveSelectedAction = useMemo(() => {
    // For painting, we need a SimpleAction
    const action = mobileEffectiveAction || selectedAction;
    if (action && ['raise', 'call', 'fold', 'shove'].includes(action)) {
      return action as SimpleAction;
    }
    return null;
  }, [mobileEffectiveAction, selectedAction]);

  return (
    <>
      <main className={`${painting.isPainting ? 'select-none' : ''}`}>
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-24">
          {/* Mobile Grid - fills available space */}
          <div className="flex-1 p-3 relative">
            {/* Toggle between user answers and correct answers */}
            {isSubmitted && rangeExists && (
              <div className="flex justify-center mb-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => setShowCorrectAnswers(false)}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                      ${!showCorrectAnswers 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-600'
                      }
                    `}
                  >
                    My Answers
                  </button>
                  <button
                    onClick={() => setShowCorrectAnswers(true)}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                      ${showCorrectAnswers 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-600'
                      }
                    `}
                  >
                    Correct
                  </button>
                </div>
              </div>
            )}
            
            {/* Results summary on mobile (shown after submit) */}
            {isSubmitted && gradeSummary && (
              <div className="mb-2 px-3 py-2 bg-slate-100 rounded-lg text-center">
                <span className="text-lg font-bold text-slate-900">{Math.round(gradeSummary.overall.accuracy * 100)}%</span>
                <span className="text-sm text-slate-600 ml-2">
                  {gradeSummary.overall.correct}/{gradeSummary.overall.attempted} correct
                </span>
              </div>
            )}
            
            <RangeChart
              userSelections={userSelections}
              correctRange={isSubmitted && range ? range.data : undefined}
              isSubmitted={isSubmitted}
              isPainting={painting.isPainting && rangeExists && !isSubmitted}
              selectedAction={rangeExists && !isSubmitted ? effectiveSelectedAction : null}
              onPaint={rangeExists && !isSubmitted ? paintCell : () => {}}
              onPaintStart={rangeExists && !isSubmitted ? handlePaintStart : () => {}}
              showCorrectAnswers={showCorrectAnswers}
            />
            
            {!rangeExists && !isLoading && (
              <div className="absolute inset-3 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
                <p className="text-slate-400 text-base mb-4">
                  This range hasn&apos;t been created yet
                </p>
                <a 
                  href={`/builder?position=${position}&stackSize=${stackSize}&scenario=${scenario}${opponent ? `&opponent=${opponent}` : ''}`}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium text-sm"
                >
                  Create in Builder
                </a>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-3 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-slate-600">Loading...</div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-80 flex-shrink-0">
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
                selectedAction={rangeExists && !isSubmitted ? (typeof selectedAction === 'string' && ['raise', 'call', 'fold', 'shove'].includes(selectedAction) ? selectedAction as SimpleAction : null) : null}
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
        </div>
      </main>

      {/* Mobile Action Bar */}
      {rangeExists && (
        <MobileActionBar
          mode="quiz"
          selectedActions={mobileSelectedActions}
          onToggleAction={handleToggleMobileAction}
          disabled={isSubmitted}
          submitState={isSubmitted ? 'submitted' : allFilled ? 'ready' : 'disabled'}
          onSubmit={handleSubmit}
          onReset={handleReset}
          showShove={true}
          position={position}
          stackSize={stackSize}
          scenario={scenario}
          opponent={opponent}
          onPositionChange={setPosition}
          onStackSizeChange={setStackSize}
          onScenarioChange={setScenario}
          onOpponentChange={setOpponent}
        />
      )}

    </>
  );
}

export default QuizMode;
