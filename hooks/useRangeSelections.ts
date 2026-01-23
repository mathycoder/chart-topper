'use client';

import { useState, useCallback } from 'react';
import type { SimpleAction } from '@/types';
import { ALL_HANDS } from '@/data/hands';

type Selections = Record<string, SimpleAction | null>;

interface UseRangeSelectionsReturn {
  userSelections: Selections;
  setCell: (hand: string, action: SimpleAction | null) => void;
  loadSelections: (data: Record<string, SimpleAction>) => void;
  clearSelections: () => void;
  filledCount: number;
  totalCells: number;
  allFilled: boolean;
}

/**
 * Hook for managing user selections on the range chart.
 * Tracks which hands have been assigned actions.
 */
export function useRangeSelections(): UseRangeSelectionsReturn {
  const [userSelections, setUserSelections] = useState<Selections>(() => {
    const initial: Selections = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  const setCell = useCallback((hand: string, action: SimpleAction | null) => {
    setUserSelections(prev => ({
      ...prev,
      [hand]: action,
    }));
  }, []);

  const loadSelections = useCallback((data: Record<string, SimpleAction>) => {
    setUserSelections(() => {
      const updated: Selections = {};
      ALL_HANDS.forEach(hand => {
        updated[hand] = data[hand] ?? null;
      });
      return updated;
    });
  }, []);

  const clearSelections = useCallback(() => {
    setUserSelections(() => {
      const blank: Selections = {};
      ALL_HANDS.forEach(hand => {
        blank[hand] = null;
      });
      return blank;
    });
  }, []);

  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  const totalCells = ALL_HANDS.length;
  const allFilled = filledCount === totalCells;

  return {
    userSelections,
    setCell,
    loadSelections,
    clearSelections,
    filledCount,
    totalCells,
    allFilled,
  };
}
