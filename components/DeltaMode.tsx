'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SimpleAction, QuizAction, Position, StackSize, SpotDescriptor, DeltaAxis } from '@/types';
import { useUrlState, useDeltaSelections, usePainting } from '@/hooks';
import { getRangeForSpot, getAvailablePositions, getAvailableOpponents } from '@/data/ranges';
import { getCategoryHandsAtOrAboveFloor, getCategoryForHand, ALL_HANDS } from '@/data/hands';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsSummary } from './ResultsSummary';
import { MobileActionBar, deriveBlendType } from './MobileActionBar';
import { SpotSelector, STACK_SIZES } from './SpotSelector';
import { gradeDeltaRange, getDiffHands } from '@/lib/gradeDeltaRange';
import { type ChartGradeSummary, type GradeAction } from '@/lib/gradeRange';

/**
 * Delta Mode — Train on range differences across a single axis.
 * Select a Starting Range and a Target Range (differing by one axis: stack, position, or opponent).
 * The chart pre-populates with the starting range in dim colors.
 * User paints the differences in regular colors.
 * Grading scores only the hands that changed between start and target.
 */
export function DeltaMode() {
  const {
    position, stackSize, scenario, opponent, caller,
    setPosition, setStackSize, setScenario, setOpponent, setCaller,
  } = useUrlState('/delta');

  const availablePositions = useMemo(
    () => getAvailablePositions(stackSize, scenario),
    [stackSize, scenario]
  );
  const effectivePosition = availablePositions.includes(position) ? position : (availablePositions[0] || 'BTN');

  const showOpponent = scenario !== 'rfi';
  const availableOpponents = useMemo(
    () => showOpponent ? getAvailableOpponents(stackSize, effectivePosition, scenario) : [],
    [stackSize, effectivePosition, scenario, showOpponent]
  );
  const effectiveOpponent = showOpponent && availableOpponents.length > 0
    ? (opponent && availableOpponents.includes(opponent) ? opponent : availableOpponents[0])
    : null;

  // Current (start) spot
  const currentSpot = useMemo((): SpotDescriptor => ({
    stackSize,
    position: effectivePosition,
    scenario,
    opponent: effectiveOpponent,
    caller: caller,
  }), [stackSize, effectivePosition, scenario, effectiveOpponent, caller]);

  const syncSpotToUrl = useCallback((s: SpotDescriptor) => {
    setStackSize(s.stackSize);
    setPosition(s.position);
    setScenario(s.scenario);
    setOpponent(s.opponent);
    setCaller(s.caller);
  }, [setStackSize, setPosition, setScenario, setOpponent, setCaller]);

  // Delta axis selection
  const [deltaAxisPickMode, setDeltaAxisPickMode] = useState(false); // true while user is picking an axis after clicking Δ
  const [deltaAxis, setDeltaAxis] = useState<DeltaAxis | null>(null);
  const [deltaTargetValue, setDeltaTargetValue] = useState<string | null>(null);

  // Pick the next ordered value for an axis (presets the target dropdown)
  const getNextValue = useCallback((axis: DeltaAxis): string | null => {
    let values: string[];
    let current: string;
    if (axis === 'stackSize') {
      values = STACK_SIZES.map(s => s.value);
      current = stackSize;
    } else if (axis === 'position') {
      values = availablePositions;
      current = effectivePosition;
    } else {
      values = availableOpponents;
      current = effectiveOpponent ?? '';
    }
    const remaining = values.filter(v => v !== current);
    if (remaining.length === 0) return null;
    const idx = values.indexOf(current);
    const nextInList = values[idx + 1];
    return nextInList && nextInList !== current ? nextInList : remaining[0];
  }, [stackSize, effectivePosition, effectiveOpponent, availablePositions, availableOpponents]);

  // Called when user clicks a segment while in axis-pick mode
  const handleSelectDeltaAxis = useCallback((axis: DeltaAxis) => {
    setDeltaAxis(axis);
    setDeltaTargetValue(getNextValue(axis));
    setDeltaAxisPickMode(false);
  }, [getNextValue]);

  // Target spot: currentSpot with one axis overridden
  const targetSpot = useMemo((): SpotDescriptor => {
    if (!deltaAxis || !deltaTargetValue) return currentSpot;
    if (deltaAxis === 'stackSize') return { ...currentSpot, stackSize: deltaTargetValue as StackSize };
    if (deltaAxis === 'position') return { ...currentSpot, position: deltaTargetValue as Position };
    if (deltaAxis === 'opponent') return { ...currentSpot, opponent: deltaTargetValue as Position };
    return currentSpot;
  }, [currentSpot, deltaAxis, deltaTargetValue]);

  // Target dropdown options: available values for the selected axis, excluding the current value
  const deltaTargetOptions = useMemo(() => {
    if (!deltaAxis) return [];
    if (deltaAxis === 'stackSize') {
      return STACK_SIZES.filter(s =>
        s.value !== stackSize && getRangeForSpot({ ...currentSpot, stackSize: s.value }) !== null
      );
    }
    if (deltaAxis === 'position') {
      return availablePositions
        .filter(p => p !== effectivePosition && getRangeForSpot({ ...currentSpot, position: p }) !== null)
        .map(p => ({ value: p, label: p }));
    }
    if (deltaAxis === 'opponent') {
      return availableOpponents
        .filter(p => p !== effectiveOpponent && getRangeForSpot({ ...currentSpot, opponent: p }) !== null)
        .map(p => ({ value: p, label: p }));
    }
    return [];
  }, [deltaAxis, stackSize, effectivePosition, effectiveOpponent, currentSpot, availablePositions, availableOpponents]);

  // Auto-correct deltaTargetValue when options change
  useEffect(() => {
    if (!deltaAxis || deltaTargetOptions.length === 0) {
      setDeltaTargetValue(null);
      return;
    }
    if (deltaTargetValue && deltaTargetOptions.some(o => o.value === deltaTargetValue)) return;
    setDeltaTargetValue(deltaTargetOptions[0]?.value ?? null);
  }, [deltaAxis, deltaTargetOptions, deltaTargetValue]);


  // Load ranges
  const startRange = useMemo(() => getRangeForSpot(currentSpot), [currentSpot]);
  const targetRange = useMemo((): ReturnType<typeof getRangeForSpot> => {
    if (!deltaAxis || !deltaTargetValue) return null;
    const r = getRangeForSpot(targetSpot);
    return r;
  }, [deltaAxis, deltaTargetValue, targetSpot]);

  const hasValidTarget = targetRange !== null && startRange !== null;

  // Compute diff hands (hands that change between start and target)
  const diffHands = useMemo((): Set<string> => {
    if (!startRange || !targetRange) return new Set();
    return getDiffHands(startRange, targetRange);
  }, [startRange, targetRange]);

  const nonDiffHands = useMemo((): Set<string> => {
    if (!startRange || !targetRange) return new Set(ALL_HANDS);
    const nonDiff = new Set<string>();
    ALL_HANDS.forEach(h => {
      if (!diffHands.has(h)) nonDiff.add(h);
    });
    return nonDiff;
  }, [diffHands, startRange, targetRange]);

  // Selections + painted tracking
  const {
    userSelections,
    setCell,
    userPaintedHands,
    initializeFromStartRange,
    clearSelections,
    fillRemainingAsFold,
  } = useDeltaSelections();

  // Initialize chart when start+target become valid, or reinitialize on spot change
  const prevSpotKeyRef = useRef<string>('');
  const startRangeKey = startRange ? `${startRange.meta.stackSize}-${startRange.meta.position}-${startRange.meta.scenario}-${startRange.meta.opponentPosition ?? ''}` : '';
  const targetRangeKey = targetRange ? `${targetRange.meta.stackSize}-${targetRange.meta.position}-${targetRange.meta.scenario}-${targetRange.meta.opponentPosition ?? ''}` : '';
  const spotKey = `${startRangeKey}||${targetRangeKey}`;

  useEffect(() => {
    if (spotKey === prevSpotKeyRef.current) return;
    prevSpotKeyRef.current = spotKey;

    if (!hasValidTarget || !startRange) {
      clearSelections();
      return;
    }
    initializeFromStartRange(startRange.data);
  }, [spotKey, hasValidTarget, startRange, clearSelections, initializeFromStartRange]);

  // Dim logic for RangeChart
  const dimmedHandsForMyAnswers = useMemo((): Set<string> => {
    const dimmed = new Set<string>();
    ALL_HANDS.forEach(h => {
      if (!userPaintedHands.has(h) && userSelections[h] !== 'black') {
        dimmed.add(h);
      }
    });
    return dimmed;
  }, [userPaintedHands, userSelections]);

  const dimmedHandsForCorrect = useMemo((): Set<string> => {
    // Dim all non-diff hands in the correct answers view
    const dimmed = new Set<string>();
    ALL_HANDS.forEach(h => {
      if (!diffHands.has(h) && targetRange?.data[h] !== 'black') {
        dimmed.add(h);
      }
    });
    return dimmed;
  }, [diffHands, targetRange]);

  // Quiz state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradeSummary, setGradeSummary] = useState<ChartGradeSummary | null>(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  // Reset on spot change
  useEffect(() => {
    setIsSubmitted(false);
    setGradeSummary(null);
    setShowCorrectAnswers(false);
  }, [spotKey]);

  // Action selection
  const [selectedActions, setSelectedActions] = useState<Set<SimpleAction>>(new Set(['raise']));
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const handleToggleAction = useCallback((action: SimpleAction) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(action)) { next.delete(action); } else { next.add(action); }
      return next;
    });
  }, []);

  const handleSelectAction = useCallback((action: SimpleAction) => {
    setSelectedActions(new Set([action]));
  }, []);

  const handleMultiToggle = useCallback(() => setMultiSelectMode(prev => !prev), []);

  const effectiveAction = useMemo((): QuizAction | null => {
    if (selectedActions.size === 0) return null;
    if (selectedActions.size === 1) return Array.from(selectedActions)[0];
    return deriveBlendType(selectedActions);
  }, [selectedActions]);

  // Category preview (long-press)
  const [categoryPreview, setCategoryPreview] = useState<{ hands: string[]; floor: string } | null>(null);
  const categoryPreviewRef = useRef<{ hands: string[]; floor: string } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandRef = useRef<string | null>(null);
  const longPressFiredRef = useRef(false);
  categoryPreviewRef.current = categoryPreview;

  // Mobile Δ button: use touchend + preventDefault to avoid 300ms delay / scroll interference
  const mobileDeltaButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDeltaTouchHandledRef = useRef(false);
  const deltaAxisPickModeRef = useRef(deltaAxisPickMode);
  deltaAxisPickModeRef.current = deltaAxisPickMode;

  useEffect(() => {
    const el = mobileDeltaButtonRef.current;
    if (!el) return;
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      mobileDeltaTouchHandledRef.current = true;
      if (!isSubmitted) setDeltaAxisPickMode(prev => !prev);
    };
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => el.removeEventListener('touchend', handleTouchEnd);
  }, [isSubmitted]);

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
  }, [effectiveAction, setCell]);

  const onPointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressFiredRef.current = false;
    longPressHandRef.current = null;
    setCategoryPreview(null);
  }, []);

  useEffect(() => {
    setCategoryPreview(null);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressHandRef.current = null;
    longPressFiredRef.current = false;
  }, [effectivePosition, stackSize, scenario, effectiveOpponent, effectiveAction]);

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

  // Painting
  const painting = usePainting();

  const paintCell = useCallback((hand: string) => {
    if (effectiveAction && !isSubmitted) setCell(hand, effectiveAction);
  }, [effectiveAction, isSubmitted, setCell]);

  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    if (effectiveAction && !isSubmitted) setCell(hand, effectiveAction);
  }, [painting, effectiveAction, isSubmitted, setCell]);

  const effectiveSelectedAction = useMemo((): SimpleAction | null => {
    if (effectiveAction && ['raise', 'call', 'fold', 'shove'].includes(effectiveAction)) {
      return effectiveAction as SimpleAction;
    }
    return null;
  }, [effectiveAction]);

  const hasBlendSelected = useMemo(
    () => effectiveAction !== null && !['raise', 'call', 'fold', 'shove'].includes(effectiveAction),
    [effectiveAction]
  );

  // Submit
  const handleSubmit = () => {
    if (!startRange || !targetRange) return;
    const completedResults: Record<string, GradeAction> = {};
    for (const [hand, action] of Object.entries(userSelections)) {
      completedResults[hand] = (action ?? 'fold') as GradeAction;
    }
    fillRemainingAsFold();
    setIsSubmitted(true);
    const summary = gradeDeltaRange({
      startRange,
      targetRange,
      userResults: completedResults,
    });
    setGradeSummary(summary);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setGradeSummary(null);
    setShowCorrectAnswers(false);
    setSelectedActions(new Set());
    setMultiSelectMode(false);
    if (startRange) initializeFromStartRange(startRange.data);
  };

  const handleClear = () => {
    if (startRange) initializeFromStartRange(startRange.data);
    setCategoryPreview(null);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressHandRef.current = null;
    longPressFiredRef.current = false;
  };

  // The dimmedHands to pass to RangeChart depends on view state
  const activeDimmedHands = showCorrectAnswers ? dimmedHandsForCorrect : dimmedHandsForMyAnswers;

  // Empty count for vs-raise fill button
  const emptyCount = ALL_HANDS.filter(h => userSelections[h] === null).length;

  const canInteract = hasValidTarget && !isSubmitted;

  // Header rows for both desktop and mobile
  // When deltaAxisPickMode is true, segments are clickable axis selectors (switchable role).
  // When false, all fields are normal editable dropdowns.
  const startingRangeRow = (headerStyle: boolean) => (
    <SpotSelector
      spot={currentSpot}
      onChange={syncSpotToUrl}
      disabled={isSubmitted}
      filterByAvailability={true}
      headerStyle={headerStyle}
      deltaMode={deltaAxisPickMode}
      deltaAxis={deltaAxis}
      onSelectDeltaAxis={handleSelectDeltaAxis}
    />
  );

  const deltaButton = (headerStyle: boolean) => (
    <button
      type="button"
      title="Pick one axis to vary (stack, position, opponent). Click Δ then click a field."
      onClick={() => setDeltaAxisPickMode(prev => !prev)}
      disabled={isSubmitted}
      className={`
        shrink-0 flex items-center justify-center font-bold
        ${headerStyle ? 'w-8 h-8 text-lg rounded-md' : 'w-7 h-7 text-base rounded'}
        ${deltaAxisPickMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}
        ${isSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      Δ
    </button>
  );

  // Arrow row: only renders the FaArrowDown under the axis column, invisible spacers elsewhere
  const arrowRow = (headerStyle: boolean) => (
    deltaAxis && deltaTargetOptions.length > 0 ? (
      <SpotSelector
        spot={currentSpot}
        onChange={syncSpotToUrl}
        disabled={isSubmitted}
        filterByAvailability={true}
        headerStyle={headerStyle}
        deltaMode={true}
        deltaAxis={deltaAxis}
        deltaTargetMode={true}
        deltaTargetRowMode="arrow"
        deltaTargetValue={deltaTargetValue}
        deltaTargetOptions={deltaTargetOptions}
        onDeltaTargetChange={setDeltaTargetValue}
      />
    ) : null
  );

  // Value row: dropdown under the axis column, visible locked text elsewhere
  const targetRangeRow = (headerStyle: boolean) => (
    deltaAxis && deltaTargetOptions.length > 0 ? (
      <SpotSelector
        spot={currentSpot}
        onChange={syncSpotToUrl}
        disabled={isSubmitted}
        filterByAvailability={true}
        headerStyle={headerStyle}
        deltaMode={true}
        deltaAxis={deltaAxis}
        deltaTargetMode={true}
        deltaTargetRowMode="value"
        deltaTargetVisible={true}
        deltaTargetValue={deltaTargetValue}
        deltaTargetOptions={deltaTargetOptions}
        onDeltaTargetChange={setDeltaTargetValue}
      />
    ) : null
  );

  return (
    <>
      <main className={`${painting.isPainting ? 'select-none' : ''}`}>

        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-28">
          {/* Mobile header — CSS grid: labels col | content col */}
          <div className="bg-white border-b border-slate-200 px-3 py-2.5">
            <div className="grid gap-x-2 gap-y-1" style={{ gridTemplateColumns: '3.5rem 1fr' }}>
              {/* Row 1: Starting label | starting range + Δ */}
              <div className="flex items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 text-sm leading-relaxed">
                  {startingRangeRow(false)}
                </div>
                {/* Mobile Δ button with touch-end handling to avoid 300ms delay */}
                <button
                  ref={mobileDeltaButtonRef}
                  type="button"
                  title="Pick one axis to vary (stack, position, opponent)."
                  onClick={() => {
                    if (mobileDeltaTouchHandledRef.current) {
                      mobileDeltaTouchHandledRef.current = false;
                      return;
                    }
                    if (!isSubmitted) setDeltaAxisPickMode(prev => !prev);
                  }}
                  disabled={isSubmitted}
                  className={`
                    shrink-0 w-7 h-7 text-base rounded flex items-center justify-center font-bold
                    touch-manipulation select-none
                    ${deltaAxisPickMode ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}
                    ${isSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:opacity-80'}
                  `}
                >
                  Δ
                </button>
              </div>

              {/* Row 2: empty | arrow row (spacers inside align arrow under axis) */}
              {deltaAxis && (
                <>
                  <div />
                  <div className="text-sm leading-relaxed">
                    {arrowRow(false)}
                  </div>
                </>
              )}

              {/* Row 3: Target label | target range */}
              {deltaAxis && (
                <>
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target</span>
                  </div>
                  <div className="text-sm leading-relaxed">
                    {targetRangeRow(false)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Grid */}
          <div className="flex-1 p-1 relative">
            {isSubmitted && hasValidTarget && (
              <div className="flex justify-center mb-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => setShowCorrectAnswers(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showCorrectAnswers ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    My Answers
                  </button>
                  <button
                    onClick={() => setShowCorrectAnswers(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${showCorrectAnswers ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    Correct
                  </button>
                </div>
              </div>
            )}

            {isSubmitted && gradeSummary && (
              <div className="mb-2 px-3 py-2 bg-slate-100 rounded-lg text-center">
                <span className="text-lg font-bold text-slate-900">{Math.round(gradeSummary.overall.accuracy * 100)}%</span>
                <span className="text-sm text-slate-600 ml-2">
                  {gradeSummary.overall.correct}/{gradeSummary.overall.attempted} of {diffHands.size} changes correct
                </span>
              </div>
            )}

            {!hasValidTarget && (
              <div className="absolute inset-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-6">
                <p className="text-slate-400 text-sm">
                  Tap Δ then a field to set the varying axis
                </p>
              </div>
            )}

            <RangeChart
              userSelections={hasValidTarget ? userSelections : {}}
              correctRange={targetRange?.data}
              isSubmitted={isSubmitted}
              isPainting={painting.isPainting && canInteract}
              selectedAction={canInteract ? effectiveSelectedAction : null}
              onPaint={canInteract ? paintCell : () => {}}
              onPaintStart={canInteract ? handlePaintStart : () => {}}
              showCorrectAnswers={showCorrectAnswers}
              blendMode={canInteract && hasBlendSelected}
              onPointerDown={canInteract && effectiveAction ? onPointerDown : undefined}
              onPointerUp={canInteract && effectiveAction ? onPointerUp : undefined}
              onPointerCancel={canInteract && effectiveAction ? onPointerCancel : undefined}
              categoryPreviewHands={categoryPreview ? new Set(categoryPreview.hands) : null}
              categoryPreviewFloor={categoryPreview?.floor ?? null}
              dimmedHands={hasValidTarget ? activeDimmedHands : null}
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column */}
            <div className="flex flex-col gap-4 w-90 shrink-0">

              {/* Header: Starting Range + Δ button */}
              <div className="flex flex-col gap-1">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Starting Range</p>
                  <div className="flex items-start gap-2">
                    <div className="text-lg leading-relaxed flex-1 min-w-0">
                      {startingRangeRow(true)}
                    </div>
                    {deltaButton(true)}
                  </div>
                </div>

                {!deltaAxis && !deltaAxisPickMode && (
                  <p className="text-sm text-slate-500">
                    Click Δ then a field to choose your target axis
                  </p>
                )}
                {deltaAxisPickMode && (
                  <p className="text-sm text-slate-700 font-medium">
                    Click a field to set it as the varying axis
                  </p>
                )}

                {/* Arrow row: horizontally aligned under the changed axis segment */}
                {deltaAxis && (
                  <div className="text-lg leading-relaxed">
                    {arrowRow(true)}
                  </div>
                )}

                {/* Target Range value row */}
                {deltaAxis && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Target Range</p>
                    <div className="text-lg leading-relaxed">
                      {targetRangeRow(true)}
                    </div>
                  </div>
                )}
              </div>

              {hasValidTarget && (
                <Card>
                  <ActionPalette
                    mode="quiz"
                    selectedActions={selectedActions}
                    onToggleAction={handleToggleAction}
                    onSelectAction={handleSelectAction}
                    multiSelectMode={multiSelectMode}
                    onMultiToggle={handleMultiToggle}
                    disabled={isSubmitted}
                  />
                </Card>
              )}

              {hasValidTarget && (
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
                      {scenario === 'vs-raise' && emptyCount > 0 && (
                        <button
                          onClick={fillRemainingAsFold}
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

              {isSubmitted && gradeSummary && (
                <>
                  <div className="text-sm text-slate-500 text-center">
                    Scored on {diffHands.size} changed hand{diffHands.size !== 1 ? 's' : ''}
                  </div>
                  <ResultsSummary gradeSummary={gradeSummary} />
                </>
              )}
            </div>

            {/* Right column — Grid */}
            <div className="flex-1 min-w-0 relative">
              {isSubmitted && hasValidTarget && (
                <div className="flex justify-center mb-3">
                  <div className="inline-flex rounded-lg bg-slate-100 p-1">
                    <button
                      onClick={() => setShowCorrectAnswers(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${!showCorrectAnswers ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      My Answers
                    </button>
                    <button
                      onClick={() => setShowCorrectAnswers(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${showCorrectAnswers ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Correct Answers
                    </button>
                  </div>
                </div>
              )}

              {!hasValidTarget && (
                <div className="absolute inset-0 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-8">
                  <p className="text-slate-400 text-base">
                    Click Δ then a field to set the varying axis
                  </p>
                </div>
              )}

              <RangeChart
                userSelections={hasValidTarget ? userSelections : {}}
                correctRange={targetRange?.data}
                isSubmitted={isSubmitted}
                isPainting={painting.isPainting && canInteract}
                selectedAction={canInteract ? effectiveSelectedAction : null}
                onPaint={canInteract ? paintCell : () => {}}
                onPaintStart={canInteract ? handlePaintStart : () => {}}
                showCorrectAnswers={showCorrectAnswers}
                blendMode={canInteract && hasBlendSelected}
                onPointerDown={canInteract && effectiveAction ? onPointerDown : undefined}
                onPointerUp={canInteract && effectiveAction ? onPointerUp : undefined}
                onPointerCancel={canInteract && effectiveAction ? onPointerCancel : undefined}
                categoryPreviewHands={categoryPreview ? new Set(categoryPreview.hands) : null}
                categoryPreviewFloor={categoryPreview?.floor ?? null}
                dimmedHands={hasValidTarget ? activeDimmedHands : null}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Action Bar */}
      {hasValidTarget && (
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

export default DeltaMode;
