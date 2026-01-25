'use client';

import type { SimpleAction, QuizAction, BlendType } from '@/types';

interface ActionPaletteProps {
  /** The currently selected action */
  selectedAction: SimpleAction | QuizAction | null;
  /** Callback when an action is selected */
  onSelectAction: (action: SimpleAction) => void;
  /** Whether selection is disabled (after submission) */
  disabled?: boolean;
  /** Mode: 'builder' shows Blend button, 'quiz' shows blend type buttons */
  mode?: 'builder' | 'quiz';
  /** Callback when blend button is clicked (builder mode) */
  onBlendClick?: () => void;
  /** Callback when a blend type is selected (quiz mode) */
  onSelectBlendType?: (blendType: BlendType) => void;
  /** Whether the blend button/types should be shown */
  showBlendOptions?: boolean;
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
  { 
    action: 'shove' as SimpleAction, 
    label: 'Shove', 
    color: 'bg-action-shove', 
    hoverColor: 'hover:bg-action-shove-hover' 
  },
];

const BLEND_TYPES: { type: BlendType; label: string; colors: string[] }[] = [
  { type: 'raise-call', label: 'R/C', colors: ['bg-action-raise', 'bg-action-call'] },
  { type: 'raise-fold', label: 'R/F', colors: ['bg-action-raise', 'bg-action-fold'] },
  { type: 'call-fold', label: 'C/F', colors: ['bg-action-call', 'bg-action-fold'] },
  { type: 'raise-call-fold', label: 'R/C/F', colors: ['bg-action-raise', 'bg-action-call', 'bg-action-fold'] },
];

/**
 * Palette of action buttons for selecting the painting brush.
 * 
 * Builder mode: Shows Raise, Call, Fold + Blend button
 * Quiz mode: Shows Raise, Call, Fold + blend type buttons (R/C, R/F, etc.)
 */
export function ActionPalette({
  selectedAction,
  onSelectAction,
  disabled = false,
  mode = 'builder',
  onBlendClick,
  onSelectBlendType,
  showBlendOptions = false,
}: ActionPaletteProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Simple actions - 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ action, label, color, hoverColor }) => {
          const isSelected = selectedAction === action;
          
          return (
            <button
              key={action}
              onClick={() => onSelectAction(action)}
              disabled={disabled}
              className={`
                flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                font-medium text-white text-sm
                transition-all duration-150
                ${color}
                ${!disabled ? hoverColor : ''}
                ${isSelected 
                  ? 'ring-2 ring-offset-2 ring-slate-900' 
                  : 'opacity-60'
                }
                ${disabled 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer'
                }
              `}
            >
              <span 
                className={`
                  w-3 h-3 rounded-full border-2 border-white flex-shrink-0
                  ${isSelected ? 'bg-white' : 'bg-transparent'}
                `}
              />
              {label}
            </button>
          );
        })}
      </div>

      {/* Builder mode: Blend button */}
      {mode === 'builder' && showBlendOptions && onBlendClick && (
        <>
          <div className="border-t border-slate-200 pt-3 mt-1">
            <span className="text-sm font-medium text-slate-600 mb-2 block">Mixed Strategy</span>
            <button
              onClick={onBlendClick}
              disabled={disabled}
              className={`
                w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                font-medium text-slate-700 text-sm
                transition-all duration-150
                bg-gradient-to-r from-action-raise via-action-call to-action-fold
                ${!disabled ? 'hover:opacity-90' : ''}
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
            >
              <span className="bg-white/90 px-2 py-0.5 rounded text-slate-800">Blend</span>
            </button>
          </div>
        </>
      )}

      {/* Quiz mode: Blend type buttons */}
      {mode === 'quiz' && showBlendOptions && onSelectBlendType && (
        <>
          <div className="border-t border-slate-200 pt-3 mt-1">
            <span className="text-sm font-medium text-slate-600 mb-2 block">Mixed Strategies</span>
            <div className="grid grid-cols-2 gap-2">
              {BLEND_TYPES.map(({ type, label, colors }) => {
                const isSelected = selectedAction === type;
                
                return (
                  <button
                    key={type}
                    onClick={() => onSelectBlendType(type)}
                    disabled={disabled}
                    className={`
                      flex items-center justify-center gap-1 px-3 py-2 rounded-lg
                      font-medium text-white text-sm
                      transition-all duration-150
                      ${isSelected 
                        ? 'ring-2 ring-offset-2 ring-slate-900' 
                        : 'opacity-70'
                      }
                      ${disabled 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:opacity-90'
                      }
                    `}
                    style={{
                      background: colors.length === 2
                        ? `linear-gradient(to right, var(--color-${colors[0].replace('bg-', '')}) 50%, var(--color-${colors[1].replace('bg-', '')}) 50%)`
                        : `linear-gradient(to right, var(--color-${colors[0].replace('bg-', '')}) 33.3%, var(--color-${colors[1].replace('bg-', '')}) 33.3%, var(--color-${colors[1].replace('bg-', '')}) 66.6%, var(--color-${colors[2].replace('bg-', '')}) 66.6%)`
                    }}
                  >
                    <span className="bg-white/90 px-1.5 py-0.5 rounded text-slate-800 text-xs font-bold">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ActionPalette;
