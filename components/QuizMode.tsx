'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Scenario, SimpleAction, QuizAction, Position, StackSize } from '@/types';
import { useUrlState, useQuizSelections, usePainting } from '@/hooks';
import { getRange } from '@/data/ranges';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsSummary } from './ResultsSummary';
import { MobileActionBar, deriveBlendType } from './MobileActionBar';
import { MobileDropdownBar } from './MobileDropdownBar';
import { gradeRangeSubmission, type ChartGradeSummary, type GradeAction } from '@/lib/gradeRange';

// Segment dropdown component for header-style selector
function SegmentDropdown<T extends string>({
  value,
  options,
  onChange,
  displayValue,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  displayValue?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentLabel = displayValue ?? options.find(o => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          font-semibold text-slate-900 underline decoration-slate-300 decoration-dashed underline-offset-4 
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:decoration-slate-500 cursor-pointer'}
        `}
      >
        {currentLabel}
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
          {options.map(({ value: optValue, label }) => (
            <button
              key={optValue}
              onClick={() => {
                onChange(optValue);
                setIsOpen(false);
              }}
              className={`
                block w-full text-left px-3 py-1.5 text-sm
                ${optValue === value ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Constants for dropdowns
const POSITIONS: { value: Position; label: string }[] = [
  { value: 'UTG', label: 'UTG' },
  { value: 'UTG+1', label: 'UTG+1' },
  { value: 'LJ', label: 'LJ' },
  { value: 'HJ', label: 'HJ' },
  { value: 'CO', label: 'CO' },
  { value: 'BTN', label: 'BTN' },
  { value: 'SB', label: 'SB' },
  { value: 'BB', label: 'BB' },
];

const POSITION_ORDER: Position[] = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function getValidOpponents(heroPosition: Position, scenario: Scenario): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  if (scenario === 'vs-raise' || scenario === 'vs-raise-call') return POSITION_ORDER.slice(0, heroIndex);
  if (scenario === 'vs-3bet') return POSITION_ORDER.filter((_, idx) => idx !== heroIndex);
  return [];
}

function getValidCallers(heroPosition: Position, raiserPosition: Position): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  const raiserIndex = POSITION_ORDER.indexOf(raiserPosition);
  return POSITION_ORDER.slice(raiserIndex + 1, heroIndex);
}

/**
 * Get valid hero positions for a given scenario.
 * - RFI: any position can open
 * - vs-raise: need at least 1 position before hero (for raiser)
 * - vs-raise-call: need at least 2 positions before hero (for raiser and caller)
 * - vs-3bet: any position can open and face 3-bet
 */
function getValidHeroPositions(scenario: Scenario): Position[] {
  if (scenario === 'vs-raise-call') {
    // Need at least 2 positions before hero (raiser + caller)
    return POSITION_ORDER.slice(2); // LJ and later
  }
  if (scenario === 'vs-raise') {
    // Need at least 1 position before hero (raiser)
    return POSITION_ORDER.slice(1); // UTG+1 and later
  }
  // RFI and vs-3bet: any position
  return POSITION_ORDER;
}

const STACK_SIZES: { value: StackSize; label: string }[] = [
  { value: '80bb', label: '80bb+' },
  { value: '40bb', label: '40bb' },
  { value: '20bb', label: '20bb' },
  { value: '10bb', label: '10bb' },
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'rfi', label: 'RFI' },
  { value: 'vs-raise', label: 'vs Raise' },
  { value: 'vs-raise-call', label: 'vs Raise + Call' },
  { value: 'vs-3bet', label: 'vs 3-Bet' },
];

// Display names for scenarios in the header
const SCENARIO_DISPLAY: Record<Scenario, string> = {
  'rfi': 'Raise First In',
  'vs-raise': 'Raise',
  'vs-raise-call': 'Raise + Call',
  'vs-3bet': '3-Bet',
  'vs-4bet': '4-Bet',
  'after-limp': 'Limp',
};

/**
 * Quiz Mode - Test your poker range knowledge.
 * Desktop: Two-column layout (controls left, grid right)
 * Mobile: Grid-first with fixed bottom action bar
 */
export function QuizMode() {
  const { position, stackSize, scenario, opponent, caller, setPosition, setStackSize, setScenario, setOpponent, setCaller } = useUrlState('/');
  const { userSelections, setCell, clearSelections, resetToFold, filledCount, totalCells, allFilled } = useQuizSelections();

  // Get range data synchronously via direct import
  const range = useMemo(() => getRange(stackSize, position, scenario, opponent, caller), [stackSize, position, scenario, opponent, caller]);
  const rangeExists = range !== null;

  // Filter valid hero positions based on scenario
  const validHeroPositions = getValidHeroPositions(scenario);
  const effectivePosition = validHeroPositions.includes(position) 
    ? position 
    : validHeroPositions[0];
  
  // Auto-correct position if it's not valid for this scenario
  if (effectivePosition !== position) {
    setPosition(effectivePosition);
  }

  // Opponent logic
  const showOpponent = scenario !== 'rfi';
  const validOpponents = showOpponent ? getValidOpponents(position, scenario) : [];
  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;
  
  if (showOpponent && effectiveOpponent !== opponent) {
    setOpponent(effectiveOpponent);
  }

  // Caller logic - only for vs-raise-call
  const showCaller = scenario === 'vs-raise-call';
  const validCallers = showCaller && effectiveOpponent 
    ? getValidCallers(position, effectiveOpponent) 
    : [];
  const effectiveCaller = showCaller && validCallers.length > 0
    ? (caller && validCallers.includes(caller) ? caller : validCallers[0])
    : null;
  
  if (showCaller && effectiveCaller !== caller) {
    setCaller(effectiveCaller);
  }
  
  if (!showCaller && caller !== null) {
    setCaller(null);
  }

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradeSummary, setGradeSummary] = useState<ChartGradeSummary | null>(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  
  // Action selection state
  const [selectedActions, setSelectedActions] = useState<Set<SimpleAction>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Painting state
  const painting = usePainting();

  // Track previous range params to detect changes
  const prevParamsRef = useRef({ position, stackSize, scenario, opponent, caller });
  
  // Reset quiz state when range parameters change
  useEffect(() => {
    const prev = prevParamsRef.current;
    const paramsChanged = prev.position !== position || 
                          prev.stackSize !== stackSize || 
                          prev.scenario !== scenario || 
                          prev.opponent !== opponent ||
                          prev.caller !== caller;
    
    if (paramsChanged) {
      setIsSubmitted(false);
      setGradeSummary(null);
      setSelectedActions(new Set());
      setMultiSelectMode(false);
      resetToFold();
      prevParamsRef.current = { position, stackSize, scenario, opponent, caller };
    }
  }, [position, stackSize, scenario, opponent, caller, resetToFold]);
  
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
            caller={caller}
            onPositionChange={setPosition}
            onStackSizeChange={setStackSize}
            onScenarioChange={setScenario}
            onOpponentChange={setOpponent}
            onCallerChange={setCaller}
            disabled={isSubmitted}
          />
          {/* Mobile Grid */}
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
              {/* Header-style Range Selector */}
              <div className="text-lg leading-relaxed">
                <SegmentDropdown
                  value={stackSize}
                  options={STACK_SIZES}
                  onChange={setStackSize}
                  disabled={isSubmitted}
                />
                <span className="text-slate-400 mx-2">—</span>
                <SegmentDropdown
                  value={position}
                  options={POSITIONS.filter(p => validHeroPositions.includes(p.value))}
                  onChange={setPosition}
                  disabled={isSubmitted}
                />
                {showOpponent && validOpponents.length > 0 && (
                  <>
                    <span className="text-slate-400 mx-1">vs</span>
                    <SegmentDropdown
                      value={effectiveOpponent || validOpponents[0]}
                      options={validOpponents.map(p => ({ value: p, label: p }))}
                      onChange={setOpponent}
                      disabled={isSubmitted}
                    />
                    {scenario === 'vs-raise-call' && <span className="text-slate-400 mx-1">raise</span>}
                  </>
                )}
                {showCaller && validCallers.length > 0 && (
                  <>
                    <SegmentDropdown
                      value={effectiveCaller || validCallers[0]}
                      options={validCallers.map(p => ({ value: p, label: p }))}
                      onChange={setCaller}
                      disabled={isSubmitted}
                    />
                    <span className="mx-1"></span>
                    <SegmentDropdown
                      value={scenario}
                      options={SCENARIOS}
                      onChange={setScenario}
                      displayValue="call"
                      disabled={isSubmitted}
                    />
                  </>
                )}
                {scenario !== 'vs-raise-call' && (
                  <>
                    <span className="text-slate-400 mx-1"> </span>
                    <SegmentDropdown
                      value={scenario}
                      options={SCENARIOS}
                      onChange={setScenario}
                      displayValue={SCENARIO_DISPLAY[scenario]}
                      disabled={isSubmitted}
                    />
                  </>
                )}
              </div>

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
