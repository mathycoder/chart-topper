'use client';

import { useMemo, useCallback } from 'react';
import type { Position, StackSize, Scenario, SpotDescriptor } from '@/types';
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
}

/**
 * Mobile header bar with clickable spot segments.
 * Uses SpotSelector for a single source of truth; maps to/from individual props for API compatibility.
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

  return (
    <div className="bg-felt-surface border-b border-felt-border px-3 py-2.5 lg:hidden">
      <div className="flex items-center gap-1 flex-wrap text-sm leading-relaxed">
        <SpotSelector
          spot={spot}
          onChange={onChange}
          disabled={disabled}
          filterByAvailability={filterByAvailability}
          stackVertical={false}
        />
      </div>
    </div>
  );
}

export default MobileDropdownBar;
