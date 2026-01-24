'use client';

import type { HandAction, BlendedAction } from '@/types';
import { isSimpleAction, getPrimaryAction, getBlendType } from '@/types';

interface CorrectActionPopoverProps {
  /** The correct action to display */
  correctAction: HandAction;
  /** What the user answered */
  userAnswer: string;
  /** Whether user got half credit */
  isHalfCredit?: boolean;
  /** Position relative to cell */
  position?: 'top' | 'bottom';
}

/**
 * Popover showing the correct action for a cell.
 * Displayed on hover over incorrect answers.
 */
export function CorrectActionPopover({
  correctAction,
  userAnswer,
  isHalfCredit = false,
  position = 'top',
}: CorrectActionPopoverProps) {
  const isBlended = !isSimpleAction(correctAction);
  const blendType = getBlendType(correctAction);
  const primaryAction = getPrimaryAction(correctAction);

  // Format blended action percentages
  const formatBlendedAction = (action: BlendedAction) => {
    const parts: string[] = [];
    if (action.raise && action.raise > 0) parts.push(`Raise: ${action.raise}%`);
    if (action.call && action.call > 0) parts.push(`Call: ${action.call}%`);
    if (action.fold && action.fold > 0) parts.push(`Fold: ${action.fold}%`);
    return parts;
  };

  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      className={`
        absolute left-1/2 -translate-x-1/2 z-50
        ${positionClasses}
        w-40 p-2.5 
        bg-white rounded-lg shadow-xl border border-slate-200
        text-xs
        pointer-events-none
      `}
    >
      {/* Arrow */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2
          ${position === 'top' ? 'top-full -mt-1' : 'bottom-full mb-1'}
          w-0 h-0
          border-l-[6px] border-l-transparent
          border-r-[6px] border-r-transparent
          ${position === 'top' 
            ? 'border-t-[6px] border-t-white' 
            : 'border-b-[6px] border-b-white'
          }
        `}
      />
      
      <div className="font-semibold text-slate-800 mb-1.5">
        Correct Answer
      </div>
      
      {isBlended ? (
        <div className="space-y-1">
          {formatBlendedAction(correctAction as BlendedAction).map((line, i) => (
            <div key={i} className="text-slate-700">
              {line}
            </div>
          ))}
          <div className="text-slate-500 mt-1">
            ({blendType})
          </div>
        </div>
      ) : (
        <div className="text-slate-700 capitalize font-medium">
          {primaryAction}
        </div>
      )}

      <div className="border-t border-slate-100 mt-2 pt-2">
        <div className="text-slate-500">
          You selected: <span className="text-slate-700 font-medium capitalize">{userAnswer}</span>
        </div>
        {isHalfCredit && (
          <div className="text-amber-600 font-medium mt-1">
            (Half credit)
          </div>
        )}
      </div>
    </div>
  );
}

export default CorrectActionPopover;
