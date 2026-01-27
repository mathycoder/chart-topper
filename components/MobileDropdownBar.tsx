'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Position, StackSize, Scenario } from '@/types';
import { getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';

// Segment dropdown component for header-style selector (mobile version)
function MobileSegmentDropdown<T extends string>({
  value,
  options,
  onChange,
  displayValue,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  displayValue?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentLabel = displayValue ?? options.find(o => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          font-semibold text-slate-900 underline decoration-slate-300 decoration-dashed underline-offset-4 
          transition-colors text-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:decoration-slate-500 cursor-pointer'}
        `}
      >
        {currentLabel}
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[80px]">
          {options.map(({ value: optValue, label }) => (
            <button
              key={optValue}
              onClick={() => {
                onChange(optValue);
                setIsOpen(false);
              }}
              className={`
                block w-full text-left px-3 py-1.5 text-sm
                ${optValue === value ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  { value: '80bb', label: '80bb+' },
  { value: '40bb', label: '40bb' },
  { value: '20bb', label: '20bb' },
  { value: '10bb', label: '10bb' },
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'rfi', label: 'RFI' },
  { value: 'vs-raise', label: 'vs Raise' },
  { value: 'vs-raise-call', label: 'vs Raise + Call' },
  { value: 'vs-3bet', label: 'vs 3-Bet' },
];

// Display names for scenarios in the header
const SCENARIO_DISPLAY: Record<Scenario, string> = {
  'rfi': 'Raise First In',
  'vs-raise': 'Raise',
  'vs-raise-call': 'Raise + Call',
  'vs-3bet': '3-Bet',
  'vs-4bet': '4-Bet',
  'after-limp': 'Limp',
};

interface MobileDropdownBarProps {
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
  /** When true, only show options that have range data (for View/Quiz). Default: false (for Builder). */
  filterByAvailability?: boolean;
}

/**
 * Mobile header bar with clickable segments.
 * Shows Position, Stack Size, Scenario, Opponent, and optionally Caller.
 */
export function MobileDropdownBar({
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
  filterByAvailability = false,
}: MobileDropdownBarProps) {
  // Get available options - either from data availability or position logic
  const availableScenarios = useMemo(() => 
    filterByAvailability ? getAvailableScenarios(stackSize) : SCENARIOS.map(s => s.value),
    [stackSize, filterByAvailability]
  );

  const validHeroPositions = useMemo(() => {
    if (filterByAvailability) {
      return getAvailablePositions(stackSize, scenario);
    }
    return getValidHeroPositions(scenario);
  }, [stackSize, scenario, filterByAvailability]);

  const effectivePosition = validHeroPositions.includes(position) 
    ? position 
    : validHeroPositions[0];
  
  if (effectivePosition !== position && validHeroPositions.length > 0) {
    onPositionChange(effectivePosition);
  }

  const showOpponent = scenario !== 'rfi';
  const validOpponents = useMemo(() => {
    if (!showOpponent) return [];
    if (filterByAvailability) {
      return getAvailableOpponents(stackSize, effectivePosition, scenario);
    }
    return getValidOpponents(effectivePosition, scenario);
  }, [stackSize, effectivePosition, scenario, showOpponent, filterByAvailability]);

  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;

  // Sync opponent if needed
  if (showOpponent && effectiveOpponent !== opponent) {
    onOpponentChange(effectiveOpponent);
  }

  // Caller logic - only for vs-raise-call
  const showCaller = scenario === 'vs-raise-call';
  const validCallers = useMemo(() => {
    if (!showCaller || !effectiveOpponent) return [];
    if (filterByAvailability) {
      return getAvailableCallers(stackSize, effectivePosition, effectiveOpponent);
    }
    return getValidCallers(effectivePosition, effectiveOpponent);
  }, [stackSize, effectivePosition, effectiveOpponent, showCaller, filterByAvailability]);

  const effectiveCaller = showCaller && validCallers.length > 0
    ? (caller && validCallers.includes(caller) ? caller : validCallers[0])
    : null;

  // Sync caller if needed
  if (showCaller && effectiveCaller !== caller) {
    onCallerChange(effectiveCaller);
  }

  // Clear caller when switching away from vs-raise-call
  if (!showCaller && caller !== null) {
    onCallerChange(null);
  }

  // Filter scenarios for dropdown
  const scenarioOptions = filterByAvailability
    ? SCENARIOS.filter(s => availableScenarios.includes(s.value))
    : SCENARIOS;

  return (
    <div className="bg-white border-b border-slate-200 px-3 py-2.5 lg:hidden">
      <div className="flex items-center justify-center gap-1 flex-wrap text-sm leading-relaxed">
        <MobileSegmentDropdown
          value={stackSize}
          options={STACK_SIZES}
          onChange={onStackSizeChange}
          disabled={disabled}
        />
        <span className="text-slate-400 mx-1">—</span>
        <MobileSegmentDropdown
          value={effectivePosition}
          options={validHeroPositions.map(p => ({ value: p, label: p }))}
          onChange={onPositionChange}
          disabled={disabled}
        />
        {showOpponent && validOpponents.length > 0 && (
          <>
            <span className="text-slate-400 mx-0.5">vs</span>
            <MobileSegmentDropdown
              value={effectiveOpponent || validOpponents[0]}
              options={validOpponents.map(p => ({ value: p, label: p }))}
              onChange={onOpponentChange}
              disabled={disabled}
            />
            {scenario === 'vs-raise-call' && <span className="text-slate-400 mx-0.5">raise</span>}
          </>
        )}
        {showCaller && validCallers.length > 0 && (
          <>
            <span className="text-slate-400 mx-0.5">+</span>
            <MobileSegmentDropdown
              value={effectiveCaller || validCallers[0]}
              options={validCallers.map(p => ({ value: p, label: p }))}
              onChange={onCallerChange}
              disabled={disabled}
            />
            <span className="mx-0.5"></span>
            <MobileSegmentDropdown
              value={scenario}
              options={scenarioOptions}
              onChange={onScenarioChange}
              displayValue="call"
              disabled={disabled}
            />
          </>
        )}
        {scenario !== 'vs-raise-call' && (
          <>
            <span className="text-slate-400 mx-0.5"> </span>
            <MobileSegmentDropdown
              value={scenario}
              options={scenarioOptions}
              onChange={onScenarioChange}
              displayValue={SCENARIO_DISPLAY[scenario]}
              disabled={disabled}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default MobileDropdownBar;
