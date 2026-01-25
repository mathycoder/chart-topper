'use client';

import type { Position, StackSize, Scenario } from '@/types';

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
  if (scenario === 'vs-raise') return POSITION_ORDER.slice(0, heroIndex);
  if (scenario === 'vs-3bet') return POSITION_ORDER.filter((_, idx) => idx !== heroIndex);
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

interface MobileDropdownBarProps {
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

/**
 * Mobile dropdown bar that sits at the top of the screen.
 * Shows Position, Stack Size, Scenario, and optionally Opponent.
 */
export function MobileDropdownBar({
  position,
  stackSize,
  scenario,
  opponent,
  onPositionChange,
  onStackSizeChange,
  onScenarioChange,
  onOpponentChange,
  disabled = false,
}: MobileDropdownBarProps) {
  const showOpponent = scenario !== 'rfi';
  const validOpponents = showOpponent ? getValidOpponents(position, scenario) : [];
  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;

  // Sync opponent if needed
  if (showOpponent && effectiveOpponent !== opponent) {
    onOpponentChange(effectiveOpponent);
  }

  const selectClasses = `
    px-2 py-1.5 rounded-md
    bg-white border border-slate-200
    text-slate-900 text-xs font-medium
    focus:outline-none focus:ring-1 focus:ring-slate-400
    disabled:opacity-50
    cursor-pointer
  `;

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 lg:hidden">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <select
          value={position}
          onChange={(e) => onPositionChange(e.target.value as Position)}
          disabled={disabled}
          className={selectClasses}
        >
          {POSITIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {showOpponent && validOpponents.length > 0 && (
          <>
            <span className="text-slate-400 text-xs">vs</span>
            <select
              value={effectiveOpponent || ''}
              onChange={(e) => onOpponentChange(e.target.value as Position)}
              disabled={disabled}
              className={selectClasses}
            >
              {validOpponents.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </>
        )}

        <span className="text-slate-300 text-xs">|</span>

        <select
          value={stackSize}
          onChange={(e) => onStackSizeChange(e.target.value as StackSize)}
          disabled={disabled}
          className={selectClasses}
        >
          {STACK_SIZES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <span className="text-slate-300 text-xs">|</span>

        <select
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as Scenario)}
          disabled={disabled}
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

export default MobileDropdownBar;
