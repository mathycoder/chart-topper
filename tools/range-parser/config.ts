export type Box = { x: number; y: number; w: number; h: number };

export type RangeChartConfig = {
  // Crop region that contains ONLY the 13x13 grid (no legend).
  gridBox: Box;

  // Three legend boxes (solid color areas), cropped to avoid text.
  // For grid-only screenshots, sample from known solid-color cells.
  legend: {
    raiseBox: Box;
    callBox: Box;
    foldBox: Box;
  };

  // Some charts have thick borders; we ignore outer % of each cell.
  cellInsetPct: number; // e.g. 0.12
};

// Config for GRID-ONLY screenshots (no legend/title)
// Parser auto-detects image dimensions when gridBox starts near origin
export const DEFAULT_CONFIG: RangeChartConfig = {
  // Setting x,y near 0 tells parser to use full image dimensions
  // This makes the parser work with any image size
  gridBox: { x: 0, y: 0, w: 0, h: 0 },
  legend: {
    // These are ignored when gridBox is at origin - parser samples from cells directly
    // AA (row 0, col 0) for raise, 99 (row 5, col 5) for call, A2s (row 0, col 12) for fold
    raiseBox: { x: 0, y: 0, w: 0, h: 0 },
    callBox: { x: 0, y: 0, w: 0, h: 0 },
    foldBox: { x: 0, y: 0, w: 0, h: 0 },
  },
  cellInsetPct: 0.15,
};
