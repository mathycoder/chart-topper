'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { Position, StackSize, Scenario, SpotDescriptor } from '@/types';
import { SpotSelector } from './SpotSelector';
import { FaArrowDown } from 'react-icons/fa';

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
  /** Optional Delta mode: show Delta button and target row so Start/Target headings align. */
  deltaModeEnabled?: boolean;
  onDeltaToggle?: () => void;
  targetSpot?: SpotDescriptor;
  onTargetSpotChange?: (spot: SpotDescriptor) => void;
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
  targetSpot,
  onTargetSpotChange,
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

  const showDelta = onDeltaToggle != null && targetSpot != null && onTargetSpotChange != null;
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
            />
          </div>
          {showDelta && (
            <button
              ref={deltaButtonRef}
              type="button"
              title="Delta Mode: Start from this spot and transform to another. Chart fills with this spot; you edit toward the target. Submit grades against the target spot. Click to set target."
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
        {/* Target spot row when Delta on - left-aligned with Start row */}
        {showDelta && deltaModeEnabled && (
          <>
            <FaArrowDown className="size-4 self-center" />
            <div className="w-full flex flex-wrap justify-start">
              <SpotSelector
                spot={targetSpot}
                onChange={onTargetSpotChange}
                disabled={disabled}
                filterByAvailability={filterByAvailability}
                stackVertical={false}
              />
            </div>
          </>
        )}
    </div>
  );
}

export default MobileDropdownBar;
