'use client';

import type { SimpleAction } from '@/types';

interface ActionPaletteProps {
  /** The currently selected action */
  selectedAction: SimpleAction | null;
  /** Callback when an action is selected */
  onSelectAction: (action: SimpleAction) => void;
  /** Whether selection is disabled (after submission) */
  disabled?: boolean;
}

const ACTIONS: { action: SimpleAction; label: string; color: string; hoverColor: string }[] = [
  { 
    action: 'raise', 
    label: 'Raise', 
    color: 'bg-action-raise', 
    hoverColor: 'hover:bg-action-raise-hover' 
  },
  { 
    action: 'call', 
    label: 'Call', 
    color: 'bg-action-call', 
    hoverColor: 'hover:bg-action-call-hover' 
  },
  { 
    action: 'fold', 
    label: 'Fold', 
    color: 'bg-action-fold', 
    hoverColor: 'hover:bg-action-fold-hover' 
  },
];

/**
 * Palette of action buttons for selecting the painting brush.
 * 
 * Shows three swatches: Raise (red), Call (green), Fold (blue).
 * The selected action is visually indicated with a ring.
 */
export function ActionPalette({
  selectedAction,
  onSelectAction,
  disabled = false,
}: ActionPaletteProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-slate-600">Select Action</span>
      <div className="flex gap-3">
        {ACTIONS.map(({ action, label, color, hoverColor }) => {
          const isSelected = selectedAction === action;
          
          return (
            <button
              key={action}
              onClick={() => onSelectAction(action)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                font-medium text-white text-sm
                transition-all duration-150
                ${color}
                ${!disabled ? hoverColor : ''}
                ${isSelected 
                  ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' 
                  : 'opacity-70'
                }
                ${disabled 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer'
                }
              `}
            >
              <span 
                className={`
                  w-4 h-4 rounded-full border-2 border-white
                  ${isSelected ? 'bg-white' : 'bg-transparent'}
                `}
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ActionPalette;
