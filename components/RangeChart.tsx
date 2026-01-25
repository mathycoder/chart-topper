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
}: RangeChartProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  // Track the last touched hand to avoid re-painting the same cell
  const lastTouchedHandRef = useRef<string | null>(null);
  // Track if we're actively in a touch paint session
  const isTouchPaintingRef = useRef(false);
  
  // Store callbacks in refs so event listeners always have latest values
  const onPaintRef = useRef(onPaint);
  const onPaintStartRef = useRef(onPaintStart);
  const isSubmittedRef = useRef(isSubmitted);
  const selectedActionRef = useRef(selectedAction);
  const blendModeRef = useRef(blendMode);
  
  useEffect(() => {
    onPaintRef.current = onPaint;
    onPaintStartRef.current = onPaintStart;
    isSubmittedRef.current = isSubmitted;
    selectedActionRef.current = selectedAction;
    blendModeRef.current = blendMode;
  }, [onPaint, onPaintStart, isSubmitted, selectedAction, blendMode]);

  /**
   * Get the hand name from an element at a given point.
   * Looks for the data-hand attribute on the element or its parent.
   */
  const getHandFromPoint = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    
    // Check the element itself
    const handCell = element.closest('[data-hand]');
    if (handCell) {
      return handCell.getAttribute('data-hand');
    }
    return null;
  }, []);

  /**
   * Set up non-passive touch event listeners.
   * React's synthetic events are passive by default, which prevents preventDefault() 
   * from blocking iOS Safari's edge swipe gesture. Using native addEventListener with
   * { passive: false } ensures we can actually prevent the gesture.
   */
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleTouchStart = (e: TouchEvent) => {
      const canPaint = !isSubmittedRef.current && (selectedActionRef.current || blendModeRef.current);
      if (!canPaint) return;
      
      const touch = e.touches[0];
      const hand = getHandFromPoint(touch.clientX, touch.clientY);
      
      if (hand) {
        e.preventDefault(); // Prevent scrolling while painting
        isTouchPaintingRef.current = true;
        lastTouchedHandRef.current = hand;
        onPaintStartRef.current(hand);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchPaintingRef.current) return;
      
      e.preventDefault(); // Prevent scrolling while painting
      
      if (isSubmittedRef.current || !selectedActionRef.current) return;
      
      const touch = e.touches[0];
      const hand = getHandFromPoint(touch.clientX, touch.clientY);
      
      if (hand && hand !== lastTouchedHandRef.current) {
        lastTouchedHandRef.current = hand;
        onPaintRef.current(hand);
      }
    };

    const handleTouchEnd = () => {
      isTouchPaintingRef.current = false;
      lastTouchedHandRef.current = null;
    };

    // Add listeners with { passive: false } to allow preventDefault()
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
  }, [getHandFromPoint]);

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
            />
          );
        })
      )}
    </div>
  );
}

export default RangeChart;
