'use client';

import { useState, useRef, useEffect } from 'react';
import type { SimpleAction, HandAction, BlendedAction, QuizAction } from '@/types';
import { isSimpleAction, isBlendType, getBlendType, getPrimaryAction } from '@/types';
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
  /** When set, called on pointer down instead of onPaintStart (tap-vs-drag detection) */
  onPointerDown?: (hand: string) => void;
  /** When set, called on pointer up (for tap detection) */
  onPointerUp?: (hand: string) => void;
  /** When set, called on mouse enter (for drag detection when using tap) */
  onMouseEnterCell?: (hand: string) => void;
  /** Whether this cell is in the category preview range (glow border) */
  isInCategoryPreview?: boolean;
  /** Whether this cell is the category preview floor (thicker border) */
  isCategoryPreviewFloor?: boolean;
  /** Context overlay on empty cells (e.g. opponent RFI range when "Assume Open" is on; simple or blended) */
  overlayAction?: HandAction | null;
  /** When true, overlays white at 45% to show a lighter/dimmed version of the cell color (start range in Delta Mode) */
  isDimmed?: boolean;
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
  onPointerDown,
  onPointerUp,
  onMouseEnterCell,
  isInCategoryPreview = false,
  isCategoryPreviewFloor = false,
  overlayAction = null,
  isDimmed = false,
}: HandCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  
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
      // Check if it's a blend type (includes raise-call, raise-shove, etc.)
      if (isBlendType(actionToDisplay)) {
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
    if (blendType.includes('shove')) colors.push(ACTION_COLORS.shove);

    if (colors.length === 2) {
      return { background: `linear-gradient(to right, ${colors[0]} 50%, ${colors[1]} 50%)` };
    }
    if (colors.length === 3) {
      return { background: `linear-gradient(to right, ${colors[0]} 33.3%, ${colors[1]} 33.3%, ${colors[1]} 66.6%, ${colors[2]} 66.6%)` };
    }
    if (colors.length === 4) {
      return { background: `linear-gradient(to right, ${colors[0]} 25%, ${colors[1]} 25%, ${colors[1]} 50%, ${colors[2]} 50%, ${colors[2]} 75%, ${colors[3]} 75%)` };
    }
    return {};
  };

  // Get background class for simple actions
  const getBackgroundClass = () => {
    if (!actionToDisplay) return 'bg-cell-empty';
    // If it's a BlendedAction object, no class needed - inline style handles the gradient
    if (typeof actionToDisplay !== 'string') return '';
    // If it's a blend type string (quiz mode), no class needed - inline style handles it
    if (isBlendType(actionToDisplay)) return '';
    
    switch (actionToDisplay) {
      case 'raise': return 'bg-action-raise';
      case 'call': return 'bg-action-call';
      case 'fold': return 'bg-action-fold';
      case 'shove': return 'bg-action-shove';
      case 'black': return 'bg-action-black';
      default: return 'bg-cell-empty';
    }
  };

  // Get text color (white for colored backgrounds, cream for empty)
  const getTextColor = () => {
    return actionToDisplay ? 'text-white' : 'text-cream';
  };

  // Handle mouse down - start painting or report pointer down for tap detection
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isBlackCell) return;
    if (!isSubmitted && (selectedAction || blendMode)) {
      if (onPointerDown) {
        onPointerDown(hand);
      } else {
        onPaintStart(hand);
      }
    }
  };

  const handlePointerUp = () => {
    if (onPointerUp) onPointerUp(hand);
    if (isSubmitted && isCorrect === false) setIsHovered(true);
  };

  // Close popover when tapping outside (mobile: tap elsewhere)
  useEffect(() => {
    if (!isHovered || !cellRef.current) return;
    const closeIfOutside = (e: PointerEvent) => {
      if (cellRef.current && !cellRef.current.contains(e.target as Node)) {
        setIsHovered(false);
      }
    };
    document.addEventListener('pointerdown', closeIfOutside);
    return () => document.removeEventListener('pointerdown', closeIfOutside);
  }, [isHovered]);

  // Handle mouse enter while dragging or for hover state
  const handleMouseEnter = () => {
    if (isBlackCell) return;
    if (onMouseEnterCell) {
      onMouseEnterCell(hand);
    } else if (isPainting && !isSubmitted && selectedAction) {
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
      ref={cellRef}
      className={`
        hand-cell
        relative flex items-center justify-center
        w-full aspect-square
        text-xs sm:text-sm font-medium
        cursor-pointer
        border-r border-b border-felt-border/50 lg:border lg:border-felt-border
        select-none
        ${getBackgroundClass()}
        ${getTextColor()}
        ${!isSubmitted && !isBlackCell && (selectedAction || blendMode) ? 'hover:opacity-80' : ''}
        ${isSubmitted || isBlackCell ? 'cursor-default' : ''}
        ${isCategoryPreviewFloor ? 'ring-[3px] lg:ring-4 ring-amber-500 ring-inset shadow-[0_0_6px_rgba(245,158,11,0.5)] lg:shadow-[0_0_12px_rgba(245,158,11,0.6)]' : isInCategoryPreview ? 'ring-2 lg:ring-[3px] ring-amber-500/90 ring-inset shadow-[0_0_4px_rgba(245,158,11,0.35)] lg:shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}
      `}
      style={getBackgroundStyle()}
      data-hand={hand}
      onMouseDown={handleMouseDown}
      onPointerUp={handlePointerUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Context overlay: opponent opening range on empty cells (e.g. Assume UTG Open) */}
      {userAction === null && !isBlackCell && overlayAction && (
        <>
          {isSimpleAction(overlayAction) ? (
            <div
              className="absolute inset-0 rounded-sm pointer-events-none"
              style={{
                backgroundColor: ACTION_COLORS[overlayAction as keyof typeof ACTION_COLORS] ?? ACTION_COLORS.fold,
                opacity: 0.65,
              }}
              aria-hidden
            />
          ) : (
            <div
              className="absolute inset-0 rounded-sm pointer-events-none"
              style={{ background: buildBlendedGradient(overlayAction), opacity: 0.65 }}
              aria-hidden
            />
          )}
          <div className="absolute inset-0 rounded-sm bg-black/35 pointer-events-none" aria-hidden />
        </>
      )}
      {/* Delta Mode dim overlay: white wash to show start range in lighter colors */}
      {isDimmed && actionToDisplay && actionToDisplay !== 'black' && (
        <div className="absolute inset-0 bg-black/35 pointer-events-none z-1" aria-hidden />
      )}
      {/* Category preview floor: gentle pulsing overlay */}
      {isCategoryPreviewFloor && (
        <div
          className="absolute inset-0 rounded-sm bg-amber-400/30 pointer-events-none animate-pulse"
          aria-hidden
        />
      )}
      {/* Hand name */}
      <span className="relative z-20 drop-shadow-sm">{hand}</span>

      {/* Wrong-answer indicator: white X only. Correct cells get no marker. */}
      {isSubmitted && isCorrect === false && (
        <span
          className="absolute top-0.5 right-0.5 text-[10px] text-white drop-shadow-lg pointer-events-none z-20"
          aria-label="Incorrect"
        >
          ✗
        </span>
      )}

      {/* Popover showing correct answer on hover (portaled so it appears above grid) */}
      {showPopover && (
        <CorrectActionPopover
          correctAction={correctAction}
          userAnswer={String(userAction)}
          isHalfCredit={isHalfCredit}
          position="top"
          triggerRef={cellRef}
        />
      )}
    </div>
  );
}

export default HandCell;
