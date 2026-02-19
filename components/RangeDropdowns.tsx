'use client';

import { useEffect } from 'react';
import type { Position, StackSize, Scenario } from '@/types';

interface RangeDropdownsProps {
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
 * Get valid opponent (raiser) positions for a given hero position and scenario.
 * For "vs Raise" / "vs Raise + Call" - opponent must have acted before hero (earlier position)
 * For "vs 3-Bet" - any position can 3-bet after hero's open raise
 */
function getValidOpponents(heroPosition: Position, scenario: Scenario): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  
  if (scenario === 'vs-raise' || scenario === 'vs-raise-call') {
    // Opponent raised before hero, so must be in earlier position
    return POSITION_ORDER.slice(0, heroIndex);
  }
  
  if (scenario === 'vs-3bet') {
    // Hero opened, opponent 3-bet - can be any position after hero
    return POSITION_ORDER.filter((_, idx) => idx !== heroIndex);
  }
  
  return [];
}

/**
 * Get valid caller positions for vs-raise-call scenario.
 * Caller must be between the raiser and hero in position order.
 */
function getValidCallers(heroPosition: Position, raiserPosition: Position): Position[] {
  const heroIndex = POSITION_ORDER.indexOf(heroPosition);
  const raiserIndex = POSITION_ORDER.indexOf(raiserPosition);
  // Caller must be between raiser and hero (exclusive on both ends)
  return POSITION_ORDER.slice(raiserIndex + 1, heroIndex);
}

/**
 * Get valid hero positions for a given scenario.
 */
function getValidHeroPositions(scenario: Scenario): Position[] {
  if (scenario === 'vs-raise-call') {
    return POSITION_ORDER.slice(2); // LJ and later (need raiser + caller before)
  }
  if (scenario === 'vs-raise') {
    return POSITION_ORDER.slice(1); // UTG+1 and later (need raiser before)
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

/**
 * Dropdown selectors for Position, Stack Size, Scenario, Opponent, and Caller.
 */
export function RangeDropdowns({
  position,
  stackSize,
  scenario,
  opponent,
  caller,
  onPositionChange,
  onStackSizeChange,
  onScenarioChange,
  onOpponentChange,
  onCallerChange,
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

  // Filter valid hero positions based on scenario
  const validHeroPositions = getValidHeroPositions(scenario);
  const effectivePosition = validHeroPositions.includes(position) 
    ? position 
    : validHeroPositions[0];
  
  // Auto-correct position if it's not valid for this scenario
  useEffect(() => {
    if (effectivePosition !== position) {
      onPositionChange(effectivePosition);
    }
  }, [effectivePosition, position, onPositionChange]);

  // Only show opponent dropdown for non-RFI scenarios
  const showOpponent = scenario !== 'rfi';
  const validOpponents = showOpponent ? getValidOpponents(position, scenario) : [];

  // Auto-select first valid opponent when scenario changes to non-RFI
  // or when hero position changes and current opponent is no longer valid
  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;

  // Sync effective opponent to parent if it changed
  useEffect(() => {
    if (showOpponent && effectiveOpponent !== opponent) {
      onOpponentChange(effectiveOpponent);
    }
  }, [showOpponent, effectiveOpponent, opponent, onOpponentChange]);

  // Caller dropdown - only for vs-raise-call scenario
  const showCaller = scenario === 'vs-raise-call';
  const validCallers = showCaller && effectiveOpponent 
    ? getValidCallers(position, effectiveOpponent) 
    : [];

  // Auto-select first valid caller
  const effectiveCaller = showCaller && validCallers.length > 0
    ? (caller && validCallers.includes(caller) ? caller : validCallers[0])
    : null;

  // Sync effective caller to parent if it changed
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
          {POSITIONS.filter(p => validHeroPositions.includes(p.value)).map(({ value, label }) => (
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

      {/* Opponent (Raiser) - only shown for non-RFI scenarios */}
      {showOpponent && validOpponents.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {scenario === 'vs-raise-call' ? 'Raiser' : 'Opponent'}
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

      {/* Caller - only shown for vs-raise-call scenario */}
      {showCaller && validCallers.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Caller
          </label>
          <select
            value={effectiveCaller || ''}
            onChange={(e) => onCallerChange(e.target.value as Position)}
            disabled={disabled}
            className={selectClasses}
          >
            {validCallers.map((pos) => {
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
