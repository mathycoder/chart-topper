'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SimpleAction } from '@/types';

interface UsePaintingReturn {
  isPainting: boolean;
  selectedAction: SimpleAction | null;
  setSelectedAction: (action: SimpleAction | null) => void;
  handlePaintStart: () => void;
}

/**
 * Hook for managing the painting interaction state on the range chart.
 * Handles mouse events and selected action state.
 */
export function usePainting(): UsePaintingReturn {
  const [isPainting, setIsPainting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SimpleAction | null>(null);

  const handlePaintStart = useCallback(() => {
    setIsPainting(true);
  }, []);

  // Global mouseup listener to stop painting
  useEffect(() => {
    const handleMouseUp = () => setIsPainting(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return {
    isPainting,
    selectedAction,
    setSelectedAction,
    handlePaintStart,
  };
}
