'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Scenario, SimpleAction, QuizAction, Position, StackSize } from '@/types';
import { useUrlState, useQuizSelections, usePainting } from '@/hooks';
import { getRange, getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';
import { getCategoryHandsAtOrAboveFloor, getCategoryForHand } from '@/data/hands';
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

const STACK_SIZES: { value: StackSize; label: string }[] = [
  { value: '80bb', label: '80bb+' },
  { value: '50bb', label: '50bb' },
  { value: '25bb', label: '25bb' },
  { value: '15bb', label: '15bb' },
  { value: '10bb', label: '10bb' },
  { value: '5bb', label: '5bb' },
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
  const { userSelections, setCell, clearSelections, resetToFold, initializeWithBlackHands, filledCount, playableCount, totalCells, allFilled } = useQuizSelections();

  // Get available options based on what ranges actually exist
  const availableScenarios = useMemo(() => getAvailableScenarios(stackSize), [stackSize]);
  const effectiveScenario = availableScenarios.includes(scenario) ? scenario : availableScenarios[0] || 'rfi';
  
  // Auto-correct scenario if not available
  if (effectiveScenario !== scenario && availableScenarios.length > 0) {
    setScenario(effectiveScenario);
  }

  const availablePositions = useMemo(
    () => getAvailablePositions(stackSize, effectiveScenario),
    [stackSize, effectiveScenario]
  );
  const effectivePosition = availablePositions.includes(position) ? position : availablePositions[0] || 'UTG';
  
  // Auto-correct position if not available
  if (effectivePosition !== position && availablePositions.length > 0) {
    setPosition(effectivePosition);
  }

  const showOpponent = effectiveScenario !== 'rfi';
  const availableOpponents = useMemo(
    () => showOpponent ? getAvailableOpponents(stackSize, effectivePosition, effectiveScenario) : [],
    [stackSize, effectivePosition, effectiveScenario, showOpponent]
  );
  const effectiveOpponent = showOpponent && availableOpponents.length > 0
    ? (opponent && availableOpponents.includes(opponent) ? opponent : availableOpponents[0])
    : null;
  
  // Auto-correct opponent if not available
  if (showOpponent && effectiveOpponent !== opponent) {
    setOpponent(effectiveOpponent);
  }

  // Caller logic - only for vs-raise-call
  const showCaller = effectiveScenario === 'vs-raise-call';
  const availableCallers = useMemo(
    () => showCaller && effectiveOpponent ? getAvailableCallers(stackSize, effectivePosition, effectiveOpponent) : [],
    [stackSize, effectivePosition, effectiveOpponent, showCaller]
  );
  const effectiveCaller = showCaller && availableCallers.length > 0
    ? (caller && availableCallers.includes(caller) ? caller : availableCallers[0])
    : null;
  
  // Auto-correct caller if not available
  if (showCaller && effectiveCaller !== caller) {
    setCaller(effectiveCaller);
  }
  
  if (!showCaller && caller !== null) {
    setCaller(null);
  }

  // Get range data synchronously via direct import
  const range = useMemo(
    () => getRange(stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller),
    [stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller]
  );
  const rangeExists = range !== null;

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradeSummary, setGradeSummary] = useState<ChartGradeSummary | null>(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  
  // Action selection state
  const [selectedActions, setSelectedActions] = useState<Set<SimpleAction>>(new Set(['raise']));
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Category preview state (in-chart: single tap = preview, double tap = apply)
  const [categoryPreview, setCategoryPreview] = useState<{ hands: string[]; floor: string } | null>(null);
  const categoryPreviewRef = useRef<{ hands: string[]; floor: string } | null>(null);
  const lastTapHandRef = useRef<string | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  categoryPreviewRef.current = categoryPreview;

  // Painting state
  const painting = usePainting();

  // Track previous range params to detect changes
  const prevParamsRef = useRef({ position: effectivePosition, stackSize, scenario: effectiveScenario, opponent: effectiveOpponent, caller: effectiveCaller });
  
  // Reset quiz state when range parameters change
  useEffect(() => {
    const prev = prevParamsRef.current;
    const paramsChanged = prev.position !== effectivePosition || 
                          prev.stackSize !== stackSize || 
                          prev.scenario !== effectiveScenario || 
                          prev.opponent !== effectiveOpponent ||
                          prev.caller !== effectiveCaller;
    
    if (paramsChanged) {
      setIsSubmitted(false);
      setGradeSummary(null);
      setSelectedActions(new Set());
      setMultiSelectMode(false);
      // Initialize with black hands pre-filled if range exists
      if (range) {
        initializeWithBlackHands(range.data);
      } else {
        resetToFold();
      }
      prevParamsRef.current = { position: effectivePosition, stackSize, scenario: effectiveScenario, opponent: effectiveOpponent, caller: effectiveCaller };
    }
  }, [effectivePosition, stackSize, effectiveScenario, effectiveOpponent, effectiveCaller, range, initializeWithBlackHands, resetToFold]);
  
  // Also initialize on first load if range has black hands
  useEffect(() => {
    if (range && !isSubmitted) {
      // Check if we need to initialize (only if there are black hands and they're not already set)
      const hasBlackHands = Object.values(range.data).some(action => action === 'black');
      const hasBlackSelections = Object.values(userSelections).some(action => action === 'black');
      if (hasBlackHands && !hasBlackSelections) {
        initializeWithBlackHands(range.data);
      }
    }
  }, [range, isSubmitted, userSelections, initializeWithBlackHands]);
  
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

  // Category tap: single tap = show preview (hands at or above in category); second tap on same cell = apply action to preview
  const onCellTap = useCallback((hand: string) => {
    if (!effectiveAction || isSubmitted) return;

    const now = Date.now();
    const previewToApply = categoryPreviewRef.current;
    // Second tap on same cell: either within 300ms, or we already have a preview with this hand as floor
    const isSecondTapSameCell =
      lastTapHandRef.current === hand &&
      (now - lastTapTimeRef.current < 300 || previewToApply?.floor === hand);

    if (isSecondTapSameCell && previewToApply) {
      // Apply current action to all previewed hands
      previewToApply.hands.forEach(h => setCell(h, effectiveAction));
      setCategoryPreview(null);
      lastTapHandRef.current = null;
      lastTapTimeRef.current = 0;
      return;
    }

    const category = getCategoryForHand(hand);
    if (category === null) {
      // Not in any category: paint this cell immediately (same as before tap detection)
      setCell(hand, effectiveAction);
      setCategoryPreview(null);
      lastTapHandRef.current = hand;
      lastTapTimeRef.current = now;
      return;
    }

    // In a category: if hand is at the top (only one in range), just paint and skip preview/double-tap
    const hands = getCategoryHandsAtOrAboveFloor(category, hand);
    setCell(hand, effectiveAction);
    if (hands.length <= 1) {
      setCategoryPreview(null);
      lastTapHandRef.current = hand;
      lastTapTimeRef.current = now;
      return;
    }
    setCategoryPreview({ hands, floor: hand });
    lastTapHandRef.current = hand;
    lastTapTimeRef.current = now;
  }, [effectiveAction, isSubmitted, setCell]);

  // Clear category preview when range params or selected action changes
  useEffect(() => {
    setCategoryPreview(null);
    lastTapHandRef.current = null;
    lastTapTimeRef.current = 0;
  }, [effectivePosition, stackSize, effectiveScenario, effectiveOpponent, effectiveCaller, effectiveAction]);

  // Clear category preview on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoryPreview(null);
        lastTapHandRef.current = null;
        lastTapTimeRef.current = 0;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleClear = () => {
    resetToFold();
    setCategoryPreview(null);
    lastTapHandRef.current = null;
    lastTapTimeRef.current = 0;
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
            position={effectivePosition}
            stackSize={stackSize}
            scenario={effectiveScenario}
            opponent={effectiveOpponent}
            caller={effectiveCaller}
            onPositionChange={setPosition}
            onStackSizeChange={setStackSize}
            onScenarioChange={setScenario}
            onOpponentChange={setOpponent}
            onCallerChange={setCaller}
            disabled={isSubmitted}
            filterByAvailability={true}
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
              correctRange={range?.data}
              isSubmitted={isSubmitted}
              isPainting={painting.isPainting && rangeExists && !isSubmitted}
              selectedAction={rangeExists && !isSubmitted ? effectiveSelectedAction : null}
              onPaint={rangeExists && !isSubmitted ? paintCell : () => {}}
              onPaintStart={rangeExists && !isSubmitted ? handlePaintStart : () => {}}
              showCorrectAnswers={showCorrectAnswers}
              blendMode={rangeExists && !isSubmitted && hasBlendSelected}
              onCellTap={rangeExists && effectiveAction && !isSubmitted ? onCellTap : undefined}
              categoryPreviewHands={categoryPreview ? new Set(categoryPreview.hands) : null}
              categoryPreviewFloor={categoryPreview?.floor ?? null}
            />
            
            {!rangeExists && (
              <div className="absolute inset-3 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
                <p className="text-slate-400 text-base mb-4">
                  This range hasn&apos;t been created yet
                </p>
                <a 
                  href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
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
                  value={effectivePosition}
                  options={availablePositions.map(p => ({ value: p, label: p }))}
                  onChange={setPosition}
                  disabled={isSubmitted}
                />
                {showOpponent && availableOpponents.length > 0 && (
                  <>
                    <span className="text-slate-400 mx-1">vs</span>
                    <SegmentDropdown
                      value={effectiveOpponent || availableOpponents[0]}
                      options={availableOpponents.map(p => ({ value: p, label: p }))}
                      onChange={setOpponent}
                      disabled={isSubmitted}
                    />
                    {effectiveScenario === 'vs-raise-call' && <span className="text-slate-400 mx-1">raise</span>}
                  </>
                )}
                {showCaller && availableCallers.length > 0 && (
                  <>
                    <SegmentDropdown
                      value={effectiveCaller || availableCallers[0]}
                      options={availableCallers.map(p => ({ value: p, label: p }))}
                      onChange={setCaller}
                      disabled={isSubmitted}
                    />
                    <span className="mx-1"></span>
                    <SegmentDropdown
                      value={effectiveScenario}
                      options={availableScenarios.map(s => ({ value: s, label: SCENARIOS.find(sc => sc.value === s)?.label || s }))}
                      onChange={setScenario}
                      displayValue="call"
                      disabled={isSubmitted}
                    />
                  </>
                )}
                {effectiveScenario !== 'vs-raise-call' && (
                  <>
                    <span className="text-slate-400 mx-1"> </span>
                    <SegmentDropdown
                      value={effectiveScenario}
                      options={availableScenarios.map(s => ({ value: s, label: SCENARIOS.find(sc => sc.value === s)?.label || s }))}
                      onChange={setScenario}
                      displayValue={SCENARIO_DISPLAY[effectiveScenario]}
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
                    <div className="flex gap-2">
                      <button
                        onClick={handleClear}
                        className="flex-1 px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!allFilled}
                        className={`
                          flex-1 px-6 py-3 rounded-lg font-semibold text-white
                          transition-all duration-150
                          ${allFilled
                            ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                            : 'bg-slate-300 cursor-not-allowed'
                          }
                        `}
                      >
                        {allFilled ? 'Submit' : 'Fill all cells'}
                      </button>
                    </div>
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
                correctRange={range?.data}
                isSubmitted={isSubmitted}
                isPainting={painting.isPainting && rangeExists && !isSubmitted}
                selectedAction={rangeExists && !isSubmitted ? effectiveSelectedAction : null}
                onPaint={rangeExists && !isSubmitted ? paintCell : () => {}}
                onPaintStart={rangeExists && !isSubmitted ? handlePaintStart : () => {}}
                showCorrectAnswers={showCorrectAnswers}
                blendMode={rangeExists && !isSubmitted && hasBlendSelected}
                onCellTap={rangeExists && effectiveAction && !isSubmitted ? onCellTap : undefined}
                categoryPreviewHands={categoryPreview ? new Set(categoryPreview.hands) : null}
                categoryPreviewFloor={categoryPreview?.floor ?? null}
              />
              
              {!rangeExists && (
                <div className="absolute inset-0 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
                  <p className="text-slate-400 text-lg mb-4">
                    This range hasn&apos;t been created yet
                  </p>
                  <a 
                    href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
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
          onClear={handleClear}
          showShove={true}
        />
      )}

    </>
  );
}

export default QuizMode;
