'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SimpleAction } from '@/types';

interface UsePaintingReturn {
  isPainting: boolean;
  selectedAction: SimpleAction | null;
  setSelectedAction: (action: SimpleAction | null) => void;
  handlePaintStart: () => void;
  handlePaintEnd: () => void;
}

/**
 * Hook for managing the painting interaction state on the range chart.
 * Handles mouse and touch events and selected action state.
 */
export function usePainting(): UsePaintingReturn {
  const [isPainting, setIsPainting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SimpleAction | null>(null);

  const handlePaintStart = useCallback(() => {
    setIsPainting(true);
  }, []);

  const handlePaintEnd = useCallback(() => {
    setIsPainting(false);
  }, []);

  // Global mouseup and touchend listeners to stop painting
  useEffect(() => {
    const stopPainting = () => setIsPainting(false);
    document.addEventListener('mouseup', stopPainting);
    document.addEventListener('touchend', stopPainting);
    document.addEventListener('touchcancel', stopPainting);
    return () => {
      document.removeEventListener('mouseup', stopPainting);
      document.removeEventListener('touchend', stopPainting);
      document.removeEventListener('touchcancel', stopPainting);
    };
  }, []);

  return {
    isPainting,
    selectedAction,
    setSelectedAction,
    handlePaintStart,
    handlePaintEnd,
  };
}
