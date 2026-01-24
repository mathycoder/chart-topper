'use client';

import { useState, useCallback } from 'react';
import type { SimpleAction, HandAction, BlendedAction, QuizAction } from '@/types';
import { ALL_HANDS } from '@/data/hands';

// Builder mode selections can include blended actions
type BuilderSelections = Record<string, HandAction | null>;

// Quiz mode selections can include blend types
type QuizSelections = Record<string, QuizAction | null>;

interface UseRangeSelectionsReturn {
  userSelections: BuilderSelections;
  setCell: (hand: string, action: HandAction | null) => void;
  loadSelections: (data: Record<string, HandAction>) => void;
  clearSelections: () => void;
  resetToFold: () => void;
  filledCount: number;
  totalCells: number;
  allFilled: boolean;
}

interface UseQuizSelectionsReturn {
  userSelections: QuizSelections;
  setCell: (hand: string, action: QuizAction | null) => void;
  clearSelections: () => void;
  resetToFold: () => void;
  filledCount: number;
  totalCells: number;
  allFilled: boolean;
}

/**
 * Hook for managing user selections on the range chart (Builder mode).
 * Supports both simple actions and blended actions.
 */
export function useRangeSelections(): UseRangeSelectionsReturn {
  const [userSelections, setUserSelections] = useState<BuilderSelections>(() => {
    const initial: BuilderSelections = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  const setCell = useCallback((hand: string, action: HandAction | null) => {
    setUserSelections(prev => ({
      ...prev,
      [hand]: action,
    }));
  }, []);

  const loadSelections = useCallback((data: Record<string, HandAction>) => {
    setUserSelections(() => {
      const updated: BuilderSelections = {};
      ALL_HANDS.forEach(hand => {
        updated[hand] = data[hand] ?? null;
      });
      return updated;
    });
  }, []);

  const clearSelections = useCallback(() => {
    setUserSelections(() => {
      const blank: BuilderSelections = {};
      ALL_HANDS.forEach(hand => {
        blank[hand] = null;
      });
      return blank;
    });
  }, []);

  const resetToFold = useCallback(() => {
    setUserSelections(() => {
      const allFold: BuilderSelections = {};
      ALL_HANDS.forEach(hand => {
        allFold[hand] = 'fold';
      });
      return allFold;
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
    resetToFold,
    filledCount,
    totalCells,
    allFilled,
  };
}

/**
 * Hook for managing quiz selections (Quiz mode).
 * Supports simple actions and blend types for answering.
 */
export function useQuizSelections(): UseQuizSelectionsReturn {
  const [userSelections, setUserSelections] = useState<QuizSelections>(() => {
    const initial: QuizSelections = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  const setCell = useCallback((hand: string, action: QuizAction | null) => {
    setUserSelections(prev => ({
      ...prev,
      [hand]: action,
    }));
  }, []);

  const clearSelections = useCallback(() => {
    setUserSelections(() => {
      const blank: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        blank[hand] = null;
      });
      return blank;
    });
  }, []);

  const resetToFold = useCallback(() => {
    setUserSelections(() => {
      const allFold: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        allFold[hand] = 'fold';
      });
      return allFold;
    });
  }, []);

  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  const totalCells = ALL_HANDS.length;
  const allFilled = filledCount === totalCells;

  return {
    userSelections,
    setCell,
    clearSelections,
    resetToFold,
    filledCount,
    totalCells,
    allFilled,
  };
}
