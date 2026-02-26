'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Position, StackSize, SpotDescriptor, DeltaAxis } from '@/types';
import { getRangeForSpot, getAvailablePositions, getAvailableOpponents } from '@/data/ranges';
import { ALL_HANDS } from '@/data/hands';
import { getDiffHands } from '@/lib/gradeDeltaRange';
import { STACK_SIZES } from '@/components/SpotSelector';

const VALID_AXES: DeltaAxis[] = ['stackSize', 'position', 'opponent'];

export interface UseDeltaReturn {
  deltaActive: boolean;
  deltaAxisPickMode: boolean;
  deltaAxis: DeltaAxis | null;
  deltaTargetValue: string | null;
  startRange: ReturnType<typeof getRangeForSpot>;
  targetRange: ReturnType<typeof getRangeForSpot>;
  hasValidTarget: boolean;
  diffHands: Set<string>;
  nonDiffHands: Set<string>;
  deltaTargetOptions: { value: string; label: string }[];
  targetSpot: SpotDescriptor;
  toggleDelta: () => void;
  setDeltaAxisPickMode: (v: boolean) => void;
  handleSelectDeltaAxis: (axis: DeltaAxis) => void;
  setDeltaTargetValue: (val: string | null) => void;
  resetDelta: () => void;
}

export function useDelta(currentSpot: SpotDescriptor): UseDeltaReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [deltaAxisPickMode, setDeltaAxisPickMode] = useState(false);
  const [deltaAxis, setDeltaAxis] = useState<DeltaAxis | null>(() => {
    const p = searchParams.get('delta');
    return p && VALID_AXES.includes(p as DeltaAxis) ? (p as DeltaAxis) : null;
  });
  const [deltaTargetValue, setDeltaTargetValue] = useState<string | null>(
    () => searchParams.get('deltaTarget')
  );

  const { stackSize, position, scenario, opponent } = currentSpot;

  const availablePositions = useMemo(
    () => getAvailablePositions(stackSize, scenario),
    [stackSize, scenario]
  );

  const showOpponent = scenario !== 'rfi';
  const availableOpponents = useMemo(
    () => showOpponent ? getAvailableOpponents(stackSize, position, scenario) : [],
    [stackSize, position, scenario, showOpponent]
  );

  const getNextValue = useCallback((axis: DeltaAxis): string | null => {
    let values: string[];
    let current: string;
    if (axis === 'stackSize') {
      values = STACK_SIZES.map(s => s.value);
      current = stackSize;
    } else if (axis === 'position') {
      values = availablePositions;
      current = position;
    } else {
      values = availableOpponents;
      current = opponent ?? '';
    }
    const remaining = values.filter(v => v !== current);
    if (remaining.length === 0) return null;
    const idx = values.indexOf(current);
    const nextInList = values[idx + 1];
    return nextInList && nextInList !== current ? nextInList : remaining[0];
  }, [stackSize, position, opponent, availablePositions, availableOpponents]);

  const handleSelectDeltaAxis = useCallback((axis: DeltaAxis) => {
    setDeltaAxis(axis);
    setDeltaTargetValue(getNextValue(axis));
    setDeltaAxisPickMode(false);
  }, [getNextValue]);

  const targetSpot = useMemo((): SpotDescriptor => {
    if (!deltaAxis || !deltaTargetValue) return currentSpot;
    if (deltaAxis === 'stackSize') return { ...currentSpot, stackSize: deltaTargetValue as StackSize };
    if (deltaAxis === 'position') return { ...currentSpot, position: deltaTargetValue as Position };
    if (deltaAxis === 'opponent') return { ...currentSpot, opponent: deltaTargetValue as Position };
    return currentSpot;
  }, [currentSpot, deltaAxis, deltaTargetValue]);

  const deltaTargetOptions = useMemo(() => {
    if (!deltaAxis) return [];
    if (deltaAxis === 'stackSize') {
      return STACK_SIZES.filter(s =>
        s.value !== stackSize && getRangeForSpot({ ...currentSpot, stackSize: s.value }) !== null
      );
    }
    if (deltaAxis === 'position') {
      return availablePositions
        .filter(p => p !== position && getRangeForSpot({ ...currentSpot, position: p }) !== null)
        .map(p => ({ value: p, label: p }));
    }
    if (deltaAxis === 'opponent') {
      return availableOpponents
        .filter(p => p !== opponent && getRangeForSpot({ ...currentSpot, opponent: p }) !== null)
        .map(p => ({ value: p, label: p }));
    }
    return [];
  }, [deltaAxis, stackSize, position, opponent, currentSpot, availablePositions, availableOpponents]);

  useEffect(() => {
    if (!deltaAxis || deltaTargetOptions.length === 0) {
      setDeltaTargetValue(null);
      return;
    }
    if (deltaTargetValue && deltaTargetOptions.some(o => o.value === deltaTargetValue)) return;
    setDeltaTargetValue(deltaTargetOptions[0]?.value ?? null);
  }, [deltaAxis, deltaTargetOptions, deltaTargetValue]);

  // Sync delta state to URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (deltaAxis) {
      if (params.get('delta') !== deltaAxis) { params.set('delta', deltaAxis); changed = true; }
      if (deltaTargetValue) {
        if (params.get('deltaTarget') !== deltaTargetValue) { params.set('deltaTarget', deltaTargetValue); changed = true; }
      } else {
        if (params.has('deltaTarget')) { params.delete('deltaTarget'); changed = true; }
      }
    } else {
      if (params.has('delta')) { params.delete('delta'); changed = true; }
      if (params.has('deltaTarget')) { params.delete('deltaTarget'); changed = true; }
    }

    if (changed) {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [deltaAxis, deltaTargetValue, pathname, router]);

  const startRange = useMemo(() => getRangeForSpot(currentSpot), [currentSpot]);
  const targetRange = useMemo((): ReturnType<typeof getRangeForSpot> => {
    if (!deltaAxis || !deltaTargetValue) return null;
    return getRangeForSpot(targetSpot);
  }, [deltaAxis, deltaTargetValue, targetSpot]);

  const hasValidTarget = targetRange !== null && startRange !== null;

  const diffHands = useMemo((): Set<string> => {
    if (!startRange || !targetRange) return new Set();
    return getDiffHands(startRange, targetRange);
  }, [startRange, targetRange]);

  const nonDiffHands = useMemo((): Set<string> => {
    if (!startRange || !targetRange) return new Set(ALL_HANDS);
    const nonDiff = new Set<string>();
    ALL_HANDS.forEach(h => {
      if (!diffHands.has(h)) nonDiff.add(h);
    });
    return nonDiff;
  }, [diffHands, startRange, targetRange]);

  const toggleDelta = useCallback(() => {
    if (deltaAxis) {
      setDeltaAxis(null);
      setDeltaTargetValue(null);
      setDeltaAxisPickMode(false);
    } else {
      setDeltaAxisPickMode(prev => !prev);
    }
  }, [deltaAxis]);

  const resetDelta = useCallback(() => {
    setDeltaAxis(null);
    setDeltaTargetValue(null);
    setDeltaAxisPickMode(false);
  }, []);

  const deltaActive = deltaAxis !== null;

  return {
    deltaActive,
    deltaAxisPickMode,
    deltaAxis,
    deltaTargetValue,
    startRange,
    targetRange,
    hasValidTarget,
    diffHands,
    nonDiffHands,
    deltaTargetOptions,
    targetSpot,
    toggleDelta,
    setDeltaAxisPickMode,
    handleSelectDeltaAxis,
    setDeltaTargetValue,
    resetDelta,
  };
}
