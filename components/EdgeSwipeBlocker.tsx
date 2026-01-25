'use client';

import { useEffect } from 'react';

/**
 * Blocks iOS Safari's edge swipe back/forward navigation gesture.
 * 
 * iOS Safari triggers navigation when touches start within ~20px of the screen edge.
 * This component adds a document-level touch listener that prevents default on 
 * edge touches, blocking the gesture.
 * 
 * Based on: https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4
 */
export function EdgeSwipeBlocker() {
  useEffect(() => {
    const EDGE_THRESHOLD = 30; // pixels from edge to block

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const { pageX } = touch;
      const viewportWidth = window.innerWidth;

      // Check if touch is near left or right edge
      const isNearLeftEdge = pageX < EDGE_THRESHOLD;
      const isNearRightEdge = pageX > viewportWidth - EDGE_THRESHOLD;

      if (isNearLeftEdge || isNearRightEdge) {
        e.preventDefault();
      }
    };

    // Must use { passive: false } to allow preventDefault()
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return null;
}

export default EdgeSwipeBlocker;
