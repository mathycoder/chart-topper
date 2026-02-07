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
  /** When set, single tap = category preview, double tap = apply (tap-vs-drag detection enabled) */
  onCellTap?: (hand: string) => void;
  /** Set of hands currently in category preview (glow border) */
  categoryPreviewHands?: Set<string> | null;
  /** Hand that is the "floor" of the category preview (thicker border) */
  categoryPreviewFloor?: string | null;
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
  onCellTap,
  categoryPreviewHands = null,
  categoryPreviewFloor = null,
}: RangeChartProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  // Track the last touched hand to avoid re-painting the same cell
  const lastTouchedHandRef = useRef<string | null>(null);
  // Track if we're actively in a touch paint session
  const isTouchPaintingRef = useRef(false);
  // Tap-vs-drag: when onCellTap is provided, defer paint start until pointer moves to another cell
  const pointerDownHandRef = useRef<string | null>(null);
  const pointerMovedRef = useRef(false);
  const touchStartHandRef = useRef<string | null>(null);
  const touchMovedRef = useRef(false);

  // Store callbacks in refs so event listeners always have latest values
  const onPaintRef = useRef(onPaint);
  const onPaintStartRef = useRef(onPaintStart);
  const onCellTapRef = useRef(onCellTap);
  const isSubmittedRef = useRef(isSubmitted);
  const selectedActionRef = useRef(selectedAction);
  const blendModeRef = useRef(blendMode);

  useEffect(() => {
    onPaintRef.current = onPaint;
    onPaintStartRef.current = onPaintStart;
    onCellTapRef.current = onCellTap;
    isSubmittedRef.current = isSubmitted;
    selectedActionRef.current = selectedAction;
    blendModeRef.current = blendMode;
  }, [onPaint, onPaintStart, onCellTap, isSubmitted, selectedAction, blendMode]);

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

  const useTapDetection = Boolean(onCellTap);

  const handlePointerDown = useCallback((hand: string) => {
    pointerDownHandRef.current = hand;
    pointerMovedRef.current = false;
    // Paint the cell immediately on pointer down; tap (pointer up on same cell) will then show category preview
    onPaintStartRef.current(hand);
  }, []);

  const handlePointerUp = useCallback((hand: string) => {
    if (pointerDownHandRef.current === hand && !pointerMovedRef.current) {
      onCellTapRef.current?.(hand);
    }
    pointerDownHandRef.current = null;
    pointerMovedRef.current = false;
  }, []);

  const handleMouseEnterCell = useCallback((hand: string) => {
    if (pointerDownHandRef.current !== null && hand !== pointerDownHandRef.current) {
      onPaintRef.current(hand);
      pointerDownHandRef.current = null;
      pointerMovedRef.current = true;
    } else if (pointerMovedRef.current && !isSubmittedRef.current && selectedActionRef.current) {
      onPaintRef.current(hand);
    }
  }, []);

  /**
   * Set up non-passive touch event listeners.
   * When onCellTap is provided, touchstart does not paint immediately; we detect tap vs drag.
   */
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

      if (useTapDetection && onCellTapRef.current) {
        touchStartHandRef.current = hand;
        touchMovedRef.current = false;
        onPaintStartRef.current(hand);
        return;
      }

      isTouchPaintingRef.current = true;
      lastTouchedHandRef.current = hand;
      onPaintStartRef.current(hand);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (useTapDetection && touchStartHandRef.current !== null) {
        e.preventDefault();
        const touch = e.touches[0];
        const hand = getHandFromPoint(touch.clientX, touch.clientY);
        if (hand && hand !== touchStartHandRef.current) {
          onPaintRef.current(hand);
          touchStartHandRef.current = null;
          touchMovedRef.current = true;
          isTouchPaintingRef.current = true;
          lastTouchedHandRef.current = hand;
        }
        return;
      }

      if (!isTouchPaintingRef.current) return;
      e.preventDefault();
      if (isSubmittedRef.current || !selectedActionRef.current) return;
      const touch = e.touches[0];
      const hand = getHandFromPoint(touch.clientX, touch.clientY);
      if (hand && hand !== lastTouchedHandRef.current) {
        lastTouchedHandRef.current = hand;
        onPaintRef.current(hand);
      }
    };

    const handleTouchEnd = () => {
      if (useTapDetection && touchStartHandRef.current !== null && !touchMovedRef.current) {
        onCellTapRef.current?.(touchStartHandRef.current);
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
  }, [getHandFromPoint, useTapDetection]);

  return (
    <div 
      ref={gridRef}
      className="grid rounded-sm shadow-inner overflow-hidden transitions-enabled touch-none"
      style={{
        gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(13, minmax(0, 1fr))',
      }}
    >
      {RANKS.map((_, rowIndex) =>
        RANKS.map((_, colIndex) => {
          const hand = getHandName(rowIndex, colIndex);
          const userAction = userSelections[hand] ?? null;
          const isInCategoryPreview = categoryPreviewHands?.has(hand) ?? false;
          const isCategoryPreviewFloor = categoryPreviewFloor === hand;

          return (
            <HandCell
              key={hand}
              hand={hand}
              userAction={userAction}
              correctAction={correctRange?.[hand]}
              isSubmitted={isSubmitted}
              isPainting={isPainting}
              selectedAction={selectedAction}
              onPaint={onPaint}
              onPaintStart={onPaintStart}
              displayAction={showCorrectAnswers ? correctRange?.[hand] : undefined}
              blendMode={blendMode}
              onPointerDown={useTapDetection ? handlePointerDown : undefined}
              onPointerUp={useTapDetection ? handlePointerUp : undefined}
              onMouseEnterCell={useTapDetection ? handleMouseEnterCell : undefined}
              isInCategoryPreview={isInCategoryPreview}
              isCategoryPreviewFloor={isCategoryPreviewFloor}
            />
          );
        })
      )}
    </div>
  );
}

export default RangeChart;
