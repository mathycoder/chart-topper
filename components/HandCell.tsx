'use client';

import type { SimpleAction, HandAction } from '@/types';
import { isSimpleAction } from '@/types';

interface HandCellProps {
  /** The hand combination name (e.g., "AKs", "AA", "T9o") */
  hand: string;
  /** The user's current selection for this cell */
  userAction: SimpleAction | null;
  /** The correct answer (only shown after submission) */
  correctAction?: HandAction;
  /** Whether the quiz has been submitted */
  isSubmitted: boolean;
  /** Whether the user is currently painting (dragging) */
  isPainting: boolean;
  /** The currently selected brush action */
  selectedAction: SimpleAction | null;
  /** Callback when this cell should be painted */
  onPaint: (hand: string) => void;
  /** Callback when painting starts on this cell */
  onPaintStart: (hand: string) => void;
}

/**
 * Individual cell in the poker range chart.
 * 
 * Handles:
 * - Displaying the hand name
 * - Showing the painted color (raise/call/fold/empty)
 * - Click and drag-to-paint interactions
 * - Correct/incorrect indicators after submission
 */
export function HandCell({
  hand,
  userAction,
  correctAction,
  isSubmitted,
  isPainting,
  selectedAction,
  onPaint,
  onPaintStart,
}: HandCellProps) {
  // Determine if user's answer is correct (only relevant after submission)
  const isCorrect = isSubmitted && correctAction
    ? isSimpleAction(correctAction)
      ? userAction === correctAction
      : false // For blended actions, we'll handle this differently later
    : null;

  // Get background color based on state
  const getBackgroundColor = () => {
    if (!userAction) return 'bg-cell-empty';
    
    switch (userAction) {
      case 'raise': return 'bg-action-raise';
      case 'call': return 'bg-action-call';
      case 'fold': return 'bg-action-fold';
      default: return 'bg-cell-empty';
    }
  };

  // Get text color (white for colored backgrounds, dark for empty)
  const getTextColor = () => {
    return userAction ? 'text-white' : 'text-slate-700';
  };

  // Handle mouse down - start painting
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    if (!isSubmitted && selectedAction) {
      onPaintStart(hand);
    }
  };

  // Handle mouse enter while dragging
  const handleMouseEnter = () => {
    if (isPainting && !isSubmitted && selectedAction) {
      onPaint(hand);
    }
  };

  return (
    <div
      className={`
        hand-cell
        relative flex items-center justify-center
        w-full aspect-square
        text-xs sm:text-sm font-medium
        rounded-sm cursor-pointer
        border border-slate-200
        select-none
        ${getBackgroundColor()}
        ${getTextColor()}
        ${!isSubmitted && selectedAction ? 'hover:opacity-80' : ''}
        ${isSubmitted ? 'cursor-default' : ''}
      `}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
    >
      {/* Hand name */}
      <span className="relative z-10">{hand}</span>

      {/* Correct/Incorrect indicator overlay */}
      {isSubmitted && isCorrect !== null && (
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            rounded-sm
            ${isCorrect 
              ? 'bg-cell-correct/20' 
              : 'bg-cell-incorrect/30 animate-pulse'
            }
          `}
        >
          <span className="absolute top-0.5 right-0.5 text-[10px]">
            {isCorrect ? '✓' : '✗'}
          </span>
        </div>
      )}
    </div>
  );
}

export default HandCell;
