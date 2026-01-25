'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Scenario, SimpleAction, QuizAction } from '@/types';
import { useUrlState, useQuizSelections, usePainting } from '@/hooks';
import { getRange } from '@/data/ranges';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { RangeDropdowns } from './RangeDropdowns';
import { ResultsSummary } from './ResultsSummary';
import { MobileActionBar, deriveBlendType } from './MobileActionBar';
import { MobileDropdownBar } from './MobileDropdownBar';
import { gradeRangeSubmission, type ChartGradeSummary, type GradeAction } from '@/lib/gradeRange';

/**
 * Quiz Mode - Test your poker range knowledge.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Grid-first with fixed bottom action bar
 */
export function QuizMode() {
  const { position, stackSize, scenario, opponent, setPosition, setStackSize, setScenario, setOpponent } = useUrlState('/');
  const { userSelections, setCell, clearSelections, resetToFold, filledCount, totalCells, allFilled } = useQuizSelections();

  // Get range data synchronously via direct import
  const range = useMemo(() => getRange(stackSize, position, scenario, opponent), [stackSize, position, scenario, opponent]);
  const rangeExists = range !== null;

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradeSummary, setGradeSummary] = useState<ChartGradeSummary | null>(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  
  // Action selection state
  const [selectedActions, setSelectedActions] = useState<Set<SimpleAction>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Painting state
  const painting = usePainting();

  // Track previous range params to detect changes
  const prevParamsRef = useRef({ position, stackSize, scenario, opponent });
  
  // Reset quiz state when range parameters change
  useEffect(() => {
    const prev = prevParamsRef.current;
    const paramsChanged = prev.position !== position || 
                          prev.stackSize !== stackSize || 
                          prev.scenario !== scenario || 
                          prev.opponent !== opponent;
    
    if (paramsChanged) {
      setIsSubmitted(false);
      setGradeSummary(null);
      setSelectedActions(new Set());
      setMultiSelectMode(false);
      resetToFold();
      prevParamsRef.current = { position, stackSize, scenario, opponent };
    }
  }, [position, stackSize, scenario, opponent, resetToFold]);
  
  // Toggle action selection (multi-select for blends)
  const handleToggleAction = useCallback((action: SimpleAction) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  }, []);
  
  // Single-select action (replaces current selection)
  const handleSelectAction = useCallback((action: SimpleAction) => {
    setSelectedActions(new Set([action]));
  }, []);
  
  // Toggle multi-select mode
  const handleMultiToggle = useCallback(() => {
    setMultiSelectMode(prev => !prev);
  }, []);
  
  // Derive the effective action from multi-select
  const effectiveAction = useMemo((): QuizAction | null => {
    if (selectedActions.size === 0) return null;
    if (selectedActions.size === 1) {
      return Array.from(selectedActions)[0];
    }
    return deriveBlendType(selectedActions);
  }, [selectedActions]);

  // Paint cell callback
  const paintCell = useCallback((hand: string) => {
    if (effectiveAction && !isSubmitted) {
      setCell(hand, effectiveAction);
    }
  }, [effectiveAction, isSubmitted, setCell]);

  // Start painting and paint the initial cell
  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    if (effectiveAction && !isSubmitted) {
      setCell(hand, effectiveAction);
    }
  }, [painting, effectiveAction, isSubmitted, setCell]);

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
    setSelectedActions(new Set());
    setMultiSelectMode(false);
    painting.setSelectedAction(null);
  };

  // Determine effective selected action for painting (SimpleAction only, for drag painting)
  const effectiveSelectedAction = useMemo(() => {
    if (effectiveAction && ['raise', 'call', 'fold', 'shove'].includes(effectiveAction)) {
      return effectiveAction as SimpleAction;
    }
    return null;
  }, [effectiveAction]);

  // Check if we have a blend type selected (for enabling click interactions)
  const hasBlendSelected = useMemo(() => {
    return effectiveAction !== null && !['raise', 'call', 'fold', 'shove'].includes(effectiveAction);
  }, [effectiveAction]);

  return (
    <>
      <main className={`${painting.isPainting ? 'select-none' : ''}`}>
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-28">
          {/* Mobile Dropdown Bar at top */}
          <MobileDropdownBar
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
          {/* Mobile Grid - fills available space */}
          <div className="flex-1 p-1 relative">
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
              blendMode={rangeExists && !isSubmitted && hasBlendSelected}
            />
            
            {!rangeExists && (
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
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-80 shrink-0">
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
                    mode="quiz"
                    selectedActions={selectedActions}
                    onToggleAction={handleToggleAction}
                    onSelectAction={handleSelectAction}
                    multiSelectMode={multiSelectMode}
                    onMultiToggle={handleMultiToggle}
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

              {/* Results Summary */}
              {isSubmitted && gradeSummary && (
                <ResultsSummary gradeSummary={gradeSummary} />
              )}
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
                selectedAction={rangeExists && !isSubmitted ? effectiveSelectedAction : null}
                onPaint={rangeExists && !isSubmitted ? paintCell : () => {}}
                onPaintStart={rangeExists && !isSubmitted ? handlePaintStart : () => {}}
                showCorrectAnswers={showCorrectAnswers}
                blendMode={rangeExists && !isSubmitted && hasBlendSelected}
              />
              
              {!rangeExists && (
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
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Action Bar */}
      {rangeExists && (
        <MobileActionBar
          mode="quiz"
          selectedActions={selectedActions}
          onToggleAction={handleToggleAction}
          onSelectAction={handleSelectAction}
          multiSelectMode={multiSelectMode}
          onMultiToggle={handleMultiToggle}
          disabled={isSubmitted}
          submitState={isSubmitted ? 'submitted' : allFilled ? 'ready' : 'disabled'}
          onSubmit={handleSubmit}
          onReset={handleReset}
          showShove={true}
        />
      )}

    </>
  );
}

export default QuizMode;
