'use client';

import type { Position, StackSize, Scenario } from '@/types';

interface RangeDropdownsProps {
  position: Position;
  stackSize: StackSize;
  scenario: Scenario;
  onPositionChange: (position: Position) => void;
  onStackSizeChange: (stackSize: StackSize) => void;
  onScenarioChange: (scenario: Scenario) => void;
  disabled?: boolean;
}

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'UTG', label: 'UTG' },
  { value: 'UTG+1', label: 'UTG+1' },
  { value: 'LJ', label: 'LJ (Lojack)' },
  { value: 'HJ', label: 'HJ (Hijack)' },
  { value: 'CO', label: 'CO (Cutoff)' },
  { value: 'BTN', label: 'BTN (Button)' },
  { value: 'SB', label: 'SB (Small Blind)' },
  { value: 'BB', label: 'BB (Big Blind)' },
];

const STACK_SIZES: { value: StackSize; label: string }[] = [
  { value: '80bb', label: '80bb+' },
  { value: '40bb', label: '40bb' },
  { value: '20bb', label: '20bb' },
  { value: '10bb', label: '10bb' },
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'rfi', label: 'RFI (Raise First In)' },
  { value: 'vs-raise', label: 'vs Raise' },
  { value: 'vs-3bet', label: 'vs 3-Bet' },
];

/**
 * Dropdown selectors for Position, Stack Size, and Scenario.
 */
export function RangeDropdowns({
  position,
  stackSize,
  scenario,
  onPositionChange,
  onStackSizeChange,
  onScenarioChange,
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
    </div>
  );
}

export default RangeDropdowns;
