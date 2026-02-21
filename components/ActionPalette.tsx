'use client';

import type { SimpleAction, QuizAction, BlendType } from '@/types';

interface ActionPaletteBaseProps {
  /** Whether selection is disabled (after submission) */
  disabled?: boolean;
  /** Whether the blend button/types should be shown */
  showBlendOptions?: boolean;
}

interface ActionPaletteSingleSelectProps extends ActionPaletteBaseProps {
  /** Mode: 'builder' for single-select with blend button */
  mode: 'builder';
  /** The currently selected action */
  selectedAction: SimpleAction | QuizAction | null;
  /** Callback when an action is selected */
  onSelectAction: (action: SimpleAction) => void;
  /** Callback when blend button is clicked (builder mode) */
  onBlendClick?: () => void;
  // Multi-select props not used
  selectedActions?: never;
  onToggleAction?: never;
}

interface ActionPaletteMultiSelectProps extends ActionPaletteBaseProps {
  /** Mode: 'quiz' for multi-select */
  mode: 'quiz';
  /** Currently selected actions (supports multi-select for blends) */
  selectedActions: Set<SimpleAction>;
  /** Callback when action selection is toggled (multi-select mode) */
  onToggleAction: (action: SimpleAction) => void;
  /** Callback when action is selected (single-select mode) */
  onSelectAction: (action: SimpleAction) => void;
  /** Whether multi-select mode is active */
  multiSelectMode: boolean;
  /** Callback when multi-select toggle is clicked */
  onMultiToggle: () => void;
  // Single-select props not used
  selectedAction?: never;
  onBlendClick?: never;
}

type ActionPaletteProps = ActionPaletteSingleSelectProps | ActionPaletteMultiSelectProps;

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

/**
 * Palette of action buttons for selecting the painting brush.
 * 
 * Builder mode: Single-select with Raise, Call, Fold, Shove + Blend button
 * Quiz mode: Multi-select - click to toggle actions, multiple = blend
 */
export function ActionPalette(props: ActionPaletteProps) {
  const { disabled = false, showBlendOptions = false, mode } = props;
  
  // Quiz mode - supports both single-select and multi-select
  if (mode === 'quiz') {
    const { selectedActions, onToggleAction, onSelectAction, multiSelectMode, onMultiToggle } = props;
    
    const handleActionClick = (action: SimpleAction) => {
      if (multiSelectMode) {
        onToggleAction(action);
      } else {
        onSelectAction(action);
      }
    };
    
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ action, label, color, hoverColor }) => {
            const isSelected = selectedActions.has(action);
            
            return (
              <button
                key={action}
                onClick={() => handleActionClick(action)}
                disabled={disabled}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                  font-medium text-white text-sm
                  transition-all duration-150
                  ${color}
                  ${!disabled ? hoverColor : ''}
                  ${isSelected 
                    ? 'ring-2 ring-offset-2 ring-offset-felt-surface ring-gold' 
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
        
        {/* Multi-select toggle button */}
        <button
          onClick={onMultiToggle}
          disabled={disabled}
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
            font-medium text-sm
            transition-all duration-150
            ${multiSelectMode 
              ? 'bg-felt-muted text-cream ring-2 ring-offset-2 ring-offset-felt-surface ring-gold' 
              : 'bg-felt-elevated text-cream-muted hover:bg-felt-muted hover:text-cream'
            }
            ${disabled 
              ? 'cursor-not-allowed opacity-50' 
              : 'cursor-pointer'
            }
          `}
        >
          Multi
        </button>
      </div>
    );
  }
  
  // Builder mode - single-select
  const { selectedAction, onSelectAction, onBlendClick } = props;
  
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
                  ? 'ring-2 ring-offset-2 ring-offset-felt-surface ring-gold' 
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
      {showBlendOptions && onBlendClick && (
        <div className="border-t border-felt-border pt-3 mt-1">
          <span className="text-sm font-medium text-cream-muted mb-2 block">Mixed Strategy</span>
          <button
            onClick={onBlendClick}
            disabled={disabled}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              font-medium text-cream text-sm
              transition-all duration-150
              bg-gradient-to-r from-action-raise via-action-call to-action-fold
              ${!disabled ? 'hover:opacity-90' : ''}
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            <span className="bg-felt-bg/80 px-2 py-0.5 rounded text-cream">Blend</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionPalette;
