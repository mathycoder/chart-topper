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
  const { position, stackSize, scenario, opponent, caller, assumeOpen, setAssumeOpen, setPosition, setStackSize, setScenario, setOpponent, setCaller } = useUrlState('/');
  const { userSelections, setCell, clearSelections, resetToFold, initializeWithBlackHands, initializeForVsRaise, fillRemainingAsFold, filledCount, totalCells } = useQuizSelections();
  const emptyCount = totalCells - filledCount;

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

  // Category preview: hold 700ms to show highlights, release to apply
  const [categoryPreview, setCategoryPreview] = useState<{ hands: string[]; floor: string } | null>(null);
  const categoryPreviewRef = useRef<{ hands: string[]; floor: string } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandRef = useRef<string | null>(null);
  const longPressFiredRef = useRef(false);
  categoryPreviewRef.current = categoryPreview;

  // Painting state
  const painting = usePainting();

  // Track previous range params to detect changes (null = first mount, so we run init once)
  const prevParamsRef = useRef<{ position: Position; stackSize: StackSize; scenario: Scenario; opponent: Position | null; caller: Position | null } | null>(null);

  // Opponent RFI range for "Assume Open" overlay (vs Raise only)
  const opponentRfiRange = useMemo(() => {
    if (effectiveScenario !== 'vs-raise' || !effectiveOpponent) return null;
    return getRange(stackSize, effectiveOpponent, 'rfi');
  }, [stackSize, effectiveOpponent, effectiveScenario]);

  const showAssumeOpenToggle = effectiveScenario === 'vs-raise' && rangeExists;
  const assumeOpenEnabled = assumeOpen && opponentRfiRange !== null;

  // Reset quiz state when range parameters change (or on first mount, so vs-raise starts empty)
  useEffect(() => {
    const prev = prevParamsRef.current;
    const paramsChanged = prev === null ||
      prev.position !== effectivePosition ||
      prev.stackSize !== stackSize ||
      prev.scenario !== effectiveScenario ||
      prev.opponent !== effectiveOpponent ||
      prev.caller !== effectiveCaller;

    if (paramsChanged) {
      setIsSubmitted(false);
      setGradeSummary(null);
      setSelectedActions(new Set());
      setMultiSelectMode(false);
      if (range) {
        if (effectiveScenario === 'vs-raise') {
          initializeForVsRaise(range.data);
        } else {
          initializeWithBlackHands(range.data);
        }
      } else {
        resetToFold();
      }
      prevParamsRef.current = { position: effectivePosition, stackSize, scenario: effectiveScenario, opponent: effectiveOpponent, caller: effectiveCaller };
    }
  }, [effectivePosition, stackSize, effectiveScenario, effectiveOpponent, effectiveCaller, range, initializeWithBlackHands, initializeForVsRaise, resetToFold]);

  // Also initialize on first load if range has black hands
  useEffect(() => {
    if (range && !isSubmitted) {
      const hasBlackHands = Object.values(range.data).some(action => action === 'black');
      const hasBlackSelections = Object.values(userSelections).some(action => action === 'black');
      if (hasBlackHands && !hasBlackSelections) {
        if (effectiveScenario === 'vs-raise') {
          initializeForVsRaise(range.data);
        } else {
          initializeWithBlackHands(range.data);
        }
      }
    }
  }, [range, isSubmitted, userSelections, effectiveScenario, initializeWithBlackHands, initializeForVsRaise]);
  
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

  const LONG_PRESS_MS = 500;

  const onPointerDown = useCallback((hand: string) => {
    if (!effectiveAction || isSubmitted) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressHandRef.current = hand;
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      const category = getCategoryForHand(hand);
      if (category === null) return;
      const hands = getCategoryHandsAtOrAboveFloor(category, hand);
      if (hands.length <= 1) return;
      longPressFiredRef.current = true;
      setCategoryPreview({ hands, floor: hand });
    }, LONG_PRESS_MS);
  }, [effectiveAction, isSubmitted]);

  const onPointerUp = useCallback((hand: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressFiredRef.current && longPressHandRef.current === hand && categoryPreviewRef.current) {
      categoryPreviewRef.current.hands.forEach(h => setCell(h, effectiveAction));
      setCategoryPreview(null);
    }
    longPressFiredRef.current = false;
    longPressHandRef.current = null;
  }, [effectiveAction, isSubmitted, setCell]);

  const onPointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressFiredRef.current = false;
    longPressHandRef.current = null;
    setCategoryPreview(null);
  }, []);

  // Clear category preview when range params or selected action changes
  useEffect(() => {
    setCategoryPreview(null);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressHandRef.current = null;
    longPressFiredRef.current = false;
  }, [effectivePosition, stackSize, effectiveScenario, effectiveOpponent, effectiveCaller, effectiveAction]);

  // Clear category preview on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCategoryPreview(null);
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressHandRef.current = null;
        longPressFiredRef.current = false;
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

  const handleSubmit = () => {
    if (!range) return;
    // Treat any unaddressed cells as fold, then grade
    const completedResults: Record<string, GradeAction> = {};
    for (const [hand, action] of Object.entries(userSelections)) {
      completedResults[hand] = (action ?? 'fold') as GradeAction;
    }
    fillRemainingAsFold();
    setIsSubmitted(true);
    const summary = gradeRangeSubmission({
      expectedRange: range,
      userResults: completedResults,
    });
    setGradeSummary(summary);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setGradeSummary(null);
    setShowCorrectAnswers(false);
    if (effectiveScenario === 'vs-raise' && range) {
      initializeForVsRaise(range.data);
    } else {
      resetToFold();
    }
    setSelectedActions(new Set());
    setMultiSelectMode(false);
    painting.setSelectedAction(null);
  };

  const handleClear = () => {
    if (effectiveScenario === 'vs-raise' && range) {
      initializeForVsRaise(range.data);
    } else {
      resetToFold();
    }
    setCategoryPreview(null);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressHandRef.current = null;
    longPressFiredRef.current = false;
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
          {showAssumeOpenToggle && (
            <div className="self-start px-3 py-1.5">
              <label
                htmlFor="quiz-assume-open-mobile"
                className="flex items-center gap-2 cursor-pointer select-none touch-manipulation"
                title={opponentRfiRange
                  ? `Use ${effectiveOpponent}'s standard opening range as context.`
                  : `No opening range available for ${effectiveOpponent} at this stack.`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('input')) return;
                  e.preventDefault();
                  if (opponentRfiRange && !isSubmitted) setAssumeOpen(!assumeOpen);
                }}
              >
                <input
                  id="quiz-assume-open-mobile"
                  type="checkbox"
                  checked={assumeOpen}
                  onChange={(e) => setAssumeOpen(e.target.checked)}
                  disabled={!opponentRfiRange || isSubmitted}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer shrink-0"
                />
                <span className="text-sm font-medium text-slate-700">
                  Assume {effectiveOpponent} Open
                </span>
              </label>
            </div>
          )}
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
              onPointerDown={rangeExists && effectiveAction && !isSubmitted ? onPointerDown : undefined}
              onPointerUp={rangeExists && effectiveAction && !isSubmitted ? onPointerUp : undefined}
              onPointerCancel={rangeExists && effectiveAction && !isSubmitted ? onPointerCancel : undefined}
              categoryPreviewHands={categoryPreview ? new Set(categoryPreview.hands) : null}
              categoryPreviewFloor={categoryPreview?.floor ?? null}
              overlayRangeData={assumeOpenEnabled ? opponentRfiRange?.data : null}
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

              {showAssumeOpenToggle && (
                <label
                  htmlFor="quiz-assume-open-desktop"
                  className="self-start flex items-center gap-2 cursor-pointer"
                  title={opponentRfiRange
                    ? `Use ${effectiveOpponent}'s standard opening range as context.`
                    : `No opening range available for ${effectiveOpponent} at this stack.`}
                >
                  <input
                    id="quiz-assume-open-desktop"
                    type="checkbox"
                    checked={assumeOpen}
                    onChange={(e) => setAssumeOpen(e.target.checked)}
                    disabled={!opponentRfiRange || isSubmitted}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Assume {effectiveOpponent} Open
                  </span>
                </label>
              )}

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
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={handleClear}
                          className="flex-1 px-6 py-3 rounded-lg font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all duration-150"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleSubmit}
                          className="flex-1 px-6 py-3 rounded-lg font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer transition-all duration-150"
                        >
                          Submit
                        </button>
                      </div>
                      {effectiveScenario === 'vs-raise' && emptyCount > 0 && (
                        <button
                          onClick={fillRemainingAsFold}
                          title="Set all remaining empty cells to fold so you can submit"
                          className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        >
                          Fill rest as fold ({emptyCount} left)
                        </button>
                      )}
                    </>
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
                onPointerDown={rangeExists && effectiveAction && !isSubmitted ? onPointerDown : undefined}
                onPointerUp={rangeExists && effectiveAction && !isSubmitted ? onPointerUp : undefined}
                onPointerCancel={rangeExists && effectiveAction && !isSubmitted ? onPointerCancel : undefined}
                categoryPreviewHands={categoryPreview ? new Set(categoryPreview.hands) : null}
                categoryPreviewFloor={categoryPreview?.floor ?? null}
                overlayRangeData={assumeOpenEnabled ? opponentRfiRange?.data : null}
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
          submitState={isSubmitted ? 'submitted' : 'ready'}
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
