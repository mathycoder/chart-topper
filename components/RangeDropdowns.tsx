'use client';

import type { Position, StackSize, Scenario } from '@/types';

interface RangeDropdownsProps {
  position: Position;
  stackSize: StackSize;
  scenario: Scenario;
  opponent: Position | null;
  onPositionChange: (position: Position) => void;
  onStackSizeChange: (stackSize: StackSize) => void;
  onScenarioChange: (scenario: Scenario) => void;
  onOpponentChange: (opponent: Position | null) => void;
  disabled?: boolean;
}

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

// Position order for determining valid opponents (earlier positions can raise first)
const POSITION_ORDER: Position[] = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

/**
 * Get valid opponent positions for a given hero position and scenario.
 * For "vs Raise" - opponent must have acted before hero (earlier position)
 * For "vs 3-Bet" - any position can 3-bet after hero's open raise
 */
function getValidOpponents(heroPosition: Position, scenario: Scenario): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  
  if (scenario === 'vs-raise') {
    // Opponent raised before hero, so must be in earlier position
    return POSITION_ORDER.slice(0, heroIndex);
  }
  
  if (scenario === 'vs-3bet') {
    // Hero opened, opponent 3-bet - can be any position after hero
    return POSITION_ORDER.filter((_, idx) => idx !== heroIndex);
  }
  
  return [];
}

const STACK_SIZES: { value: StackSize; label: string }[] = [
  { value: '80bb', label: '80bb+' },
  { value: '40bb', label: '40bb' },
  { value: '20bb', label: '20bb' },
  { value: '10bb', label: '10bb' },
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'rfi', label: 'RFI' },
  { value: 'vs-raise', label: 'vs Raise' },
  { value: 'vs-3bet', label: 'vs 3-Bet' },
];

/**
 * Dropdown selectors for Position, Stack Size, Scenario, and Opponent.
 */
export function RangeDropdowns({
  position,
  stackSize,
  scenario,
  opponent,
  onPositionChange,
  onStackSizeChange,
  onScenarioChange,
  onOpponentChange,
  disabled = false,
}: RangeDropdownsProps) {
  const selectClasses = `
    px-3 py-2 rounded-lg
    bg-white border border-slate-300
    text-slate-900 text-sm font-medium
    focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    cursor-pointer
  `;

  // Only show opponent dropdown for non-RFI scenarios
  const showOpponent = scenario !== 'rfi';
  const validOpponents = showOpponent ? getValidOpponents(position, scenario) : [];

  // Auto-select first valid opponent when scenario changes to non-RFI
  // or when hero position changes and current opponent is no longer valid
  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;

  // Sync effective opponent to parent if it changed
  if (showOpponent && effectiveOpponent !== opponent) {
    onOpponentChange(effectiveOpponent);
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {/* Position */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Position
        </label>
        <select
          value={position}
          onChange={(e) => onPositionChange(e.target.value as Position)}
          disabled={disabled}
          className={selectClasses}
        >
          {POSITIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Stack Size */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Stack Size
        </label>
        <select
          value={stackSize}
          onChange={(e) => onStackSizeChange(e.target.value as StackSize)}
          disabled={disabled}
          className={selectClasses}
        >
          {STACK_SIZES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Scenario */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Scenario
        </label>
        <select
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as Scenario)}
          disabled={disabled}
          className={selectClasses}
        >
          {SCENARIOS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Opponent - only shown for non-RFI scenarios */}
      {showOpponent && validOpponents.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Opponent
          </label>
          <select
            value={effectiveOpponent || ''}
            onChange={(e) => onOpponentChange(e.target.value as Position)}
            disabled={disabled}
            className={selectClasses}
          >
            {validOpponents.map((pos) => {
              const posData = POSITIONS.find(p => p.value === pos);
              return (
                <option key={pos} value={pos}>
                  {posData?.label || pos}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
}

export default RangeDropdowns;
