'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Position, StackSize, Scenario, SpotDescriptor } from '@/types';
import { getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';

function SegmentDropdown<T extends string>({
  value,
  options,
  onChange,
  displayValue,
  disabled,
  className = '',
  headerStyle = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  displayValue?: string;
  disabled?: boolean;
  className?: string;
  headerStyle?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          font-semibold text-slate-900 underline decoration-slate-300 decoration-dashed underline-offset-4
          transition-colors
          ${headerStyle ? 'text-lg leading-relaxed' : 'text-sm'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:decoration-slate-500 cursor-pointer'}
        `}
      >
        {currentLabel}
      </button>
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
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

const STACK_SIZES: { value: StackSize; label: string }[] = [
  { value: '80bb', label: '80bb+' },
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

const SCENARIO_DISPLAY: Record<Scenario, string> = {
  'rfi': 'Raise First In',
  'vs-raise': 'Raise',
  'vs-raise-call': 'Raise + Call',
  'vs-3bet': '3-Bet',
  'vs-4bet': '4-Bet',
  'after-limp': 'Limp',
};

export interface SpotSelectorProps {
  spot: SpotDescriptor;
  onChange: (spot: SpotDescriptor) => void;
  disabled?: boolean;
  filterByAvailability?: boolean;
  /** When true, layout stacks vertically (e.g. mobile Delta panel) */
  stackVertical?: boolean;
  /** When true, use text-lg to match main quiz header */
  headerStyle?: boolean;
}

/**
 * Reusable spot selector: stack, position, scenario, opponent (if not RFI), caller (if vs-raise-call).
 * Reuses same getAvailable* logic as Quiz header and MobileDropdownBar.
 */
export function SpotSelector({
  spot,
  onChange,
  disabled = false,
  filterByAvailability = true,
  stackVertical = false,
  headerStyle = false,
}: SpotSelectorProps) {
  const availableScenarios = useMemo(
    () => (filterByAvailability ? getAvailableScenarios(spot.stackSize) : SCENARIOS.map(s => s.value)),
    [spot.stackSize, filterByAvailability]
  );
  const effectiveScenario = availableScenarios.includes(spot.scenario) ? spot.scenario : (availableScenarios[0] ?? 'rfi');

  const availablePositions = useMemo(
    () => (filterByAvailability ? getAvailablePositions(spot.stackSize, effectiveScenario) : ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as Position[]),
    [spot.stackSize, effectiveScenario, filterByAvailability]
  );
  const effectivePosition = availablePositions.includes(spot.position) ? spot.position : (availablePositions[0] ?? 'UTG');

  const showOpponent = effectiveScenario !== 'rfi';
  const availableOpponents = useMemo(
    () => (showOpponent && filterByAvailability ? getAvailableOpponents(spot.stackSize, effectivePosition, effectiveScenario) : []),
    [spot.stackSize, effectivePosition, effectiveScenario, showOpponent, filterByAvailability]
  );
  const effectiveOpponent = showOpponent && availableOpponents.length > 0
    ? (spot.opponent && availableOpponents.includes(spot.opponent) ? spot.opponent : availableOpponents[0])
    : null;

  const showCaller = effectiveScenario === 'vs-raise-call';
  const availableCallers = useMemo(
    () => (showCaller && effectiveOpponent && filterByAvailability ? getAvailableCallers(spot.stackSize, effectivePosition, effectiveOpponent) : []),
    [spot.stackSize, effectivePosition, effectiveOpponent, showCaller, filterByAvailability]
  );
  const effectiveCaller = showCaller && availableCallers.length > 0
    ? (spot.caller && availableCallers.includes(spot.caller) ? spot.caller : availableCallers[0])
    : null;

  const updateSpot = (patch: Partial<SpotDescriptor>) => {
    const next: SpotDescriptor = {
      stackSize: patch.stackSize ?? spot.stackSize,
      position: patch.position ?? spot.position,
      scenario: patch.scenario ?? spot.scenario,
      opponent: patch.opponent !== undefined ? patch.opponent : spot.opponent,
      caller: patch.caller !== undefined ? patch.caller : spot.caller,
    };
    if (next.scenario === 'rfi') {
      next.opponent = null;
      next.caller = null;
    } else if (next.scenario !== 'vs-raise-call') {
      next.caller = null;
    }
    onChange(next);
  };

  const scenarioOptions = filterByAvailability
    ? SCENARIOS.filter(s => availableScenarios.includes(s.value))
    : SCENARIOS;

  const rowClass = stackVertical ? 'flex flex-col gap-1.5' : 'flex flex-wrap items-center gap-1';

  return (
    <div className={rowClass}>
      <SegmentDropdown
        value={spot.stackSize}
        options={STACK_SIZES}
        onChange={(stackSize) => updateSpot({ stackSize })}
        disabled={disabled}
        headerStyle={headerStyle}
      />
      <span className={`text-slate-400 mx-0.5 ${headerStyle ? 'mx-2' : ''}`}>—</span>
      <SegmentDropdown
        value={effectivePosition}
        options={availablePositions.map(p => ({ value: p, label: p }))}
        onChange={(position) => updateSpot({ position })}
        disabled={disabled}
        headerStyle={headerStyle}
      />
      {showOpponent && availableOpponents.length > 0 && (
        <>
          <span className={`text-slate-400 mx-0.5 ${headerStyle ? 'mx-1' : ''}`}>vs</span>
          <SegmentDropdown
            value={effectiveOpponent ?? availableOpponents[0]}
            options={availableOpponents.map(p => ({ value: p, label: p }))}
            onChange={(opponent) => updateSpot({ opponent })}
            disabled={disabled}
            headerStyle={headerStyle}
          />
          {effectiveScenario === 'vs-raise-call' && <span className="text-slate-400 mx-0.5">raise</span>}
        </>
      )}
      {showCaller && availableCallers.length > 0 && (
        <>
          <SegmentDropdown
            value={effectiveCaller ?? availableCallers[0]}
            options={availableCallers.map(p => ({ value: p, label: p }))}
            onChange={(caller) => updateSpot({ caller })}
            disabled={disabled}
            headerStyle={headerStyle}
          />
          <span className="mx-0.5" />
          <SegmentDropdown
            value={effectiveScenario}
            options={scenarioOptions}
            onChange={(scenario) => updateSpot({ scenario })}
            displayValue="call"
            disabled={disabled}
            headerStyle={headerStyle}
          />
        </>
      )}
      {effectiveScenario !== 'vs-raise-call' && (
        <>
          <span className={`text-slate-400 mx-0.5 ${headerStyle ? 'mx-1' : ''}`}> </span>
          <SegmentDropdown
            value={effectiveScenario}
            options={scenarioOptions}
            onChange={(scenario) => updateSpot({ scenario })}
            displayValue={SCENARIO_DISPLAY[effectiveScenario]}
            disabled={disabled}
            headerStyle={headerStyle}
          />
        </>
      )}
    </div>
  );
}
