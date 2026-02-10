'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Position, StackSize, Scenario } from '@/types';

interface UseUrlStateReturn {
  position: Position;
  stackSize: StackSize;
  scenario: Scenario;
  opponent: Position | null;
  caller: Position | null;
  assumeOpen: boolean;
  setAssumeOpen: (v: boolean) => void;
  setPosition: (p: Position) => void;
  setStackSize: (s: StackSize) => void;
  setScenario: (s: Scenario) => void;
  setOpponent: (o: Position | null) => void;
  setCaller: (c: Position | null) => void;
}

/**
 * Hook for syncing range parameters with URL search params.
 * Enables shareable/bookmarkable URLs for specific ranges.
 */
export function useUrlState(basePath: string): UseUrlStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [position, setPosition] = useState<Position>(
    (searchParams.get('position') as Position) || 'UTG'
  );
  const [stackSize, setStackSize] = useState<StackSize>(
    (searchParams.get('stackSize') as StackSize) || '80bb'
  );
  const [scenario, setScenario] = useState<Scenario>(
    (searchParams.get('scenario') as Scenario) || 'rfi'
  );
  const [opponent, setOpponent] = useState<Position | null>(
    (searchParams.get('opponent') as Position) || null
  );
  const [caller, setCaller] = useState<Position | null>(
    (searchParams.get('caller') as Position) || null
  );
  const [assumeOpen, setAssumeOpen] = useState<boolean>(
    basePath === '/' ? searchParams.get('assumeOpen') === '1' : false
  );

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('position', position);
    params.set('stackSize', stackSize);
    params.set('scenario', scenario);
    // Only include opponent in URL if scenario is not RFI
    if (scenario !== 'rfi' && opponent) {
      params.set('opponent', opponent);
    }
    // Only include caller in URL for vs-raise-call scenario
    if (scenario === 'vs-raise-call' && caller) {
      params.set('caller', caller);
    }
    // Quiz (home) only: persist Assume Open toggle
    if (basePath === '/') {
      if (assumeOpen) params.set('assumeOpen', '1');
    }
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }, [position, stackSize, scenario, opponent, caller, assumeOpen, router, basePath]);

  // Clear opponent when switching to RFI scenario
  useEffect(() => {
    if (scenario === 'rfi' && opponent !== null) {
      setOpponent(null);
    }
  }, [scenario, opponent]);

  // Clear caller when switching away from vs-raise-call scenario
  useEffect(() => {
    if (scenario !== 'vs-raise-call' && caller !== null) {
      setCaller(null);
    }
  }, [scenario, caller]);

  return {
    position,
    stackSize,
    scenario,
    opponent,
    caller,
    assumeOpen,
    setAssumeOpen,
    setPosition,
    setStackSize,
    setScenario,
    setOpponent,
    setCaller,
  };
}
