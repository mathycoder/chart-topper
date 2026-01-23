'use client';

import { RANKS } from '@/types';
import type { SimpleAction, RangeData } from '@/types';
import { getHandName } from '@/data/hands';
import { HandCell } from './HandCell';

interface RangeChartProps {
  /** User's current selections for each hand */
  userSelections: Record<string, SimpleAction | null>;
  /** The correct answers (only used after submission) */
  correctRange?: RangeData;
  /** Whether the quiz has been submitted */
  isSubmitted: boolean;
  /** Whether the user is currently painting */
  isPainting: boolean;
  /** The currently selected action/brush */
  selectedAction: SimpleAction | null;
  /** Callback when a cell is painted */
  onPaint: (hand: string) => void;
  /** Callback when painting starts */
  onPaintStart: (hand: string) => void;
}

/**
 * The 13x13 poker range chart grid.
 * 
 * Layout:
 * - Rows represent the first card (A through 2)
 * - Columns represent the second card (A through 2)
 * - Diagonal = pocket pairs (AA, KK, etc.)
 * - Above diagonal = suited hands (AKs, AQs, etc.)
 * - Below diagonal = offsuit hands (AKo, AQo, etc.)
 */
export function RangeChart({
  userSelections,
  correctRange,
  isSubmitted,
  isPainting,
  selectedAction,
  onPaint,
  onPaintStart,
}: RangeChartProps) {
  return (
    <div 
      className="grid gap-0.5 p-2 bg-slate-100 rounded-lg shadow-inner"
      style={{
        gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(13, minmax(0, 1fr))',
      }}
    >
      {RANKS.map((_, rowIndex) =>
        RANKS.map((_, colIndex) => {
          const hand = getHandName(rowIndex, colIndex);
          return (
            <HandCell
              key={hand}
              hand={hand}
              userAction={userSelections[hand] ?? null}
              correctAction={correctRange?.[hand]}
              isSubmitted={isSubmitted}
              isPainting={isPainting}
              selectedAction={selectedAction}
              onPaint={onPaint}
              onPaintStart={onPaintStart}
            />
          );
        })
      )}
    </div>
  );
}

export default RangeChart;
