'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import type { RangeData, Scenario, Position, StackSize } from '@/types';
import { useUrlState } from '@/hooks';
import { getRange } from '@/data/ranges';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { MobileDropdownBar } from './MobileDropdownBar';

// Segment dropdown component for header-style selector
function SegmentDropdown<T extends string>({
  value,
  options,
  onChange,
  displayValue,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  displayValue?: string;
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
        onClick={() => setIsOpen(!isOpen)}
        className="font-semibold text-slate-900 underline decoration-slate-300 decoration-dashed underline-offset-4 hover:decoration-slate-500 cursor-pointer transition-colors"
      >
        {currentLabel}
      </button>
      {isOpen && (
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

// Dropdown data for mobile
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

/**
 * Get valid hero positions for a given scenario.
 * - RFI: any position can open
 * - vs-raise: need at least 1 position before hero (for raiser)
 * - vs-raise-call: need at least 2 positions before hero (for raiser and caller)
 * - vs-3bet: any position can open and face 3-bet
 */
function getValidHeroPositions(scenario: Scenario): Position[] {
  if (scenario === 'vs-raise-call') {
    // Need at least 2 positions before hero (raiser + caller)
    return POSITION_ORDER.slice(2); // LJ and later
  }
  if (scenario === 'vs-raise') {
    // Need at least 1 position before hero (raiser)
    return POSITION_ORDER.slice(1); // UTG+1 and later
  }
  // RFI and vs-3bet: any position
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

/**
 * View Mode - Browse poker ranges in read-only mode.
 * Shows the correct answers without any editing capability.
 */
export function ViewMode() {
  const { position, stackSize, scenario, opponent, caller, setPosition, setStackSize, setScenario, setOpponent, setCaller } = useUrlState('/view');

  // Get range data synchronously via direct import
  const range = useMemo(() => getRange(stackSize, position, scenario, opponent, caller), [stackSize, position, scenario, opponent, caller]);
  const rangeExists = range !== null;

  // Display the range data directly
  const displaySelections = range?.data ?? {};

  // Filter valid hero positions based on scenario
  const validHeroPositions = getValidHeroPositions(scenario);
  const effectivePosition = validHeroPositions.includes(position) 
    ? position 
    : validHeroPositions[0];
  
  // Auto-correct position if it's not valid for this scenario
  if (effectivePosition !== position) {
    setPosition(effectivePosition);
  }

  // Count actions in the range (weighted by percentages for mixed hands)
  const countActions = (data: RangeData) => {
    let raise = 0, call = 0, fold = 0;
    for (const action of Object.values(data)) {
      if (typeof action === 'string') {
        if (action === 'raise') raise++;
        else if (action === 'call') call++;
        else fold++;
      } else {
        // Mixed hand - weight by percentage (0-100 scale, so divide by 100)
        raise += (action.raise ?? 0) / 100;
        call += (action.call ?? 0) / 100;
        fold += (action.fold ?? 0) / 100;
      }
    }
    return { raise, call, fold };
  };

  const stats = range ? countActions(range.data) : null;

  const showOpponent = scenario !== 'rfi';
  const validOpponents = showOpponent ? getValidOpponents(position, scenario) : [];
  const effectiveOpponent = showOpponent && validOpponents.length > 0
    ? (opponent && validOpponents.includes(opponent) ? opponent : validOpponents[0])
    : null;
  
  if (showOpponent && effectiveOpponent !== opponent) {
    setOpponent(effectiveOpponent);
  }

  // Caller logic - only for vs-raise-call
  const showCaller = scenario === 'vs-raise-call';
  const validCallers = showCaller && effectiveOpponent 
    ? getValidCallers(position, effectiveOpponent) 
    : [];
  const effectiveCaller = showCaller && validCallers.length > 0
    ? (caller && validCallers.includes(caller) ? caller : validCallers[0])
    : null;
  
  if (showCaller && effectiveCaller !== caller) {
    setCaller(effectiveCaller);
  }
  
  if (!showCaller && caller !== null) {
    setCaller(null);
  }

  return (
    <>
      <main className="">
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-12">
          {/* Mobile Header */}
          <MobileDropdownBar
            position={position}
            stackSize={stackSize}
            scenario={scenario}
            opponent={opponent}
            caller={caller}
            onPositionChange={setPosition}
            onStackSizeChange={setStackSize}
            onScenarioChange={setScenario}
            onOpponentChange={setOpponent}
            onCallerChange={setCaller}
          />
          {/* Mobile Grid */}
          <div className="flex-1 p-1 relative">
            {rangeExists ? (
              <RangeChart
                userSelections={displaySelections}
                isSubmitted={false}
                isPainting={false}
                selectedAction={null}
                onPaint={() => {}}
                onPaintStart={() => {}}
              />
            ) : (
              <div className="bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6 aspect-square">
                <p className="text-slate-400 text-base mb-4">
                  This range hasn&apos;t been created yet
                </p>
                <a 
                  href={`/builder?position=${position}&stackSize=${stackSize}&scenario=${scenario}${opponent ? `&opponent=${opponent}` : ''}`}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium text-sm"
                >
                  Create in Builder
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-80 shrink-0">
              {/* Header-style Range Selector */}
              <div className="text-lg leading-relaxed">
                <SegmentDropdown
                  value={stackSize}
                  options={STACK_SIZES}
                  onChange={setStackSize}
                />
                <span className="text-slate-400 mx-2">—</span>
                <SegmentDropdown
                  value={position}
                  options={POSITIONS.filter(p => validHeroPositions.includes(p.value))}
                  onChange={setPosition}
                />
                {showOpponent && validOpponents.length > 0 && (
                  <>
                    <span className="text-slate-400 mx-1">vs</span>
                    <SegmentDropdown
                      value={effectiveOpponent || validOpponents[0]}
                      options={validOpponents.map(p => ({ value: p, label: p }))}
                      onChange={setOpponent}
                    />
                    {scenario === 'vs-raise-call' && <span className="text-slate-400 mx-1">raise</span>}
                  </>
                )}
                {showCaller && validCallers.length > 0 && (
                  <>
                    <SegmentDropdown
                      value={effectiveCaller || validCallers[0]}
                      options={validCallers.map(p => ({ value: p, label: p }))}
                      onChange={setCaller}
                    />
                    <span className="mx-1"></span>
                    <SegmentDropdown
                      value={scenario}
                      options={SCENARIOS}
                      onChange={setScenario}
                      displayValue="call"
                    />
                  </>
                )}
                {scenario !== 'vs-raise-call' && (
                  <>
                    <span className="text-slate-400 mx-1"> </span>
                    <SegmentDropdown
                      value={scenario}
                      options={SCENARIOS}
                      onChange={setScenario}
                      displayValue={SCENARIO_DISPLAY[scenario]}
                    />
                  </>
                )}
              </div>

              {/* Range Stats */}
              {rangeExists && stats && (
                <Card>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Range Summary</h3>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Raise:</span>
                      <span className="font-medium text-red-600">{(stats.raise / 169 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Call:</span>
                      <span className="font-medium text-green-600">{(stats.call / 169 * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fold:</span>
                      <span className="font-medium text-blue-600">{(stats.fold / 169 * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  {range?.meta.description && (
                    <p className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600 italic">
                      {range.meta.description}
                    </p>
                  )}
                </Card>
              )}

              {/* Legend */}
              <Card>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Legend</h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-action-raise"></div>
                    <span className="text-slate-600">Raise / 3-Bet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-action-call"></div>
                    <span className="text-slate-600">Call</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-action-fold"></div>
                    <span className="text-slate-600">Fold</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded" style={{ background: 'linear-gradient(to right, var(--color-action-raise) 50%, var(--color-action-call) 50%)' }}></div>
                    <span className="text-slate-600">Mixed Strategy</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column - Grid */}
            <div className="flex-1 min-w-0 relative">
              {rangeExists ? (
                <RangeChart
                  userSelections={displaySelections}
                  isSubmitted={false}
                  isPainting={false}
                  selectedAction={null}
                  onPaint={() => {}}
                  onPaintStart={() => {}}
                />
              ) : (
                <div className="bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6 aspect-square">
                  <p className="text-slate-400 text-lg mb-4">
                    This range hasn&apos;t been created yet
                  </p>
                  <a 
                    href={`/builder?position=${position}&stackSize=${stackSize}&scenario=${scenario}${opponent ? `&opponent=${opponent}` : ''}`}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                  >
                    Create in Builder
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar - Stats only */}
      {rangeExists && stats && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 pb-safe z-40 lg:hidden">
          <div className="flex justify-center gap-6 text-xs">
            <span className="text-red-600 font-medium">Raise: {(stats.raise / 169 * 100).toFixed(1)}%</span>
            <span className="text-green-600 font-medium">Call: {(stats.call / 169 * 100).toFixed(1)}%</span>
            <span className="text-blue-600 font-medium">Fold: {(stats.fold / 169 * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </>
  );
}

export default ViewMode;
