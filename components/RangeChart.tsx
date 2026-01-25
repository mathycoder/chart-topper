'use client';

import { RANKS } from '@/types';
import type { SimpleAction, RangeData, HandAction, QuizAction } from '@/types';
import { getHandName } from '@/data/hands';
import { HandCell } from './HandCell';

interface RangeChartProps {
  /** User's current selections for each hand (can be simple, blended, or quiz action) */
  userSelections: Record<string, HandAction | QuizAction | null>;
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
  /** Whether to show correct answers instead of user selections (for toggle) */
  showCorrectAnswers?: boolean;
  /** Whether blend mode is active (cells respond to clicks without selectedAction) */
  blendMode?: boolean;
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
  showCorrectAnswers = false,
  blendMode = false,
}: RangeChartProps) {
  return (
    <div 
      className="grid rounded-sm shadow-inner overflow-hidden"
      style={{
        gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(13, minmax(0, 1fr))',
      }}
    >
      {RANKS.map((_, rowIndex) =>
        RANKS.map((_, colIndex) => {
          const hand = getHandName(rowIndex, colIndex);
          const userAction = userSelections[hand] ?? null;
          
          return (
            <HandCell
              key={hand}
              hand={hand}
              userAction={userAction}
              correctAction={correctRange?.[hand]}
              isSubmitted={isSubmitted}
              isPainting={isPainting}
              selectedAction={selectedAction}
              onPaint={onPaint}
              onPaintStart={onPaintStart}
              displayAction={showCorrectAnswers ? correctRange?.[hand] : undefined}
              blendMode={blendMode}
            />
          );
        })
      )}
    </div>
  );
}

export default RangeChart;
