'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { Position, StackSize, Scenario, SpotDescriptor, DeltaAxis } from '@/types';
import { SpotSelector } from './SpotSelector';

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
  /** Optional Delta mode: show Delta button and single-axis target. */
  deltaModeEnabled?: boolean;
  onDeltaToggle?: () => void;
  deltaAxis?: DeltaAxis | null;
  onSelectDeltaAxis?: (axis: DeltaAxis) => void;
  deltaTargetValue?: string | null;
  onDeltaTargetChange?: (value: string) => void;
  deltaTargetOptions?: { value: string; label: string }[];
}

/**
 * Mobile header bar with clickable segments.
 * Uses SpotSelector for a single source of truth; maps to/from individual props for API compatibility.
 * When delta props are provided, renders Delta button and target row inside the same bar for alignment.
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
  deltaModeEnabled = false,
  onDeltaToggle,
  deltaAxis,
  onSelectDeltaAxis,
  deltaTargetValue,
  onDeltaTargetChange,
  deltaTargetOptions,
}: MobileDropdownBarProps) {
  const spot = useMemo((): SpotDescriptor => ({
    stackSize,
    position,
    scenario,
    opponent,
    caller,
  }), [stackSize, position, scenario, opponent, caller]);

  const onChange = useCallback((s: SpotDescriptor) => {
    onStackSizeChange(s.stackSize);
    onPositionChange(s.position);
    onScenarioChange(s.scenario);
    onOpponentChange(s.opponent);
    onCallerChange(s.caller);
  }, [onStackSizeChange, onPositionChange, onScenarioChange, onOpponentChange, onCallerChange]);

  const showDelta = onDeltaToggle != null;
  const deltaButtonRef = useRef<HTMLButtonElement>(null);
  const deltaTouchHandledRef = useRef(false);
  const deltaToggleRef = useRef<() => void>(() => {});
  deltaToggleRef.current = onDeltaToggle ?? (() => {});

  useEffect(() => {
    if (!showDelta) return;
    const el = deltaButtonRef.current;
    if (!el) return;
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      deltaTouchHandledRef.current = true;
      deltaToggleRef.current();
    };
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => el.removeEventListener('touchend', handleTouchEnd);
  }, [showDelta]);

  return (
    <div className="bg-white border-b border-slate-200 px-3 py-2.5 lg:hidden">
        {/* Start (current) spot row + optional Delta button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center justify-start gap-1 flex-wrap text-sm leading-relaxed">
            <SpotSelector
              spot={spot}
              onChange={onChange}
              disabled={disabled}
              filterByAvailability={filterByAvailability}
              stackVertical={false}
              deltaMode={deltaModeEnabled}
              deltaAxis={deltaAxis ?? null}
              onSelectDeltaAxis={onSelectDeltaAxis}
            />
          </div>
          {showDelta && (
            <button
              ref={deltaButtonRef}
              type="button"
              title="Delta Mode: pick one axis to vary (stack, hero, opponent). Click a segment to select it."
              onClick={() => {
                if (deltaTouchHandledRef.current) {
                  deltaTouchHandledRef.current = false;
                  return;
                }
                deltaToggleRef.current();
              }}
              disabled={disabled}
              className={`
                shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-lg font-bold
                min-w-[30px] min-h-[30px] touch-manipulation select-none relative z-10
                ${deltaModeEnabled ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:opacity-80'}
              `}
            >
              Δ
            </button>
          )}
        </div>
        {/* Ghost target row: arrow + dropdown aligned under the delta axis segment */}
        {deltaModeEnabled && deltaAxis && deltaTargetOptions && deltaTargetOptions.length > 0 && onDeltaTargetChange && (
          <div className="mt-1">
            <SpotSelector
              spot={spot}
              onChange={onChange}
              disabled={disabled}
              filterByAvailability={filterByAvailability}
              stackVertical={false}
              deltaMode={true}
              deltaAxis={deltaAxis}
              deltaTargetMode={true}
              deltaTargetValue={deltaTargetValue}
              deltaTargetOptions={deltaTargetOptions}
              onDeltaTargetChange={onDeltaTargetChange}
            />
          </div>
        )}
    </div>
  );
}

export default MobileDropdownBar;
