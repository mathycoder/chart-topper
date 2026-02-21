'use client';

import { useEffect } from 'react';
import type { SimpleAction, BlendType, Position, StackSize, Scenario } from '@/types';

// Dropdown data
const POSITIONS: { value: Position; label: string }[] = [
  { value: 'UTG', label: 'UTG' },
  { value: 'UTG+1', label: 'UTG+1' },
  { value: 'LJ', label: 'LJ' },
  { value: 'HJ', label: 'HJ' },
  { value: 'CO', label: 'CO' },
  { value: 'BTN', label: 'BTN' },
  { value: 'SB', label: 'SB' },
  { value: 'BB', label: 'BB' },
];

const POSITION_ORDER: Position[] = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function getValidOpponents(heroPosition: Position, scenario: Scenario): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  if (scenario === 'vs-raise' || scenario === 'vs-raise-call') return POSITION_ORDER.slice(0, heroIndex);
  if (scenario === 'vs-3bet') return POSITION_ORDER.filter((_, idx) => idx !== heroIndex);
  return [];
}

function getValidCallers(heroPosition: Position, raiserPosition: Position): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  const raiserIndex = POSITION_ORDER.indexOf(raiserPosition);
  return POSITION_ORDER.slice(raiserIndex + 1, heroIndex);
}

function getValidHeroPositions(scenario: Scenario): Position[] {
  if (scenario === 'vs-raise-call') {
    return POSITION_ORDER.slice(2);
  }
  if (scenario === 'vs-raise') {
    return POSITION_ORDER.slice(1);
  }
  return POSITION_ORDER;
}

const STACK_SIZES: { value: StackSize; label: string }[] = [
  { value: '80bb', label: '80bb' },
  { value: '50bb', label: '50bb' },
  { value: '25bb', label: '25bb' },
  { value: '15bb', label: '15bb' },
  { value: '10bb', label: '10bb' },
  { value: '5bb', label: '5bb' },
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'rfi', label: 'RFI' },
  { value: 'vs-raise', label: 'vs Raise' },
  { value: 'vs-raise-call', label: 'vs Raise + Call' },
  { value: 'vs-3bet', label: 'vs 3-Bet' },
];

// Dropdown props shared between quiz and builder
interface DropdownProps {
  position: Position;
  stackSize: StackSize;
  scenario: Scenario;
  opponent: Position | null;
  caller: Position | null;
  onPositionChange: (position: Position) => void;
  onStackSizeChange: (stackSize: StackSize) => void;
  onScenarioChange: (scenario: Scenario) => void;
  onOpponentChange: (opponent: Position | null) => void;
  onCallerChange: (caller: Position | null) => void;
}

interface MobileActionBarQuizProps {
  mode: 'quiz';
  /** Currently selected actions (supports multi-select for blends) */
  selectedActions: Set<SimpleAction>;
  /** Callback when action selection changes (multi-select mode) */
  onToggleAction: (action: SimpleAction) => void;
  /** Callback when action is selected (single-select mode) */
  onSelectAction: (action: SimpleAction) => void;
  /** Whether multi-select mode is active */
  multiSelectMode: boolean;
  /** Callback when multi-select toggle is clicked */
  onMultiToggle: () => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Submit button state */
  submitState: 'disabled' | 'ready' | 'submitted';
  /** Callback when submit is clicked */
  onSubmit: () => void;
  /** Callback when reset/try again is clicked */
  onReset: () => void;
  /** Callback when clear is clicked (reset grid to fold) */
  onClear?: () => void;
  /** Whether to show "Fill rest as fold" (vs Raise when there are empty cells) */
  showFillRestAsFold?: boolean;
  /** Number of empty cells (for Fill rest as fold label) */
  emptyCount?: number;
  /** Callback when Fill rest as fold is clicked */
  onFillRestAsFold?: () => void;
  /** Whether to show shove action (only for some scenarios) */
  showShove?: boolean;
}

interface MobileActionBarBuilderProps extends DropdownProps {
  mode: 'builder';
  /** Currently selected action (single select for builder) */
  selectedAction: SimpleAction | null;
  /** Callback when action is selected */
  onSelectAction: (action: SimpleAction) => void;
  /** Whether blend mode is active */
  blendMode?: boolean;
  /** Callback when blend button is clicked */
  onBlendClick?: () => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Whether save is enabled */
  canSave: boolean;
  /** Whether currently saving */
  isSaving?: boolean;
  /** Callback when clear is clicked */
  onClear: () => void;
  /** Callback when save is clicked */
  onSave: () => void;
  /** Whether to show shove action */
  showShove?: boolean;
}

type MobileActionBarProps = MobileActionBarQuizProps | MobileActionBarBuilderProps;

const ACTIONS: { action: SimpleAction; label: string; shortLabel: string; color: string }[] = [
  { action: 'raise', label: 'Raise', shortLabel: 'R', color: 'bg-action-raise' },
  { action: 'call', label: 'Call', shortLabel: 'C', color: 'bg-action-call' },
  { action: 'fold', label: 'Fold', shortLabel: 'F', color: 'bg-action-fold' },
  { action: 'shove', label: 'Shove', shortLabel: 'S', color: 'bg-action-shove' },
];

/**
 * Derive blend type from selected actions (order matches getBlendType in types)
 */
export function deriveBlendType(selected: Set<SimpleAction>): BlendType | null {
  if (selected.size < 2) return null;

  const has = (a: SimpleAction) => selected.has(a);

  if (has('raise') && has('call') && has('fold') && has('shove')) return 'raise-call-fold-shove';
  if (has('raise') && has('call') && has('shove')) return 'raise-call-shove';
  if (has('raise') && has('fold') && has('shove')) return 'raise-fold-shove';
  if (has('call') && has('fold') && has('shove')) return 'call-fold-shove';
  if (has('raise') && has('call') && has('fold')) return 'raise-call-fold';
  if (has('raise') && has('call')) return 'raise-call';
  if (has('raise') && has('fold')) return 'raise-fold';
  if (has('call') && has('fold')) return 'call-fold';
  if (has('raise') && has('shove')) return 'raise-shove';
  if (has('call') && has('shove')) return 'call-shove';
  if (has('fold') && has('shove')) return 'fold-shove';

  return null;
}

/**
 * Mobile fixed bottom action bar.
 * Quiz mode: multi-select support for blends
 * Builder mode: single select with blend mode toggle
 */
export function MobileActionBar(props: MobileActionBarProps) {
  const showShove = props.showShove ?? true;
  const actionsToShow = showShove ? ACTIONS : ACTIONS.filter(a => a.action !== 'shove');
  
  // Quiz mode
  if (props.mode === 'quiz') {
    const { 
      selectedActions, onToggleAction, onSelectAction, multiSelectMode, onMultiToggle,
      disabled = false, submitState, onSubmit, onReset, onClear,
      showFillRestAsFold = false, emptyCount = 0, onFillRestAsFold
    } = props;
    
    const handleActionClick = (action: SimpleAction) => {
      if (multiSelectMode) {
        onToggleAction(action);
      } else {
        onSelectAction(action);
      }
    };
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-felt-surface border-t border-felt-border px-3 pt-3 pb-safe z-40 lg:hidden">
        {/* Row 1: Action buttons + Multi toggle */}
        <div className="flex items-center gap-1.5 mb-2">
          {actionsToShow.map(({ action, label, color }) => {
            const isSelected = selectedActions.has(action);
            
            return (
              <button
                key={action}
                onClick={() => handleActionClick(action)}
                disabled={disabled}
                className={`
                  flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg
                  font-medium text-white text-xs
                  transition-all duration-150
                  ${color}
                  ${isSelected 
                    ? 'ring-2 ring-offset-1 ring-offset-felt-surface ring-gold opacity-100' 
                    : 'opacity-50'
                  }
                  ${disabled 
                    ? 'cursor-not-allowed opacity-30' 
                    : 'cursor-pointer active:scale-95'
                  }
                `}
              >
                <span 
                  className={`
                    w-2 h-2 rounded-full border-2 border-white flex-shrink-0
                    ${isSelected ? 'bg-white' : 'bg-transparent'}
                  `}
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
          
          {/* Multi toggle button */}
          <button
            onClick={onMultiToggle}
            disabled={disabled}
            className={`
              flex-1 flex items-center justify-center py-2 px-1 rounded-lg
              font-medium text-xs
              transition-all duration-150
              ${multiSelectMode 
                ? 'bg-felt-muted text-cream ring-2 ring-offset-1 ring-offset-felt-surface ring-gold' 
                : 'bg-felt-elevated text-cream-muted'
              }
              ${disabled 
                ? 'cursor-not-allowed opacity-30' 
                : 'cursor-pointer active:scale-95'
              }
            `}
          >
            Multi
          </button>
        </div>
        
        {/* Row 2: Clear + Submit / Try Again */}
        <div className="flex gap-2">
          {submitState === 'submitted' ? (
            <button
              onClick={onReset}
              className="w-full py-3 rounded-lg font-semibold text-sm text-cream bg-felt-elevated active:bg-felt-muted"
            >
              Try Again
            </button>
          ) : (
            <>
              {onClear && (
                <button
                  onClick={onClear}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm text-cream bg-felt-elevated active:bg-felt-muted"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onSubmit}
                disabled={submitState === 'disabled'}
                className={`
                  ${onClear ? 'flex-1' : 'w-full'} py-3 rounded-lg font-semibold text-sm
                  ${submitState === 'ready'
                    ? 'bg-gold text-felt-bg active:bg-gold-hover'
                    : 'bg-felt-elevated text-cream-muted cursor-not-allowed'
                  }
                `}
              >
                Submit
              </button>
            </>
          )}
        </div>

        {/* Row 3: Fill rest as fold (vs Raise only, when there are empty cells) */}
        {showFillRestAsFold && emptyCount > 0 && onFillRestAsFold && (
          <div className="pt-2 pb-2">
            <button
              onClick={onFillRestAsFold}
              title="Set all remaining empty cells to fold"
              className="w-full py-2 rounded-lg font-medium text-sm text-cream-muted bg-felt-elevated active:bg-felt-muted border border-felt-border"
            >
              Fill rest as fold ({emptyCount} left)
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // Builder mode
  const { 
    selectedAction, onSelectAction, blendMode = false, onBlendClick, disabled = false, 
    canSave, isSaving = false, onClear, onSave,
    position, stackSize, scenario, opponent, caller,
    onPositionChange, onStackSizeChange, onScenarioChange, onOpponentChange, onCallerChange
  } = props;
  
  // Filter valid hero positions based on scenario
  const validHeroPositions = getValidHeroPositions(scenario);
  const effectivePosition = validHeroPositions.includes(position) 
    ? position 
    : validHeroPositions[0];
  
  // Auto-correct position if needed
  useEffect(() => {
    if (effectivePosition !== position) {
      onPositionChange(effectivePosition);
    }
  }, [effectivePosition, position, onPositionChange]);
  
  const showOpponent = scenario !== 'rfi';
  const validOpponents = showOpponent ? getValidOpponents(position, scenario) : [];
  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;
  
  // Sync opponent if needed
  useEffect(() => {
    if (showOpponent && effectiveOpponent !== opponent) {
      onOpponentChange(effectiveOpponent);
    }
  }, [showOpponent, effectiveOpponent, opponent, onOpponentChange]);
  
  // Caller logic - only for vs-raise-call
  const showCaller = scenario === 'vs-raise-call';
  const validCallers = showCaller && effectiveOpponent 
    ? getValidCallers(position, effectiveOpponent) 
    : [];
  const effectiveCaller = showCaller && validCallers.length > 0
    ? (caller && validCallers.includes(caller) ? caller : validCallers[0])
    : null;
  
  // Sync caller if needed
  useEffect(() => {
    if (showCaller && effectiveCaller !== caller) {
      onCallerChange(effectiveCaller);
    }
  }, [showCaller, effectiveCaller, caller, onCallerChange]);
  
  // Clear caller when switching away from vs-raise-call
  useEffect(() => {
    if (!showCaller && caller !== null) {
      onCallerChange(null);
    }
  }, [showCaller, caller, onCallerChange]);
  
  const selectClasses = `
    px-2 py-1.5 rounded-md
    bg-felt-elevated border border-felt-border
    text-cream text-xs font-medium
    focus:outline-none focus:ring-1 focus:ring-gold
    disabled:opacity-50
    cursor-pointer
  `;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-felt-surface border-t border-felt-border px-3 pt-2 pb-safe z-40 lg:hidden">
      {/* Row 1: Action buttons */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1 flex-1">
          {actionsToShow.map(({ action, shortLabel, color }) => {
            const isSelected = !blendMode && selectedAction === action;
            
            return (
              <button
                key={action}
                onClick={() => onSelectAction(action)}
                disabled={disabled}
                className={`
                  flex-1 flex items-center justify-center py-2 px-1 rounded-lg
                  font-medium text-white text-xs
                  transition-all duration-150
                  ${color}
                  ${isSelected 
                    ? 'ring-2 ring-offset-1 ring-offset-felt-surface ring-gold opacity-100' 
                    : 'opacity-50'
                  }
                  ${disabled 
                    ? 'cursor-not-allowed opacity-30' 
                    : 'cursor-pointer active:scale-95'
                  }
                `}
              >
                {shortLabel}
              </button>
            );
          })}
          
          {onBlendClick && (
            <button
              onClick={onBlendClick}
              disabled={disabled}
              className={`
                flex-1 flex items-center justify-center py-2 px-1 rounded-lg
                font-medium text-xs
                bg-gradient-to-r from-action-raise via-action-call to-action-fold
                ${blendMode 
                  ? 'ring-2 ring-offset-1 ring-offset-felt-surface ring-gold' 
                  : 'opacity-70'
                }
                ${disabled 
                  ? 'cursor-not-allowed opacity-30' 
                  : 'cursor-pointer active:scale-95'
                }
              `}
            >
              <span className="bg-felt-bg/80 px-1 py-0.5 rounded text-cream text-xs font-bold">Mix</span>
            </button>
          )}
        </div>
        
        <button
          onClick={onClear}
          disabled={disabled}
          className="px-3 py-2 rounded-lg font-semibold text-xs text-cream bg-felt-elevated active:bg-felt-muted"
        >
          Clear
        </button>
        <button
          onClick={onSave}
          disabled={!canSave || isSaving}
          className={`
            px-3 py-2 rounded-lg font-semibold text-xs text-white
            ${canSave && !isSaving
              ? 'bg-green-600 active:bg-green-700'
              : 'bg-felt-elevated text-cream-muted cursor-not-allowed'
            }
          `}
        >
          {isSaving ? '...' : 'Save'}
        </button>
      </div>
      
      {/* Row 2: Dropdowns */}
      <div className="flex items-center gap-1.5 pb-2">
        <select
          value={position}
          onChange={(e) => onPositionChange(e.target.value as Position)}
          className={selectClasses}
        >
          {POSITIONS.filter(p => validHeroPositions.includes(p.value)).map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        
        {showOpponent && validOpponents.length > 0 && (
          <>
            <span className="text-cream-muted text-xs">vs</span>
            <select
              value={effectiveOpponent || ''}
              onChange={(e) => onOpponentChange(e.target.value as Position)}
              className={selectClasses}
            >
              {validOpponents.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </>
        )}
        
        {showCaller && validCallers.length > 0 && (
          <>
            <span className="text-cream-muted text-xs">+</span>
            <select
              value={effectiveCaller || ''}
              onChange={(e) => onCallerChange(e.target.value as Position)}
              className={selectClasses}
            >
              {validCallers.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </>
        )}
        
        <span className="text-cream-muted text-xs">|</span>
        
        <select
          value={stackSize}
          onChange={(e) => onStackSizeChange(e.target.value as StackSize)}
          className={selectClasses}
        >
          {STACK_SIZES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        
        <span className="text-cream-muted text-xs">|</span>
        
        <select
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as Scenario)}
          className={selectClasses}
        >
          {SCENARIOS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default MobileActionBar;
