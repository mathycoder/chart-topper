'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Position, StackSize, Scenario } from '@/types';

interface UseUrlStateReturn {
  position: Position;
  stackSize: StackSize;
  scenario: Scenario;
  setPosition: (p: Position) => void;
  setStackSize: (s: StackSize) => void;
  setScenario: (s: Scenario) => void;
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

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('position', position);
    params.set('stackSize', stackSize);
    params.set('scenario', scenario);
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }, [position, stackSize, scenario, router, basePath]);

  return {
    position,
    stackSize,
    scenario,
    setPosition,
    setStackSize,
    setScenario,
  };
}
