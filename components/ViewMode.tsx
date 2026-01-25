'use client';

import { useState, useEffect } from 'react';
import type { PokerRange, RangeData, Scenario, Position, StackSize } from '@/types';
import { useUrlState } from '@/hooks';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { RangeDropdowns } from './RangeDropdowns';

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

const SCENARIO_NAMES: Record<Scenario, string> = {
  'rfi': 'Raise First In',
  'vs-raise': 'vs Raise',
  'vs-3bet': 'vs 3-Bet',
  'vs-4bet': 'vs 4-Bet',
  'after-limp': 'After Limp',
};

/**
 * View Mode - Browse poker ranges in read-only mode.
 * Shows the correct answers without any editing capability.
 */
export function ViewMode() {
  const { position, stackSize, scenario, opponent, setPosition, setStackSize, setScenario, setOpponent } = useUrlState('/view');

  const [range, setRange] = useState<PokerRange | null>(null);
  const [rangeExists, setRangeExists] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load range when dropdowns change
  useEffect(() => {
    const loadRange = async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({ stackSize, position, scenario });
        if (opponent) params.set('opponent', opponent);
        const response = await fetch(`/api/load-range?${params}`);
        const result = await response.json();

        if (result.exists && result.data) {
          // Build display name based on scenario
          let displayName = `${stackSize}+ ${position} - ${SCENARIO_NAMES[scenario]}`;
          if (opponent && scenario !== 'rfi') {
            displayName = `${stackSize}+ ${position} vs ${opponent} - ${SCENARIO_NAMES[scenario]}`;
          }
          
          const rangeData = result.data as RangeData;
          
          setRange({
            meta: {
              stackSize,
              position,
              scenario,
              opponentPosition: opponent || undefined,
              displayName,
            },
            data: rangeData,
          });
          setRangeExists(true);
        } else {
          setRange(null);
          setRangeExists(false);
        }
      } catch (error) {
        console.error('Failed to load range:', error);
        setRange(null);
        setRangeExists(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadRange();
  }, [position, stackSize, scenario, opponent]);

  // Create "selections" from the range data for display
  // In view mode, we just display the correct range directly
  const displaySelections = range?.data ?? {};

  // Count actions in the range
  const countActions = (data: RangeData) => {
    let raise = 0, call = 0, fold = 0, blended = 0;
    for (const action of Object.values(data)) {
      if (typeof action === 'string') {
        if (action === 'raise') raise++;
        else if (action === 'call') call++;
        else fold++;
      } else {
        blended++;
      }
    }
    return { raise, call, fold, blended, total: raise + call + fold + blended };
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

  const selectClasses = `
    px-2 py-1.5 rounded-md
    bg-slate-50 border border-slate-200
    text-slate-900 text-xs font-medium
    focus:outline-none focus:ring-1 focus:ring-slate-400
    cursor-pointer
  `;

  return (
    <>
      <main className="">
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-16">
          {/* Mobile Grid - fills available space */}
          <div className="flex-1 p-1 relative">
            <RangeChart
              userSelections={displaySelections}
              isSubmitted={false}
              isPainting={false}
              selectedAction={null}
              onPaint={() => {}}
              onPaintStart={() => {}}
            />
            
            {!rangeExists && !isLoading && (
              <div className="absolute inset-3 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
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

            {isLoading && (
              <div className="absolute inset-3 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-slate-600">Loading...</div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-80 flex-shrink-0">
              <Card>
                <RangeDropdowns
                  position={position}
                  stackSize={stackSize}
                  scenario={scenario}
                  opponent={opponent}
                  onPositionChange={setPosition}
                  onStackSizeChange={setStackSize}
                  onScenarioChange={setScenario}
                  onOpponentChange={setOpponent}
                />
              </Card>

              {/* Range Stats */}
              {rangeExists && stats && (
                <Card>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Range Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Raise:</span>
                      <span className="font-medium text-red-600">{stats.raise}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Call:</span>
                      <span className="font-medium text-green-600">{stats.call}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fold:</span>
                      <span className="font-medium text-blue-600">{stats.fold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mixed:</span>
                      <span className="font-medium text-purple-600">{stats.blended}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-sm">
                    <span className="text-slate-500">Total hands:</span>
                    <span className="font-semibold text-slate-700">{stats.total}</span>
                  </div>
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
              <RangeChart
                userSelections={displaySelections}
                isSubmitted={false}
                isPainting={false}
                selectedAction={null}
                onPaint={() => {}}
                onPaintStart={() => {}}
              />
              
              {!rangeExists && !isLoading && (
                <div className="absolute inset-0 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-center p-6">
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

              {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="text-slate-600">Loading...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 pt-2 pb-safe z-40 lg:hidden">
        {/* Stats row */}
        {rangeExists && stats && (
          <div className="flex justify-center gap-4 text-xs mb-2">
            <span className="text-red-600 font-medium">R: {stats.raise}</span>
            <span className="text-green-600 font-medium">C: {stats.call}</span>
            <span className="text-blue-600 font-medium">F: {stats.fold}</span>
            {stats.blended > 0 && <span className="text-purple-600 font-medium">Mix: {stats.blended}</span>}
          </div>
        )}
        
        {/* Dropdowns row */}
        <div className="flex items-center gap-1.5 pb-2">
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
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
                onChange={(e) => setOpponent(e.target.value as Position)}
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
            onChange={(e) => setStackSize(e.target.value as StackSize)}
            className={selectClasses}
          >
            {STACK_SIZES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <span className="text-slate-300 text-xs">|</span>
          
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as Scenario)}
            className={selectClasses}
          >
            {SCENARIOS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export default ViewMode;
