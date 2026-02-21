'use client';

import { useRef, useCallback, useEffect } from 'react';
import { RANKS } from '@/types';
import type { SimpleAction, RangeData, HandAction, QuizAction } from '@/types';
import { getHandName } from '@/data/hands';
import { HandCell } from './HandCell';

interface RangeChartProps {
  /** User's current selections for each hand (can be simple, blended, or quiz action) */
  userSelections: Record<string, HandAction | QuizAction | null>;
  /** The correct answers (only used after submission) */
  correctRange?: RangeData;
  /** Whether the quiz has been submitted */
  isSubmitted: boolean;
  /** Whether the user is currently painting */
  isPainting: boolean;
  /** The currently selected action/brush */
  selectedAction: SimpleAction | null;
  /** Callback when a cell is painted */
  onPaint: (hand: string) => void;
  /** Callback when painting starts */
  onPaintStart: (hand: string) => void;
  /** Whether to show correct answers instead of user selections (for toggle) */
  showCorrectAnswers?: boolean;
  /** Whether blend mode is active (cells respond to clicks without selectedAction) */
  blendMode?: boolean;
  /** Long-press: pointer down/up/cancel for 700ms hold to show category preview, release to apply */
  onPointerDown?: (hand: string) => void;
  onPointerUp?: (hand: string) => void;
  onPointerCancel?: () => void;
  /** Set of hands currently in category preview (glow border) */
  categoryPreviewHands?: Set<string> | null;
  /** Hand that is the "floor" of the category preview (thicker border) */
  categoryPreviewFloor?: string | null;
  /** Opponent RFI range data for context overlay on empty cells (e.g. Assume UTG Open) */
  overlayRangeData?: RangeData | null;
  /** Set of hand names to render dimmed (lighter color) — used in Delta Mode for start-range cells */
  dimmedHands?: Set<string> | null;
}

/**
 * The 13x13 poker range chart grid.
 * 
 * Layout:
 * - Rows represent the first card (A through 2)
 * - Columns represent the second card (A through 2)
 * - Diagonal = pocket pairs (AA, KK, etc.)
 * - Above diagonal = suited hands (AKs, AQs, etc.)
 * - Below diagonal = offsuit hands (AKo, AQo, etc.)
 */
export function RangeChart({
  userSelections,
  correctRange,
  isSubmitted,
  isPainting,
  selectedAction,
  onPaint,
  onPaintStart,
  showCorrectAnswers = false,
  blendMode = false,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  categoryPreviewHands = null,
  categoryPreviewFloor = null,
  overlayRangeData = null,
  dimmedHands = null,
}: RangeChartProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const lastTouchedHandRef = useRef<string | null>(null);
  const isTouchPaintingRef = useRef(false);
  const pointerDownHandRef = useRef<string | null>(null);
  const pointerMovedRef = useRef(false);
  const touchStartHandRef = useRef<string | null>(null);
  const touchMovedRef = useRef(false);

  const onPaintRef = useRef(onPaint);
  const onPaintStartRef = useRef(onPaintStart);
  const onPointerDownRef = useRef(onPointerDown);
  const onPointerUpRef = useRef(onPointerUp);
  const onPointerCancelRef = useRef(onPointerCancel);
  const isSubmittedRef = useRef(isSubmitted);
  const selectedActionRef = useRef(selectedAction);
  const blendModeRef = useRef(blendMode);

  useEffect(() => {
    onPaintRef.current = onPaint;
    onPaintStartRef.current = onPaintStart;
    onPointerDownRef.current = onPointerDown;
    onPointerUpRef.current = onPointerUp;
    onPointerCancelRef.current = onPointerCancel;
    isSubmittedRef.current = isSubmitted;
    selectedActionRef.current = selectedAction;
    blendModeRef.current = blendMode;
  }, [onPaint, onPaintStart, onPointerDown, onPointerUp, onPointerCancel, isSubmitted, selectedAction, blendMode]);

  /**
   * Get the hand name from an element at a given point.
   * Looks for the data-hand attribute on the element or its parent.
   */
  const getHandFromPoint = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    const handCell = element.closest('[data-hand]');
    if (handCell) return handCell.getAttribute('data-hand');
    return null;
  }, []);

  const useLongPress = Boolean(onPointerDown && onPointerUp);

  const handlePointerDown = useCallback((hand: string) => {
    pointerDownHandRef.current = hand;
    pointerMovedRef.current = false;
    onPaintStartRef.current(hand);
    onPointerDownRef.current?.(hand);
  }, []);

  const handlePointerUp = useCallback((hand: string) => {
    onPointerUpRef.current?.(hand);
    pointerDownHandRef.current = null;
    pointerMovedRef.current = false;
  }, []);

  const handleMouseEnterCell = useCallback((hand: string) => {
    if (pointerDownHandRef.current !== null && hand !== pointerDownHandRef.current) {
      onPointerCancelRef.current?.();
      onPaintRef.current(hand);
      pointerDownHandRef.current = null;
      pointerMovedRef.current = true;
    } else if (pointerMovedRef.current && !isSubmittedRef.current && (selectedActionRef.current || blendModeRef.current)) {
      onPaintRef.current(hand);
    }
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleTouchStart = (e: TouchEvent) => {
      const canPaint = !isSubmittedRef.current && (selectedActionRef.current || blendModeRef.current);
      if (!canPaint) return;

      const touch = e.touches[0];
      const hand = getHandFromPoint(touch.clientX, touch.clientY);
      if (!hand) return;

      e.preventDefault();

      if (useLongPress) {
        touchStartHandRef.current = hand;
        touchMovedRef.current = false;
        onPaintStartRef.current(hand);
        onPointerDownRef.current?.(hand);
        return;
      }

      isTouchPaintingRef.current = true;
      lastTouchedHandRef.current = hand;
      onPaintStartRef.current(hand);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (useLongPress && touchStartHandRef.current !== null) {
        e.preventDefault();
        const touch = e.touches[0];
        const hand = getHandFromPoint(touch.clientX, touch.clientY);
        if (hand !== touchStartHandRef.current) {
          onPointerCancelRef.current?.();
          touchStartHandRef.current = null;
          touchMovedRef.current = true;
          if (hand) {
            onPaintRef.current(hand);
            isTouchPaintingRef.current = true;
            lastTouchedHandRef.current = hand;
          }
        }
        return;
      }

      if (!isTouchPaintingRef.current) return;
      e.preventDefault();
      if (isSubmittedRef.current || (!selectedActionRef.current && !blendModeRef.current)) return;
      const touch = e.touches[0];
      const hand = getHandFromPoint(touch.clientX, touch.clientY);
      if (hand && hand !== lastTouchedHandRef.current) {
        lastTouchedHandRef.current = hand;
        onPaintRef.current(hand);
      }
    };

    const handleTouchEnd = () => {
      if (useLongPress && touchStartHandRef.current !== null) {
        onPointerUpRef.current?.(touchStartHandRef.current);
      }
      touchStartHandRef.current = null;
      touchMovedRef.current = false;
      isTouchPaintingRef.current = false;
      lastTouchedHandRef.current = null;
    };

    grid.addEventListener('touchstart', handleTouchStart, { passive: false });
    grid.addEventListener('touchmove', handleTouchMove, { passive: false });
    grid.addEventListener('touchend', handleTouchEnd);
    grid.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      grid.removeEventListener('touchstart', handleTouchStart);
      grid.removeEventListener('touchmove', handleTouchMove);
      grid.removeEventListener('touchend', handleTouchEnd);
      grid.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [getHandFromPoint, useLongPress]);

  return (
    <div className="lg:p-2 lg:bg-felt-surface lg:rounded-xl lg:border lg:border-felt-border lg:shadow-sm">
    <div 
      ref={gridRef}
      className="grid rounded-sm overflow-hidden transitions-enabled touch-none"
      style={{
        gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(13, minmax(0, 1fr))',
      }}
    >
      {RANKS.map((_, rowIndex) =>
        RANKS.map((_, colIndex) => {
          const hand = getHandName(rowIndex, colIndex);
          const userAction = userSelections[hand] ?? null;
          const correctAction = correctRange?.[hand];
          const isInCategoryPreview = categoryPreviewHands?.has(hand) ?? false;
          const isCategoryPreviewFloor = categoryPreviewFloor === hand;
          const isBlackCell = correctAction === 'black';
          const opponentAction = overlayRangeData && userAction === null && !isBlackCell ? overlayRangeData[hand] : undefined;
          const overlayAction: HandAction | undefined =
            opponentAction && opponentAction !== 'black' ? opponentAction : undefined;

          return (
            <HandCell
              key={hand}
              hand={hand}
              userAction={userAction}
              correctAction={correctAction}
              isSubmitted={isSubmitted}
              isPainting={isPainting}
              selectedAction={selectedAction}
              onPaint={onPaint}
              onPaintStart={onPaintStart}
              displayAction={showCorrectAnswers ? correctRange?.[hand] : undefined}
              blendMode={blendMode}
              onPointerDown={useLongPress ? handlePointerDown : undefined}
              onPointerUp={useLongPress ? handlePointerUp : undefined}
              onMouseEnterCell={useLongPress ? handleMouseEnterCell : undefined}
              isInCategoryPreview={isInCategoryPreview}
              isCategoryPreviewFloor={isCategoryPreviewFloor}
              overlayAction={overlayAction}
              isDimmed={dimmedHands?.has(hand) ?? false}
            />
          );
        })
      )}
    </div>
    </div>
  );
}

export default RangeChart;
