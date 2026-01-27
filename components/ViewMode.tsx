'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import type { RangeData, Scenario, Position, StackSize } from '@/types';
import { useUrlState } from '@/hooks';
import { getRange, getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';
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

  // Get available options based on what ranges actually exist
  const availableScenarios = useMemo(() => getAvailableScenarios(stackSize), [stackSize]);
  const effectiveScenario = availableScenarios.includes(scenario) ? scenario : availableScenarios[0] || 'rfi';
  
  // Auto-correct scenario if not available
  if (effectiveScenario !== scenario && availableScenarios.length > 0) {
    setScenario(effectiveScenario);
  }

  const availablePositions = useMemo(
    () => getAvailablePositions(stackSize, effectiveScenario),
    [stackSize, effectiveScenario]
  );
  const effectivePosition = availablePositions.includes(position) ? position : availablePositions[0] || 'UTG';
  
  // Auto-correct position if not available
  if (effectivePosition !== position && availablePositions.length > 0) {
    setPosition(effectivePosition);
  }

  const showOpponent = effectiveScenario !== 'rfi';
  const availableOpponents = useMemo(
    () => showOpponent ? getAvailableOpponents(stackSize, effectivePosition, effectiveScenario) : [],
    [stackSize, effectivePosition, effectiveScenario, showOpponent]
  );
  const effectiveOpponent = showOpponent && availableOpponents.length > 0
    ? (opponent && availableOpponents.includes(opponent) ? opponent : availableOpponents[0])
    : null;
  
  // Auto-correct opponent if not available
  if (showOpponent && effectiveOpponent !== opponent) {
    setOpponent(effectiveOpponent);
  }

  // Caller logic - only for vs-raise-call
  const showCaller = effectiveScenario === 'vs-raise-call';
  const availableCallers = useMemo(
    () => showCaller && effectiveOpponent ? getAvailableCallers(stackSize, effectivePosition, effectiveOpponent) : [],
    [stackSize, effectivePosition, effectiveOpponent, showCaller]
  );
  const effectiveCaller = showCaller && availableCallers.length > 0
    ? (caller && availableCallers.includes(caller) ? caller : availableCallers[0])
    : null;
  
  // Auto-correct caller if not available
  if (showCaller && effectiveCaller !== caller) {
    setCaller(effectiveCaller);
  }
  
  if (!showCaller && caller !== null) {
    setCaller(null);
  }

  // Get range data synchronously via direct import
  const range = useMemo(
    () => getRange(stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller),
    [stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller]
  );
  const rangeExists = range !== null;

  // Display the range data directly
  const displaySelections = range?.data ?? {};

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

  return (
    <>
      <main className="">
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-12">
          {/* Mobile Header */}
          <MobileDropdownBar
            position={effectivePosition}
            stackSize={stackSize}
            scenario={effectiveScenario}
            opponent={effectiveOpponent}
            caller={effectiveCaller}
            onPositionChange={setPosition}
            onStackSizeChange={setStackSize}
            onScenarioChange={setScenario}
            onOpponentChange={setOpponent}
            onCallerChange={setCaller}
            filterByAvailability={true}
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
                  href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
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
                  value={effectivePosition}
                  options={availablePositions.map(p => ({ value: p, label: p }))}
                  onChange={setPosition}
                />
                {showOpponent && availableOpponents.length > 0 && (
                  <>
                    <span className="text-slate-400 mx-1">vs</span>
                    <SegmentDropdown
                      value={effectiveOpponent || availableOpponents[0]}
                      options={availableOpponents.map(p => ({ value: p, label: p }))}
                      onChange={setOpponent}
                    />
                    {effectiveScenario === 'vs-raise-call' && <span className="text-slate-400 mx-1">raise</span>}
                  </>
                )}
                {showCaller && availableCallers.length > 0 && (
                  <>
                    <SegmentDropdown
                      value={effectiveCaller || availableCallers[0]}
                      options={availableCallers.map(p => ({ value: p, label: p }))}
                      onChange={setCaller}
                    />
                    <span className="mx-1"></span>
                    <SegmentDropdown
                      value={effectiveScenario}
                      options={availableScenarios.map(s => ({ value: s, label: SCENARIOS.find(sc => sc.value === s)?.label || s }))}
                      onChange={setScenario}
                      displayValue="call"
                    />
                  </>
                )}
                {effectiveScenario !== 'vs-raise-call' && (
                  <>
                    <span className="text-slate-400 mx-1"> </span>
                    <SegmentDropdown
                      value={effectiveScenario}
                      options={availableScenarios.map(s => ({ value: s, label: SCENARIOS.find(sc => sc.value === s)?.label || s }))}
                      onChange={setScenario}
                      displayValue={SCENARIO_DISPLAY[effectiveScenario]}
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
                    href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
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
