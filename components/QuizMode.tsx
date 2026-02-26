'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Scenario, SimpleAction, QuizAction, Position, StackSize, SpotDescriptor } from '@/types';
import { useUrlState, useQuizSelections, useDeltaSelections, usePainting, useDelta } from '@/hooks';
import { getRange, getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';
import { getCategoryHandsAtOrAboveFloor, getCategoryForHand, ALL_HANDS } from '@/data/hands';
import { Lightbulb } from 'lucide-react';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { ActionPalette } from './ActionPalette';
import { ResultsSummary } from './ResultsSummary';
import { MobileActionBar, deriveBlendType } from './MobileActionBar';
import { MobileDropdownBar } from './MobileDropdownBar';
import { SpotSelector } from './SpotSelector';
import { NotesModal } from './NotesModal';
import { DeltaControls } from './DeltaControls';
import { DiffFilterToggles } from './DiffFilterToggles';
import { gradeRangeSubmission, type ChartGradeSummary, type GradeAction } from '@/lib/gradeRange';
import { gradeDeltaRange } from '@/lib/gradeDeltaRange';
import { getDiffCategories, buildDimmedFromCategories, ALL_DIFF_CATEGORIES, type DiffCategoryKey } from '@/lib/getDiffCategories';

export function QuizMode() {
  const { position, stackSize, scenario, opponent, caller, assumeOpen, setAssumeOpen, setPosition, setStackSize, setScenario, setOpponent, setCaller } = useUrlState('/');

  // Both selection hooks are initialized unconditionally; we use one or the other based on delta state
  const quizSelections = useQuizSelections();
  const deltaSelections = useDeltaSelections();

  const availableScenarios = useMemo(() => getAvailableScenarios(stackSize), [stackSize]);
  const effectiveScenario = availableScenarios.includes(scenario) ? scenario : availableScenarios[0] || 'rfi';

  if (effectiveScenario !== scenario && availableScenarios.length > 0) {
    setScenario(effectiveScenario);
  }

  const availablePositions = useMemo(
    () => getAvailablePositions(stackSize, effectiveScenario),
    [stackSize, effectiveScenario]
  );
  const effectivePosition = availablePositions.includes(position) ? position : availablePositions[0] || 'UTG';

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

  if (showOpponent && effectiveOpponent !== opponent) {
    setOpponent(effectiveOpponent);
  }

  const showCaller = effectiveScenario === 'vs-raise-call';
  const availableCallers = useMemo(
    () => showCaller && effectiveOpponent ? getAvailableCallers(stackSize, effectivePosition, effectiveOpponent) : [],
    [stackSize, effectivePosition, effectiveOpponent, showCaller]
  );
  const effectiveCaller = showCaller && availableCallers.length > 0
    ? (caller && availableCallers.includes(caller) ? caller : availableCallers[0])
    : null;

  if (showCaller && effectiveCaller !== caller) {
    setCaller(effectiveCaller);
  }

  if (!showCaller && caller !== null) {
    setCaller(null);
  }

  const range = useMemo(
    () => getRange(stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller),
    [stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller]
  );
  const rangeExists = range !== null;

  const currentSpot = useMemo((): SpotDescriptor => ({
    stackSize,
    position: effectivePosition,
    scenario: effectiveScenario,
    opponent: effectiveOpponent,
    caller: effectiveCaller,
  }), [stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller]);

  const syncSpotToUrl = useCallback((s: SpotDescriptor) => {
    setStackSize(s.stackSize);
    setPosition(s.position);
    setScenario(s.scenario);
    setOpponent(s.opponent);
    setCaller(s.caller);
  }, [setStackSize, setPosition, setScenario, setOpponent, setCaller]);

  // Delta integration
  const delta = useDelta(currentSpot);
  const { deltaActive, hasValidTarget, startRange: deltaStartRange, targetRange: deltaTargetRange, diffHands } = delta;
  const isDeltaQuiz = deltaActive && hasValidTarget;

  // Unified selections interface — pick the right hook based on mode
  const userSelections = isDeltaQuiz ? deltaSelections.userSelections : quizSelections.userSelections;
  const setCell = isDeltaQuiz ? deltaSelections.setCell : quizSelections.setCell;
  const fillRemainingAsFold = isDeltaQuiz ? deltaSelections.fillRemainingAsFold : quizSelections.fillRemainingAsFold;

  const emptyCount = isDeltaQuiz
    ? ALL_HANDS.filter(h => deltaSelections.userSelections[h] === null).length
    : quizSelections.totalCells - quizSelections.filledCount;

  const rangeExistsForDisplay = isDeltaQuiz ? true : rangeExists;

  // The range to grade / show correct answers against
  const correctRange = isDeltaQuiz ? deltaTargetRange : range;

  // Opponent RFI range for "Assume Open" overlay (non-delta, vs Raise only)
  const opponentRfiRange = useMemo(() => {
    if (isDeltaQuiz || effectiveScenario !== 'vs-raise' || !effectiveOpponent) return null;
    return getRange(stackSize, effectiveOpponent, 'rfi');
  }, [stackSize, effectiveOpponent, effectiveScenario, isDeltaQuiz]);

  const showAssumeOpenToggle = !isDeltaQuiz && effectiveScenario === 'vs-raise' && rangeExists;
  const assumeOpenEnabled = assumeOpen && opponentRfiRange !== null;

  // Quiz state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gradeSummary, setGradeSummary] = useState<ChartGradeSummary | null>(null);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // Action selection state
  const [selectedActions, setSelectedActions] = useState<Set<SimpleAction>>(new Set(['raise']));
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Category preview (long-press)
  const [categoryPreview, setCategoryPreview] = useState<{ hands: string[]; floor: string } | null>(null);
  const categoryPreviewRef = useRef<{ hands: string[]; floor: string } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandRef = useRef<string | null>(null);
  const longPressFiredRef = useRef(false);
  categoryPreviewRef.current = categoryPreview;

  // Painting state
  const painting = usePainting();

  // Track previous range params to detect changes
  const prevParamsRef = useRef<{ position: Position; stackSize: StackSize; scenario: Scenario; opponent: Position | null; caller: Position | null } | null>(null);

  // Delta quiz: initialize from start range when valid target changes
  const prevDeltaSpotKeyRef = useRef<string>('');
  const deltaStartRangeKey = deltaStartRange ? `${deltaStartRange.meta.stackSize}-${deltaStartRange.meta.position}-${deltaStartRange.meta.scenario}-${deltaStartRange.meta.opponentPosition ?? ''}` : '';
  const deltaTargetRangeKey = deltaTargetRange ? `${deltaTargetRange.meta.stackSize}-${deltaTargetRange.meta.position}-${deltaTargetRange.meta.scenario}-${deltaTargetRange.meta.opponentPosition ?? ''}` : '';
  const deltaSpotKey = `${deltaStartRangeKey}||${deltaTargetRangeKey}`;

  useEffect(() => {
    if (!isDeltaQuiz) return;
    if (deltaSpotKey === prevDeltaSpotKeyRef.current) return;
    prevDeltaSpotKeyRef.current = deltaSpotKey;

    if (!deltaStartRange) {
      deltaSelections.clearSelections();
      return;
    }
    deltaSelections.initializeFromStartRange(deltaStartRange.data);
    setIsSubmitted(false);
    setGradeSummary(null);
    setShowCorrectAnswers(false);
  }, [isDeltaQuiz, deltaSpotKey, deltaStartRange, deltaSelections]);

  // Non-delta: reset quiz state when range parameters change (or on first mount)
  useEffect(() => {
    if (isDeltaQuiz) return;
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
          quizSelections.initializeForVsRaise(range.data);
        } else {
          quizSelections.initializeWithBlackHands(range.data);
        }
      } else {
        quizSelections.resetToFold();
      }
      prevParamsRef.current = { position: effectivePosition, stackSize, scenario: effectiveScenario, opponent: effectiveOpponent, caller: effectiveCaller };
    }
  }, [isDeltaQuiz, effectivePosition, stackSize, effectiveScenario, effectiveOpponent, effectiveCaller, range, quizSelections]);

  // Non-delta: first-load black hand sync
  useEffect(() => {
    if (isDeltaQuiz) return;
    if (range && !isSubmitted) {
      const hasBlackHands = Object.values(range.data).some(action => action === 'black');
      const hasBlackSelections = Object.values(quizSelections.userSelections).some(action => action === 'black');
      if (hasBlackHands && !hasBlackSelections) {
        if (effectiveScenario === 'vs-raise') {
          quizSelections.initializeForVsRaise(range.data);
        } else {
          quizSelections.initializeWithBlackHands(range.data);
        }
      }
    }
  }, [isDeltaQuiz, range, isSubmitted, quizSelections.userSelections, effectiveScenario, quizSelections]);

  // Reset quiz state when entering/leaving delta mode
  const prevDeltaActiveRef = useRef(deltaActive);
  useEffect(() => {
    if (prevDeltaActiveRef.current !== deltaActive) {
      prevDeltaActiveRef.current = deltaActive;
      setIsSubmitted(false);
      setGradeSummary(null);
      setShowCorrectAnswers(false);
      setSelectedActions(new Set());
      setMultiSelectMode(false);
      if (!deltaActive && range) {
        if (effectiveScenario === 'vs-raise') {
          quizSelections.initializeForVsRaise(range.data);
        } else {
          quizSelections.initializeWithBlackHands(range.data);
        }
      }
    }
  }, [deltaActive, range, effectiveScenario, quizSelections]);

  // Delta dimming logic
  const dimmedHandsForMyAnswers = useMemo((): Set<string> | null => {
    if (!isDeltaQuiz) return null;
    const dimmed = new Set<string>();
    ALL_HANDS.forEach(h => {
      if (!deltaSelections.userPaintedHands.has(h) && deltaSelections.userSelections[h] !== 'black') {
        dimmed.add(h);
      }
    });
    return dimmed;
  }, [isDeltaQuiz, deltaSelections.userPaintedHands, deltaSelections.userSelections]);

  // Diff categories for filter toggles (post-submit)
  const diffCategories = useMemo(() => {
    if (!isDeltaQuiz || !deltaStartRange || !deltaTargetRange) return null;
    return getDiffCategories(deltaStartRange, deltaTargetRange);
  }, [isDeltaQuiz, deltaStartRange, deltaTargetRange]);

  const [enabledCategories, setEnabledCategories] = useState<Set<DiffCategoryKey>>(
    () => new Set(ALL_DIFF_CATEGORIES)
  );

  const handleToggleCategory = useCallback((key: DiffCategoryKey) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const dimmedHandsForCorrect = useMemo((): Set<string> | null => {
    if (!isDeltaQuiz || !diffCategories || !deltaTargetRange) return null;
    return buildDimmedFromCategories(diffCategories, enabledCategories, deltaTargetRange.data);
  }, [isDeltaQuiz, diffCategories, enabledCategories, deltaTargetRange]);

  const activeDimmedHands = isDeltaQuiz
    ? (showCorrectAnswers ? dimmedHandsForCorrect : dimmedHandsForMyAnswers)
    : null;

  // Action selection handlers
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

  const handleMultiToggle = useCallback(() => {
    setMultiSelectMode(prev => !prev);
  }, []);

  const effectiveAction = useMemo((): QuizAction | null => {
    if (selectedActions.size === 0) return null;
    if (selectedActions.size === 1) return Array.from(selectedActions)[0];
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
  }, [effectivePosition, stackSize, effectiveScenario, effectiveOpponent, effectiveCaller, effectiveAction]);

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

  const paintCell = useCallback((hand: string) => {
    if (effectiveAction && !isSubmitted) {
      setCell(hand, effectiveAction);
    }
  }, [effectiveAction, isSubmitted, setCell]);

  const handlePaintStart = useCallback((hand: string) => {
    painting.handlePaintStart();
    if (effectiveAction && !isSubmitted) {
      setCell(hand, effectiveAction);
    }
  }, [painting, effectiveAction, isSubmitted, setCell]);

  const handleSubmit = () => {
    if (isDeltaQuiz) {
      if (!deltaStartRange || !deltaTargetRange) return;
      const completedResults: Record<string, GradeAction> = {};
      for (const [hand, action] of Object.entries(deltaSelections.userSelections)) {
        completedResults[hand] = (action ?? 'fold') as GradeAction;
      }
      deltaSelections.fillRemainingAsFold();
      setIsSubmitted(true);
      const summary = gradeDeltaRange({
        startRange: deltaStartRange,
        targetRange: deltaTargetRange,
        userResults: completedResults,
      });
      setGradeSummary(summary);
    } else {
      if (!range) return;
      const completedResults: Record<string, GradeAction> = {};
      for (const [hand, action] of Object.entries(quizSelections.userSelections)) {
        completedResults[hand] = (action ?? 'fold') as GradeAction;
      }
      quizSelections.fillRemainingAsFold();
      setIsSubmitted(true);
      const summary = gradeRangeSubmission({
        expectedRange: range,
        userResults: completedResults,
      });
      setGradeSummary(summary);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setGradeSummary(null);
    setShowCorrectAnswers(false);
    setSelectedActions(new Set());
    setMultiSelectMode(false);
    painting.setSelectedAction(null);
    if (isDeltaQuiz) {
      if (deltaStartRange) deltaSelections.initializeFromStartRange(deltaStartRange.data);
    } else {
      if (effectiveScenario === 'vs-raise' && range) {
        quizSelections.initializeForVsRaise(range.data);
      } else {
        quizSelections.resetToFold();
      }
    }
  };

  const handleClear = () => {
    if (isDeltaQuiz) {
      if (deltaStartRange) deltaSelections.initializeFromStartRange(deltaStartRange.data);
    } else {
      if (effectiveScenario === 'vs-raise' && range) {
        quizSelections.initializeForVsRaise(range.data);
      } else {
        quizSelections.resetToFold();
      }
    }
    setCategoryPreview(null);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressHandRef.current = null;
    longPressFiredRef.current = false;
  };

  const effectiveSelectedAction = useMemo(() => {
    if (effectiveAction && ['raise', 'call', 'fold', 'shove'].includes(effectiveAction)) {
      return effectiveAction as SimpleAction;
    }
    return null;
  }, [effectiveAction]);

  const hasBlendSelected = useMemo(() => {
    return effectiveAction !== null && !['raise', 'call', 'fold', 'shove'].includes(effectiveAction);
  }, [effectiveAction]);

  const canInteract = (isDeltaQuiz || rangeExistsForDisplay) && !isSubmitted;

  // For delta: show "not ready" overlay when axis is being picked but no target yet
  const showDeltaPlaceholder = deltaActive && !hasValidTarget;

  return (
    <>
      <main className={`${painting.isPainting ? 'select-none' : ''}`}>
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-4">
          {/* Mobile header */}
          {(deltaActive || delta.deltaAxisPickMode) ? (
            <DeltaControls
              delta={delta}
              currentSpot={currentSpot}
              syncSpotToUrl={syncSpotToUrl}
              disabled={isSubmitted}
              layout="mobile"
            />
          ) : (
            <>
              <div className="bg-felt-surface border-b border-felt-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center justify-center flex-wrap">
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
                  </div>
                  <button
                    type="button"
                    title="Compare ranges (Delta)"
                    onClick={() => delta.setDeltaAxisPickMode(true)}
                    disabled={isSubmitted}
                    className={`
                      shrink-0 w-7 h-7 text-base rounded flex items-center justify-center font-bold
                      touch-manipulation select-none bg-felt-elevated text-cream-muted
                      ${isSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:opacity-80'}
                    `}
                  >
                    Δ
                  </button>
                </div>
              </div>
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
                      className="rounded border-felt-border text-gold focus:ring-gold cursor-pointer shrink-0"
                    />
                    <span className="text-sm font-medium text-cream">
                      Assume {effectiveOpponent} Open
                    </span>
                  </label>
                </div>
              )}
            </>
          )}

          {/* Mobile Grid */}
          <div className="flex-1 p-1 relative">
            {isSubmitted && rangeExistsForDisplay && (
              <div className="flex justify-center mb-2">
                <div className="inline-flex rounded-lg bg-felt-elevated p-1">
                  <button
                    onClick={() => setShowCorrectAnswers(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!showCorrectAnswers ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted'}`}
                  >
                    My Answers
                  </button>
                  <button
                    onClick={() => setShowCorrectAnswers(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${showCorrectAnswers ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted'}`}
                  >
                    Correct
                  </button>
                </div>
              </div>
            )}

            {isSubmitted && gradeSummary && (
              <div className="mb-2 px-3 py-2 bg-felt-elevated rounded-lg text-center">
                <span className="text-lg font-bold text-cream">{Math.round(gradeSummary.overall.accuracy * 100)}%</span>
                <span className="text-sm text-cream-muted ml-2">
                  {isDeltaQuiz
                    ? `${gradeSummary.overall.correct}/${gradeSummary.overall.attempted} of ${diffHands.size} changes correct`
                    : `${gradeSummary.overall.correct}/${gradeSummary.overall.attempted} correct`
                  }
                </span>
              </div>
            )}

            {/* Delta diff filter toggles (mobile, post-submit) */}
            {isDeltaQuiz && isSubmitted && showCorrectAnswers && diffCategories && diffCategories.counts.total > 0 && (
              <div className="mb-2 px-1">
                <DiffFilterToggles
                  categories={diffCategories}
                  enabledCategories={enabledCategories}
                  onToggle={handleToggleCategory}
                />
              </div>
            )}

            {showDeltaPlaceholder && (
              <div className="absolute inset-3 bg-felt-elevated border-2 border-dashed border-felt-border rounded-lg flex flex-col items-center justify-center text-center p-6 z-10">
                <p className="text-cream-muted text-sm">
                  Tap Δ then a field to set the varying axis
                </p>
              </div>
            )}

            <RangeChart
              userSelections={showDeltaPlaceholder ? {} : userSelections}
              correctRange={correctRange?.data}
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
              overlayRangeData={!isDeltaQuiz && assumeOpenEnabled ? opponentRfiRange?.data : null}
              dimmedHands={activeDimmedHands}
            />

            {!rangeExistsForDisplay && !deltaActive && (
              <div className="absolute inset-3 bg-felt-elevated rounded-lg flex flex-col items-center justify-center text-center p-6 border border-felt-border">
                <p className="text-cream-muted text-base mb-4">
                  This range hasn&apos;t been created yet
                </p>
                <a
                  href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
                  className="px-4 py-2 bg-felt-muted text-cream rounded-lg font-medium text-sm"
                >
                  Create in Builder
                </a>
              </div>
            )}

            {/* Hint button — below chart, right-aligned (non-delta only) */}
            {!isDeltaQuiz && rangeExistsForDisplay && (range?.meta.strategyNotes?.length || range?.meta.description) && (
              <div className="flex justify-end mt-1 px-1">
                <button
                  onClick={() => setShowHints(true)}
                  className="flex items-center gap-1 text-xs text-cream-muted hover:text-cream transition-colors cursor-pointer"
                  title="View strategy notes"
                >
                  <Lightbulb className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">Hint</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-90 shrink-0">
              {/* Header with delta toggle */}
              {(deltaActive || delta.deltaAxisPickMode) ? (
                <DeltaControls
                  delta={delta}
                  currentSpot={currentSpot}
                  syncSpotToUrl={syncSpotToUrl}
                  disabled={isSubmitted}
                  layout="desktop"
                  headerStyle={true}
                />
              ) : (
                <div className="text-lg leading-relaxed">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 invisible" aria-hidden>Range</p>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <SpotSelector
                        spot={currentSpot}
                        onChange={syncSpotToUrl}
                        disabled={isSubmitted}
                        filterByAvailability={true}
                        headerStyle={true}
                      />
                    </div>
                    <button
                      type="button"
                      title="Compare ranges (Delta)"
                      onClick={() => delta.setDeltaAxisPickMode(true)}
                      disabled={isSubmitted}
                      className={`
                        shrink-0 w-8 h-8 text-lg rounded-md flex items-center justify-center font-bold
                        bg-felt-elevated text-cream-muted hover:bg-felt-muted hover:text-cream
                        ${isSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      Δ
                    </button>
                  </div>
                </div>
              )}

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
                    className="rounded border-felt-border text-gold focus:ring-gold cursor-pointer"
                  />
                  <span className="text-sm font-medium text-cream">
                    Assume {effectiveOpponent} Open
                  </span>
                </label>
              )}

              {(rangeExistsForDisplay || isDeltaQuiz) && (
                <Card>
                  <ActionPalette
                    mode="quiz"
                    selectedActions={selectedActions}
                    onToggleAction={handleToggleAction}
                    onSelectAction={handleSelectAction}
                    multiSelectMode={multiSelectMode}
                    onMultiToggle={handleMultiToggle}
                    disabled={isSubmitted || showDeltaPlaceholder}
                  />
                </Card>
              )}

              {(rangeExistsForDisplay || isDeltaQuiz) && (
                <div className="flex flex-col gap-2">
                  {!isSubmitted ? (
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={handleClear}
                          disabled={showDeltaPlaceholder}
                          className={`flex-1 px-6 py-3 rounded-lg font-semibold text-cream bg-felt-elevated hover:bg-felt-muted transition-all duration-150 ${showDeltaPlaceholder ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={showDeltaPlaceholder}
                          className={`flex-1 px-6 py-3 rounded-lg font-semibold text-felt-bg bg-gold hover:bg-gold-hover cursor-pointer transition-all duration-150 ${showDeltaPlaceholder ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Submit
                        </button>
                      </div>
                      {((isDeltaQuiz && effectiveScenario === 'vs-raise') || (!isDeltaQuiz && effectiveScenario === 'vs-raise')) && emptyCount > 0 && (
                        <button
                          onClick={fillRemainingAsFold}
                          title="Set all remaining empty cells to fold so you can submit"
                          className="w-full px-4 py-2 text-sm font-medium text-cream-muted bg-felt-elevated hover:bg-felt-muted border border-felt-border rounded-lg transition-colors"
                        >
                          Fill rest as fold ({emptyCount} left)
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleReset}
                      className="w-full px-6 py-3 rounded-lg font-semibold text-cream bg-felt-elevated hover:bg-felt-muted transition-all duration-150"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}

              {/* Results Summary */}
              {isSubmitted && gradeSummary && (
                <ResultsSummary
                  gradeSummary={gradeSummary}
                  rangeData={correctRange?.data}
                  isDeltaMode={isDeltaQuiz}
                />
              )}

              {/* Delta diff filter toggles (desktop, post-submit, correct view) */}
              {isDeltaQuiz && isSubmitted && showCorrectAnswers && diffCategories && diffCategories.counts.total > 0 && (
                <DiffFilterToggles
                  categories={diffCategories}
                  enabledCategories={enabledCategories}
                  onToggle={handleToggleCategory}
                />
              )}

              {/* Hint button (non-delta only) */}
              {!isDeltaQuiz && rangeExistsForDisplay && (range?.meta.strategyNotes?.length || range?.meta.description) && (
                <button
                  onClick={() => setShowHints(true)}
                  className="self-start flex items-center gap-1.5 text-xs text-cream-muted hover:text-cream transition-colors mt-1 cursor-pointer"
                  title="View strategy notes"
                >
                  <Lightbulb className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">Hint</span>
                </button>
              )}
            </div>

            {/* Right column - Grid */}
            <div className="flex-1 min-w-0 relative">
              {isSubmitted && rangeExistsForDisplay && (
                <div className="flex justify-center mb-3">
                  <div className="inline-flex rounded-lg bg-felt-elevated p-1">
                    <button
                      onClick={() => setShowCorrectAnswers(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${!showCorrectAnswers ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted hover:text-cream'}`}
                    >
                      My Answers
                    </button>
                    <button
                      onClick={() => setShowCorrectAnswers(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${showCorrectAnswers ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted hover:text-cream'}`}
                    >
                      Correct Answers
                    </button>
                  </div>
                </div>
              )}

              {showDeltaPlaceholder && (
                <div className="absolute inset-0 bg-felt-elevated border-2 border-dashed border-felt-border rounded-lg flex flex-col items-center justify-center text-center p-8 z-10">
                  <p className="text-cream-muted text-base">
                    Click Δ then a field to set the varying axis
                  </p>
                </div>
              )}

              <RangeChart
                userSelections={showDeltaPlaceholder ? {} : userSelections}
                correctRange={correctRange?.data}
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
                overlayRangeData={!isDeltaQuiz && assumeOpenEnabled ? opponentRfiRange?.data : null}
                dimmedHands={activeDimmedHands}
              />

              {!rangeExistsForDisplay && !deltaActive && (
                <div className="absolute inset-0 bg-felt-elevated rounded-lg flex flex-col items-center justify-center text-center p-6 border border-felt-border">
                  <p className="text-cream-muted text-lg mb-4">
                    This range hasn&apos;t been created yet
                  </p>
                  <a
                    href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
                    className="px-4 py-2 bg-felt-muted text-cream rounded-lg font-medium hover:bg-gold hover:text-felt-bg transition-colors"
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
      {(rangeExistsForDisplay || isDeltaQuiz) && !showDeltaPlaceholder && (
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

      {/* Hints Modal (non-delta only) */}
      <NotesModal
        isOpen={showHints}
        onClose={() => setShowHints(false)}
        strategyNotes={range?.meta.strategyNotes}
        description={range?.meta.description}
        title={range?.meta.displayName}
      />
    </>
  );
}

export default QuizMode;
