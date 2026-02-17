'use client';

import { useMemo, useCallback } from 'react';
import type { RangeData, SpotDescriptor } from '@/types';
import { useUrlState } from '@/hooks';
import { getRange, getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { SpotSelector } from './SpotSelector';

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

  const currentSpot = useMemo((): SpotDescriptor => ({
    stackSize,
    position: effectivePosition,
    scenario: effectiveScenario,
    opponent: effectiveOpponent,
    caller: effectiveCaller,
  }), [stackSize, effectivePosition, effectiveScenario, effectiveOpponent, effectiveCaller]);

  const syncSpotToUrl = useCallback((s: SpotDescriptor) => {
    setStackSize(s.stackSize);
    setPosition(s.position);
    setScenario(s.scenario);
    setOpponent(s.opponent);
    setCaller(s.caller);
  }, [setStackSize, setPosition, setScenario, setOpponent, setCaller]);

  // Display the range data directly
  const displaySelections = range?.data ?? {};

  // Count actions in the range (weighted by percentages for mixed hands)
  const countActions = (data: RangeData) => {
    let raise = 0, call = 0, fold = 0, shove = 0, black = 0;
    for (const action of Object.values(data)) {
      if (typeof action === 'string') {
        if (action === 'raise') raise++;
        else if (action === 'call') call++;
        else if (action === 'fold') fold++;
        else if (action === 'shove') shove++;
        else if (action === 'black') black++;
      } else {
        // Mixed hand - weight by percentage (0-100 scale, so divide by 100)
        raise += (action.raise ?? 0) / 100;
        call += (action.call ?? 0) / 100;
        fold += (action.fold ?? 0) / 100;
        shove += (action.shove ?? 0) / 100;
      }
    }
    const playable = 169 - black;
    return { raise, call, fold, shove, black, playable };
  };

  const stats = range ? countActions(range.data) : null;

  return (
    <>
      <main className="">
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-12">
          {/* Mobile Header */}
          <div className="bg-white border-b border-slate-200 px-3 py-2.5 flex items-center justify-center flex-wrap">
            <SpotSelector
              spot={currentSpot}
              onChange={syncSpotToUrl}
              filterByAvailability={true}
              stackVertical={false}
            />
          </div>
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
              {/* Spot header (same component as Quiz) */}
              <div className="text-lg leading-relaxed">
                <SpotSelector
                  spot={currentSpot}
                  onChange={syncSpotToUrl}
                  filterByAvailability={true}
                  headerStyle={true}
                />
              </div>

              {/* Range Stats */}
              {rangeExists && stats && (
                <Card>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Range Summary</h3>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Raise:</span>
                      <span className="font-medium text-red-600">{(stats.raise / stats.playable * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Call:</span>
                      <span className="font-medium text-green-600">{(stats.call / stats.playable * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fold:</span>
                      <span className="font-medium text-blue-600">{(stats.fold / stats.playable * 100).toFixed(1)}%</span>
                    </div>
                    {stats.shove > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Shove:</span>
                        <span className="font-medium text-rose-700">{(stats.shove / stats.playable * 100).toFixed(1)}%</span>
                      </div>
                    )}
                    {stats.black > 0 && (
                      <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                        <span>Playable hands:</span>
                        <span>{stats.playable} of 169</span>
                      </div>
                    )}
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
          <div className="flex justify-center gap-4 text-xs">
            <span className="text-red-600 font-medium">Raise: {(stats.raise / stats.playable * 100).toFixed(1)}%</span>
            <span className="text-green-600 font-medium">Call: {(stats.call / stats.playable * 100).toFixed(1)}%</span>
            <span className="text-blue-600 font-medium">Fold: {(stats.fold / stats.playable * 100).toFixed(1)}%</span>
            {stats.shove > 0 && (
              <span className="text-rose-700 font-medium">Shove: {(stats.shove / stats.playable * 100).toFixed(1)}%</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ViewMode;
