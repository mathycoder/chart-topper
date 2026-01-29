'use client';

import { useState } from 'react';
import type { SimpleAction, HandAction, BlendedAction, QuizAction } from '@/types';
import { isSimpleAction, getBlendType, getPrimaryAction } from '@/types';
import { CorrectActionPopover } from './CorrectActionPopover';

// Action colors for CSS
const ACTION_COLORS = {
  raise: 'var(--color-action-raise)',
  call: 'var(--color-action-call)',
  fold: 'var(--color-action-fold)',
  shove: 'var(--color-action-shove)',
  black: 'var(--color-action-black)',
};

interface HandCellProps {
  /** The hand combination name (e.g., "AKs", "AA", "T9o") */
  hand: string;
  /** The user's current selection for this cell (simple, blended, or quiz action) */
  userAction: HandAction | QuizAction | null;
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
  /** Action to display (overrides userAction for showing correct answers) */
  displayAction?: HandAction;
  /** Whether blend mode is active (responds to clicks without selectedAction) */
  blendMode?: boolean;
}

/**
 * Build a CSS gradient for a blended action.
 * Creates proportional color bands based on percentages.
 */
function buildBlendedGradient(action: BlendedAction): string {
  const segments: { color: string; percent: number }[] = [];
  
  // Add segments in consistent order: raise, call, fold, shove
  if (action.raise && action.raise > 0) {
    segments.push({ color: ACTION_COLORS.raise, percent: action.raise });
  }
  if (action.call && action.call > 0) {
    segments.push({ color: ACTION_COLORS.call, percent: action.call });
  }
  if (action.fold && action.fold > 0) {
    segments.push({ color: ACTION_COLORS.fold, percent: action.fold });
  }
  if (action.shove && action.shove > 0) {
    segments.push({ color: ACTION_COLORS.shove, percent: action.shove });
  }
  
  if (segments.length === 0) return 'var(--color-cell-empty)';
  if (segments.length === 1) return segments[0].color;
  
  // Build gradient stops
  let currentPercent = 0;
  const stops: string[] = [];
  
  for (const segment of segments) {
    stops.push(`${segment.color} ${currentPercent}%`);
    currentPercent += segment.percent;
    stops.push(`${segment.color} ${currentPercent}%`);
  }
  
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * Individual cell in the poker range chart.
 * 
 * Handles:
 * - Displaying the hand name
 * - Showing the painted color (raise/call/fold/empty)
 * - Showing blended actions with split colors (gradient)
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
  displayAction,
  blendMode = false,
}: HandCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if this cell is a 'black' cell (not in hero's range)
  const isBlackCell = correctAction === 'black';
  
  // Determine which action to display
  // For black cells, always show the black action from correctRange
  const actionToDisplay = isBlackCell ? 'black' : (displayAction ?? userAction);
  
  // Determine if user's answer is correct (only relevant after submission)
  const getCorrectness = (): boolean | null => {
    if (!isSubmitted || !correctAction) return null;
    
    // Black cells are always "correct" - they don't need user input
    if (isBlackCell) return null;
    
    if (isSimpleAction(correctAction)) {
      // Simple correct answer - needs exact match
      return userAction === correctAction;
    } else {
      // Blended correct answer - check blend type match or half credit for dominant
      const correctBlendType = getBlendType(correctAction);
      if (userAction === correctBlendType) {
        return true; // Full credit
      }
      // Check for half credit (user selected dominant action)
      const dominant = getPrimaryAction(correctAction);
      if (userAction === dominant) {
        return true; // Consider as correct for display (half credit handled in grading)
      }
      return false;
    }
  };
  
  const isCorrect = getCorrectness();

  // Get background style based on action
  const getBackgroundStyle = (): React.CSSProperties => {
    if (!actionToDisplay) return {};
    
    // Handle simple actions (string)
    if (typeof actionToDisplay === 'string') {
      // Check if it's a blend type
      if (['raise-call', 'raise-fold', 'call-fold', 'raise-call-fold'].includes(actionToDisplay)) {
        // This is a blend type from quiz selection - show as multi-color indicator
        return getBlendTypeStyle(actionToDisplay);
      }
      // Simple action - no inline style needed, use Tailwind class
      return {};
    }
    
    // Handle blended actions (object with percentages)
    return {
      background: buildBlendedGradient(actionToDisplay),
    };
  };
  
  // Get style for blend type quiz answers
  const getBlendTypeStyle = (blendType: string): React.CSSProperties => {
    const colors: string[] = [];
    if (blendType.includes('raise')) colors.push(ACTION_COLORS.raise);
    if (blendType.includes('call')) colors.push(ACTION_COLORS.call);
    if (blendType.includes('fold')) colors.push(ACTION_COLORS.fold);
    
    if (colors.length === 2) {
      return { background: `linear-gradient(to right, ${colors[0]} 50%, ${colors[1]} 50%)` };
    }
    if (colors.length === 3) {
      return { background: `linear-gradient(to right, ${colors[0]} 33.3%, ${colors[1]} 33.3%, ${colors[1]} 66.6%, ${colors[2]} 66.6%)` };
    }
    return {};
  };

  // Get background class for simple actions
  const getBackgroundClass = () => {
    if (!actionToDisplay) return 'bg-cell-empty';
    // If it's a BlendedAction object, no class needed - inline style handles the gradient
    if (typeof actionToDisplay !== 'string') return '';
    // If it's a blend type string (quiz mode), no class needed - inline style handles it
    if (['raise-call', 'raise-fold', 'call-fold', 'raise-call-fold'].includes(actionToDisplay)) return '';
    
    switch (actionToDisplay) {
      case 'raise': return 'bg-action-raise';
      case 'call': return 'bg-action-call';
      case 'fold': return 'bg-action-fold';
      case 'shove': return 'bg-action-shove';
      case 'black': return 'bg-action-black';
      default: return 'bg-cell-empty';
    }
  };

  // Get text color (white for colored backgrounds, dark for empty)
  const getTextColor = () => {
    return actionToDisplay ? 'text-white' : 'text-slate-700';
  };

  // Handle mouse down - start painting or open blend picker
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    // Don't allow painting on black cells (not in hero's range)
    if (isBlackCell) return;
    if (!isSubmitted && (selectedAction || blendMode)) {
      onPaintStart(hand);
    }
  };

  // Handle mouse enter while dragging or for hover state
  const handleMouseEnter = () => {
    // Don't allow painting on black cells
    if (isBlackCell) return;
    if (isPainting && !isSubmitted && selectedAction) {
      onPaint(hand);
    }
    if (isSubmitted) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Check if this was a half-credit answer (user got dominant action on blended)
  // Half credit: correct is blended, user selected dominant simple action (not the blend type)
  const computeHalfCredit = (): boolean => {
    if (!isSubmitted || !correctAction || isSimpleAction(correctAction)) return false;
    const dominant = getPrimaryAction(correctAction);
    const blendType = getBlendType(correctAction);
    // User selected the dominant simple action, not the blend type
    // Use String() to avoid TypeScript's overly strict comparison check
    return userAction === dominant && String(userAction) !== String(blendType);
  };
  const isHalfCredit = computeHalfCredit();

  // Show popover for wrong answers (including half credit) on hover
  const showPopover = isSubmitted && isHovered && correctAction && isCorrect === false && !displayAction;

  return (
    <div
      className={`
        hand-cell
        relative flex items-center justify-center
        w-full aspect-square
        text-xs sm:text-sm font-medium
        cursor-pointer
        border-r border-b border-slate-200/50 lg:border lg:border-slate-200
        select-none
        ${getBackgroundClass()}
        ${getTextColor()}
        ${!isSubmitted && !isBlackCell && (selectedAction || blendMode) ? 'hover:opacity-80' : ''}
        ${isSubmitted || isBlackCell ? 'cursor-default' : ''}
      `}
      style={getBackgroundStyle()}
      data-hand={hand}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hand name */}
      <span className="relative z-10 drop-shadow-sm">{hand}</span>

      {/* Correct/Incorrect indicator overlay */}
      {isSubmitted && isCorrect !== null && (
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            rounded-sm
            ${isCorrect 
              ? 'bg-cell-correct/20' 
              : isHalfCredit
                ? 'bg-amber-500/30'
                : 'bg-cell-incorrect/30 animate-pulse'
            }
          `}
        >
          <span className="absolute top-0.5 right-0.5 text-[10px]">
            {isCorrect ? '✓' : isHalfCredit ? '½' : '✗'}
          </span>
        </div>
      )}

      {/* Popover showing correct answer on hover */}
      {showPopover && (
        <CorrectActionPopover
          correctAction={correctAction}
          userAnswer={String(userAction)}
          isHalfCredit={isHalfCredit}
          position="top"
        />
      )}
    </div>
  );
}

export default HandCell;
