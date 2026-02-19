'use client';

import { useState, useCallback } from 'react';
import type { SimpleAction, HandAction, BlendedAction, QuizAction } from '@/types';
import { isSimpleAction, getBlendType, getPrimaryAction } from '@/types';
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
  initializeWithBlackHands: (rangeData: Record<string, unknown>) => void;
  initializeForVsRaise: (rangeData: Record<string, unknown>) => void;
  initializeFromSolverChart: (rangeData: Record<string, HandAction>) => void;
  fillRemainingAsFold: () => void;
  filledCount: number;
  playableCount: number;
  totalCells: number;
  allFilled: boolean;
}

/**
 * Hook for managing user selections on the range chart (Builder mode).
 * Supports both simple actions and blended actions.
 * @param initialData - Optional initial data to populate selections
 */
export function useRangeSelections(initialData?: Record<string, HandAction>): UseRangeSelectionsReturn {
  const [userSelections, setUserSelections] = useState<BuilderSelections>(() => {
    const initial: BuilderSelections = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = initialData?.[hand] ?? null;
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
  // Initialize with 'fold' to avoid visual flash from null → fold on first render
  const [userSelections, setUserSelections] = useState<QuizSelections>(() => {
    const initial: QuizSelections = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = 'fold';
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

  // Initialize quiz with black hands pre-filled (they don't need user input)
  const initializeWithBlackHands = useCallback((rangeData: Record<string, unknown>) => {
    setUserSelections(() => {
      const selections: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        const action = rangeData[hand];
        if (action === 'black') {
          // Black hands are pre-filled - not part of the quiz
          selections[hand] = 'black';
        } else {
          // All other hands start as 'fold'
          selections[hand] = 'fold';
        }
      });
      return selections;
    });
  }, []);

  // Vs Raise: start with empty tiles (only black pre-filled)
  const initializeForVsRaise = useCallback((rangeData: Record<string, unknown>) => {
    setUserSelections(() => {
      const selections: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        const action = rangeData[hand];
        if (action === 'black') {
          selections[hand] = 'black';
        } else {
          selections[hand] = null;
        }
      });
      return selections;
    });
  }, []);

  // Delta Mode: fill chart with solver truth (black, simple, or blend type)
  const initializeFromSolverChart = useCallback((rangeData: Record<string, HandAction>) => {
    setUserSelections(() => {
      const selections: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        const action = rangeData[hand];
        if (action === 'black') {
          selections[hand] = 'black';
        } else if (isSimpleAction(action)) {
          selections[hand] = action;
        } else {
          const blendType = getBlendType(action);
          selections[hand] = blendType ?? getPrimaryAction(action);
        }
      });
      return selections;
    });
  }, []);

  // Set all currently empty (null) cells to fold; leaves black and already-filled cells unchanged
  const fillRemainingAsFold = useCallback(() => {
    setUserSelections(prev => {
      const next: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        next[hand] = prev[hand] === null ? 'fold' : prev[hand];
      });
      return next;
    });
  }, []);

  // Count filled cells (excluding black which is pre-filled and not user input)
  const filledCount = Object.values(userSelections).filter(v => v !== null).length;
  // Count playable cells (excluding black hands)
  const playableCount = Object.values(userSelections).filter(v => v !== 'black').length;
  const totalCells = ALL_HANDS.length;
  // All filled when all playable cells are filled (black doesn't count as needing to be filled)
  const allFilled = filledCount === totalCells;

  return {
    userSelections,
    setCell,
    clearSelections,
    resetToFold,
    initializeWithBlackHands,
    initializeForVsRaise,
    initializeFromSolverChart,
    fillRemainingAsFold,
    filledCount,
    playableCount,
    totalCells,
    allFilled,
  };
}

interface UseDeltaSelectionsReturn {
  userSelections: QuizSelections;
  setCell: (hand: string, action: QuizAction | null) => void;
  userPaintedHands: Set<string>;
  initializeFromStartRange: (rangeData: Record<string, HandAction>) => void;
  clearSelections: () => void;
  fillRemainingAsFold: () => void;
  filledCount: number;
  totalCells: number;
}

/**
 * Hook for managing user selections in Delta Mode.
 * Tracks which cells have been explicitly painted by the user (vs pre-populated from start range).
 */
export function useDeltaSelections(): UseDeltaSelectionsReturn {
  const [userSelections, setUserSelections] = useState<QuizSelections>(() => {
    const initial: QuizSelections = {};
    ALL_HANDS.forEach(hand => {
      initial[hand] = null;
    });
    return initial;
  });

  const [userPaintedHands, setUserPaintedHands] = useState<Set<string>>(new Set());

  const setCell = useCallback((hand: string, action: QuizAction | null) => {
    setUserSelections(prev => ({ ...prev, [hand]: action }));
    setUserPaintedHands(prev => new Set([...prev, hand]));
  }, []);

  // Populate from start range data and clear user-painted tracking
  const initializeFromStartRange = useCallback((rangeData: Record<string, HandAction>) => {
    setUserSelections(() => {
      const selections: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        const action = rangeData[hand];
        if (action === 'black') {
          selections[hand] = 'black';
        } else if (isSimpleAction(action)) {
          selections[hand] = action;
        } else {
          const blendType = getBlendType(action);
          selections[hand] = blendType ?? getPrimaryAction(action);
        }
      });
      return selections;
    });
    setUserPaintedHands(new Set());
  }, []);

  const clearSelections = useCallback(() => {
    setUserSelections(() => {
      const blank: QuizSelections = {};
      ALL_HANDS.forEach(hand => { blank[hand] = null; });
      return blank;
    });
    setUserPaintedHands(new Set());
  }, []);

  const fillRemainingAsFold = useCallback(() => {
    setUserSelections(prev => {
      const next: QuizSelections = {};
      ALL_HANDS.forEach(hand => {
        next[hand] = prev[hand] === null ? 'fold' : prev[hand];
      });
      return next;
    });
  }, []);

  const filledCount = Object.values(userSelections).filter(v => v !== null && v !== 'black').length;
  const totalCells = ALL_HANDS.length;

  return {
    userSelections,
    setCell,
    userPaintedHands,
    initializeFromStartRange,
    clearSelections,
    fillRemainingAsFold,
    filledCount,
    totalCells,
  };
}
