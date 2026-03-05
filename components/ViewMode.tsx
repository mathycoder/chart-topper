'use client';

import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import type { PokerRange, RangeData, SpotDescriptor } from '@/types';
import { useUrlState, useDelta } from '@/hooks';
import { getRange, getAvailableScenarios, getAvailablePositions, getAvailableOpponents, getAvailableCallers } from '@/data/ranges';
import { Card } from './shared';
import { RangeChart } from './RangeChart';
import { SpotSelector } from './SpotSelector';
import { DeltaControls } from './DeltaControls';
import { DiffFilterToggles } from './DiffFilterToggles';
import { getDiffCategories, buildDimmedFromCategories, ALL_DIFF_CATEGORIES, type DiffCategoryKey } from '@/lib/getDiffCategories';
import { NotesModal } from './NotesModal';

type RangeStats = { raise: number; call: number; fold: number; shove: number; black: number; playable: number };

function countActions(data: RangeData): RangeStats {
  let raise = 0, call = 0, fold = 0, shove = 0, black = 0;
  for (const action of Object.values(data)) {
    if (typeof action === 'string') {
      if (action === 'raise') raise++;
      else if (action === 'call') call++;
      else if (action === 'fold') fold++;
      else if (action === 'shove') shove++;
      else if (action === 'black') black++;
    } else {
      raise += (action.raise ?? 0) / 100;
      call += (action.call ?? 0) / 100;
      fold += (action.fold ?? 0) / 100;
      shove += (action.shove ?? 0) / 100;
    }
  }
  return { raise, call, fold, shove, black, playable: 169 - black };
}

function RangeSummaryCard({
  range,
  stats,
  label,
  diffCount,
  hideNotes = false,
  children,
}: {
  range: PokerRange | null;
  stats: RangeStats;
  label?: string;
  diffCount?: number;
  hideNotes?: boolean;
  children?: ReactNode;
}) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-cream mb-3">
        {label ?? 'Range Summary'}
      </h3>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-cream-muted">Raise:</span>
          <span className="font-medium text-action-raise">{(stats.raise / stats.playable * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Call:</span>
          <span className="font-medium text-action-call">{(stats.call / stats.playable * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Fold:</span>
          <span className="font-medium text-action-fold">{(stats.fold / stats.playable * 100).toFixed(1)}%</span>
        </div>
        {stats.shove > 0 && (
          <div className="flex justify-between">
            <span className="text-cream-muted">Shove:</span>
            <span className="font-medium text-action-shove">{(stats.shove / stats.playable * 100).toFixed(1)}%</span>
          </div>
        )}
        {stats.black > 0 && (
          <div className="flex justify-between text-xs text-cream-muted pt-1 border-t border-felt-border">
            <span>Playable hands:</span>
            <span>{stats.playable} of 169</span>
          </div>
        )}
      </div>

      {diffCount !== undefined && diffCount > 0 && (
        <div className="mt-3 pt-3 border-t border-felt-border">
          <p className="text-xs font-semibold text-cream-muted">{diffCount} hands changed</p>
          {children && <div className="mt-2">{children}</div>}
        </div>
      )}

      {!hideNotes && (range?.meta.strategyNotes?.length || range?.meta.description) && (
        <div className="mt-3 pt-3 border-t border-felt-border max-h-64 overflow-y-auto pb-4">
          {range?.meta.strategyNotes?.length ? (
            <div className="flex flex-col gap-3">
              {range.meta.strategyNotes.map((section, i) => (
                <div key={i}>
                  {section.heading && (
                    <p className="text-sm font-semibold text-cream mb-1">{section.heading}</p>
                  )}
                  {section.bullets.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {section.bullets.filter(Boolean).map((bullet, bi) => (
                        <li key={bi} className="flex gap-2 text-sm text-cream-muted">
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cream-muted italic">{range?.meta.description}</p>
          )}
        </div>
      )}
    </Card>
  );
}

export function ViewMode() {
  const { position, stackSize, scenario, opponent, caller, setPosition, setStackSize, setScenario, setOpponent, setCaller } = useUrlState('/view');

  const availableScenarios = useMemo(() => getAvailableScenarios(stackSize), [stackSize]);
  const effectiveScenario = availableScenarios.includes(scenario) ? scenario : availableScenarios[0] || 'rfi';

  if (effectiveScenario !== scenario && availableScenarios.length > 0) {
    setScenario(effectiveScenario);
  }

  const availablePositions = useMemo(
    () => getAvailablePositions(stackSize, effectiveScenario),
    [stackSize, effectiveScenario]
  );
  const effectivePosition = availablePositions.includes(position) ? position : availablePositions[0] || 'UTG';

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

  if (showOpponent && effectiveOpponent !== opponent) {
    setOpponent(effectiveOpponent);
  }

  const showCaller = effectiveScenario === 'vs-raise-call';
  const availableCallers = useMemo(
    () => showCaller && effectiveOpponent ? getAvailableCallers(stackSize, effectivePosition, effectiveOpponent) : [],
    [stackSize, effectivePosition, effectiveOpponent, showCaller]
  );
  const effectiveCaller = showCaller && availableCallers.length > 0
    ? (caller && availableCallers.includes(caller) ? caller : availableCallers[0])
    : null;

  if (showCaller && effectiveCaller !== caller) {
    setCaller(effectiveCaller);
  }

  if (!showCaller && caller !== null) {
    setCaller(null);
  }

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

  const [showHints, setShowHints] = useState(false);

  // Delta integration
  const delta = useDelta(currentSpot);
  const { deltaActive, hasValidTarget, targetRange, startRange } = delta;

  // Which range to show on the chart: start or target
  const [viewingTarget, setViewingTarget] = useState(true);

  // Diff category filter state
  const [enabledCategories, setEnabledCategories] = useState<Set<DiffCategoryKey>>(
    () => new Set(ALL_DIFF_CATEGORIES)
  );

  const handleToggleCategory = useCallback((key: DiffCategoryKey) => {
    setEnabledCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const diffCategories = useMemo(() => {
    if (!startRange || !targetRange) return null;
    return getDiffCategories(startRange, targetRange);
  }, [startRange, targetRange]);

  const dimmedHands = useMemo(() => {
    if (!deltaActive || !hasValidTarget || !diffCategories) return null;
    if (viewingTarget) {
      if (!targetRange) return null;
      return buildDimmedFromCategories(diffCategories, enabledCategories, targetRange.data);
    } else {
      // Start Range: dim everything uniformly (no diff highlighting)
      if (!startRange) return null;
      return new Set(Object.keys(startRange.data));
    }
  }, [deltaActive, hasValidTarget, diffCategories, enabledCategories, viewingTarget, startRange, targetRange]);

  // Choose which range data to display
  const displayRange = deltaActive && hasValidTarget
    ? (viewingTarget ? targetRange : startRange)
    : range;

  const displaySelections = displayRange?.data ?? {};
  const stats = displayRange ? countActions(displayRange.data) : null;
  const displayRangeExists = displayRange !== null;

  return (
    <>
      <main className="">
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col pb-12">
          {/* Mobile Header */}
          {(deltaActive || delta.deltaAxisPickMode) ? (
            <DeltaControls
              delta={delta}
              currentSpot={currentSpot}
              syncSpotToUrl={syncSpotToUrl}
              layout="mobile"
              scenarioDisplayLabel={range?.meta.scenarioDisplayLabel}
            />
          ) : (
            <div className="bg-felt-surface border-b border-felt-border px-3 py-2.5">
              <div className="flex items-center justify-center gap-2">
                <div className="flex-1 min-w-0 flex items-center justify-center flex-wrap">
                  <SpotSelector
                    spot={currentSpot}
                    onChange={syncSpotToUrl}
                    filterByAvailability={true}
                    stackVertical={false}
                    scenarioLabelOverride={range?.meta.scenarioDisplayLabel}
                  />
                </div>
                <button
                  type="button"
                  title="Compare ranges (Delta)"
                  onClick={() => delta.setDeltaAxisPickMode(true)}
                  className="shrink-0 w-7 h-7 text-base rounded flex items-center justify-center font-bold bg-felt-elevated text-cream-muted cursor-pointer active:opacity-80 touch-manipulation select-none"
                >
                  Δ
                </button>
              </div>
            </div>
          )}

          {/* Mobile Grid */}
          <div className="flex-1 p-1 relative">
            {/* Start / Target toggle */}
            {deltaActive && hasValidTarget && (
              <div className="flex justify-center mb-2">
                <div className="inline-flex rounded-lg bg-felt-elevated p-1">
                  <button
                    onClick={() => setViewingTarget(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${!viewingTarget ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted'}`}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => setViewingTarget(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewingTarget ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted'}`}
                  >
                    Target
                  </button>
                </div>
              </div>
            )}

            {displayRangeExists ? (
              <RangeChart
                userSelections={displaySelections}
                isSubmitted={false}
                isPainting={false}
                selectedAction={null}
                onPaint={() => {}}
                onPaintStart={() => {}}
                dimmedHands={dimmedHands}
              />
            ) : (
              <div className="bg-felt-elevated rounded-lg flex flex-col items-center justify-center text-center p-6 aspect-square border border-felt-border">
                <p className="text-cream-muted text-base mb-4">
                  This range hasn&apos;t been created yet
                </p>
                <a
                  href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
                  className="px-4 py-2 bg-felt-muted text-cream rounded-lg font-medium text-sm"
                >
                  Create in Builder
                </a>
              </div>
            )}

            {/* Diff filter toggles — below chart, mobile */}
            {deltaActive && hasValidTarget && diffCategories && diffCategories.counts.total > 0 && (
              <div className="mt-2 px-1">
                <DiffFilterToggles
                  categories={diffCategories}
                  enabledCategories={enabledCategories}
                  onToggle={handleToggleCategory}
                />
              </div>
            )}

            {/* Hint button — below chart, right-aligned (non-delta only) */}
            {!deltaActive && rangeExists && (range?.meta.strategyNotes?.length || range?.meta.description) && (
              <div className="flex justify-end mt-1 px-1">
                <button
                  onClick={() => setShowHints(true)}
                  className="flex items-center gap-1 text-xs text-cream-muted hover:text-cream transition-colors cursor-pointer"
                  title="View strategy notes"
                >
                  <Lightbulb className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="pointer-events-none">Hint</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block p-4 lg:p-8 max-w-[1050px] mx-auto">
          <div className="flex flex-row gap-8 max-w-6xl mx-auto">
            {/* Left column - Controls */}
            <div className="flex flex-col gap-4 w-90 shrink-0">
              {/* Spot header with delta toggle */}
              {(deltaActive || delta.deltaAxisPickMode) ? (
                <DeltaControls
                  delta={delta}
                  currentSpot={currentSpot}
                  syncSpotToUrl={syncSpotToUrl}
                  layout="desktop"
                  headerStyle={true}
                  scenarioDisplayLabel={range?.meta.scenarioDisplayLabel}
                />
              ) : (
                <div className="text-lg leading-relaxed">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 invisible" aria-hidden>Range</p>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <SpotSelector
                        spot={currentSpot}
                        onChange={syncSpotToUrl}
                        filterByAvailability={true}
                        headerStyle={true}
                        scenarioLabelOverride={range?.meta.scenarioDisplayLabel}
                      />
                    </div>
                    <button
                      type="button"
                      title="Compare ranges (Delta)"
                      onClick={() => delta.setDeltaAxisPickMode(true)}
                      className="shrink-0 w-8 h-8 text-lg rounded-md flex items-center justify-center font-bold bg-felt-elevated text-cream-muted hover:bg-felt-muted hover:text-cream cursor-pointer"
                    >
                      Δ
                    </button>
                  </div>
                </div>
              )}

              {/* Range Stats */}
              {!deltaActive && displayRangeExists && stats && (
                <RangeSummaryCard range={range} stats={stats} />
              )}

              {/* Delta: start + target summaries */}
              {deltaActive && hasValidTarget && startRange && targetRange && (
                <>
                  <RangeSummaryCard
                    range={startRange}
                    stats={countActions(startRange.data)}
                    label="Start Range"
                    hideNotes
                  />
                  <RangeSummaryCard
                    range={targetRange}
                    stats={countActions(targetRange.data)}
                    label="Target Range"
                    diffCount={diffCategories?.counts.total}
                    hideNotes
                  >
                    {diffCategories && diffCategories.counts.total > 0 && (
                      <DiffFilterToggles
                        categories={diffCategories}
                        enabledCategories={enabledCategories}
                        onToggle={handleToggleCategory}
                      />
                    )}
                  </RangeSummaryCard>
                </>
              )}
            </div>

            {/* Right column - Grid */}
            <div className="flex-1 min-w-0 relative">
              {/* Start / Target toggle */}
              {deltaActive && hasValidTarget && (
                <div className="flex justify-center mb-3">
                  <div className="inline-flex rounded-lg bg-felt-elevated p-1">
                    <button
                      onClick={() => setViewingTarget(false)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${!viewingTarget ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted hover:text-cream'}`}
                    >
                      Start Range
                    </button>
                    <button
                      onClick={() => setViewingTarget(true)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewingTarget ? 'bg-felt-muted text-cream shadow-sm' : 'text-cream-muted hover:text-cream'}`}
                    >
                      Target Range
                    </button>
                  </div>
                </div>
              )}

              {displayRangeExists ? (
                <RangeChart
                  userSelections={displaySelections}
                  isSubmitted={false}
                  isPainting={false}
                  selectedAction={null}
                  onPaint={() => {}}
                  onPaintStart={() => {}}
                  dimmedHands={dimmedHands}
                />
              ) : (
                <div className="bg-felt-elevated rounded-lg flex flex-col items-center justify-center text-center p-6 aspect-square border border-felt-border">
                  <p className="text-cream-muted text-lg mb-4">
                    This range hasn&apos;t been created yet
                  </p>
                  <a
                    href={`/builder?position=${effectivePosition}&stackSize=${stackSize}&scenario=${effectiveScenario}${effectiveOpponent ? `&opponent=${effectiveOpponent}` : ''}`}
                    className="px-4 py-2 bg-felt-muted text-cream rounded-lg font-medium hover:bg-gold hover:text-felt-bg transition-colors"
                  >
                    Create in Builder
                  </a>
                </div>
              )}

              {/* Diff filter toggles — below chart (desktop handled inside Target card) */}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar - Stats only */}
      {displayRangeExists && stats && (
        <div className="fixed bottom-0 left-0 right-0 bg-felt-surface border-t border-felt-border px-3 py-2 pb-safe z-40 lg:hidden">
          <div className="flex justify-center gap-4 text-xs">
            <span className="text-action-raise font-medium">Raise: {(stats.raise / stats.playable * 100).toFixed(1)}%</span>
            <span className="text-action-call font-medium">Call: {(stats.call / stats.playable * 100).toFixed(1)}%</span>
            <span className="text-action-fold font-medium">Fold: {(stats.fold / stats.playable * 100).toFixed(1)}%</span>
            {stats.shove > 0 && (
              <span className="text-action-shove font-medium">Shove: {(stats.shove / stats.playable * 100).toFixed(1)}%</span>
            )}
          </div>
        </div>
      )}

      <NotesModal
        isOpen={showHints}
        onClose={() => setShowHints(false)}
        strategyNotes={range?.meta.strategyNotes}
        description={range?.meta.description}
      />
    </>
  );
}

export default ViewMode;
