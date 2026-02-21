import type { RangeData } from '@/types';
import { CATEGORY_CONFIG, type HandCategory } from '@/data/hands';
import { ComboCards } from './ComboCards';
import type { Suit, CardVariant } from './PlayingCard';

interface CategoryFloorProps {
  category: HandCategory;
  rangeData: RangeData;
  variant?: CardVariant;
}

type CardDescriptor = { rank: string; suit: Suit };

interface Segment {
  floor: string;
  ceiling: string;
  /** True if this segment includes the strongest hand in the category (open-ended upward). */
  touchesTop: boolean;
}

/**
 * Splits the category's hand list into continuous runs of playable hands.
 * Hands is ordered low-to-high; a segment is a maximal unbroken run of non-fold/non-black hands.
 */
function getPlayableSegments(hands: string[], rangeData: RangeData): Segment[] {
  const segments: Segment[] = [];
  let segStart: number | null = null;

  for (let i = 0; i < hands.length; i++) {
    const action = rangeData[hands[i] as keyof RangeData];
    const isPlayable = action !== 'fold' && action !== 'black';

    if (isPlayable && segStart === null) {
      segStart = i;
    } else if (!isPlayable && segStart !== null) {
      segments.push({ floor: hands[segStart], ceiling: hands[i - 1], touchesTop: false });
      segStart = null;
    }
  }

  // Close any segment still open at the end of the list
  if (segStart !== null) {
    segments.push({ floor: hands[segStart], ceiling: hands[hands.length - 1], touchesTop: true });
  }

  return segments;
}

/**
 * Returns the front and back card descriptors for a given category and floor hand.
 * - Pocket pairs:        same rank, clubs + spades
 * - Suited aces:         two ranks, both diamonds
 * - Suited connectors:   two ranks, both hearts
 * - Offsuit aces:        two ranks, clubs + hearts (mixed suits = offsuit)
 * - Suited one-gappers:  two ranks, both spades
 */
function getCards(category: HandCategory, floor: string): [CardDescriptor, CardDescriptor] {
  switch (category) {
    case 'pocketPairs':
      return [
        { rank: floor[0], suit: 'diamonds' },
        { rank: floor[0], suit: 'clubs' },
      ];
    case 'axSuited':
      return [
        { rank: floor[0], suit: 'diamonds' },
        { rank: floor[1], suit: 'diamonds' },
      ];
    case 'suitedConnectors':
      return [
        { rank: floor[0], suit: 'diamonds' },
        { rank: floor[1], suit: 'diamonds' },
      ];
    case 'axOffsuit':
      return [
        { rank: floor[0], suit: 'clubs' },
        { rank: floor[1], suit: 'diamonds' },
      ];
    case 'suitedOneGappers':
      return [
        { rank: floor[0], suit: 'diamonds' },
        { rank: floor[1], suit: 'diamonds' },
      ];
    default:
      return [
        { rank: floor[0], suit: 'clubs' },
        { rank: floor[1], suit: 'clubs' },
      ];
  }
}

/**
 * Renders a labelled column showing one ComboCards badge per continuous playable segment.
 * Only the top-most segment (touching the strongest hand) shows the "+" sign.
 * Returns null if the category has no playable hands.
 */
export function CategoryFloor({ category, rangeData, variant = 'traditional' }: CategoryFloorProps) {
  const config = CATEGORY_CONFIG[category];
  const segments = getPlayableSegments(config.hands, rangeData);

  if (segments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-cream-muted uppercase tracking-wide">
        {config.shortName}
      </span>
      <div className="flex flex-wrap gap-3">
        {segments.map(segment => (
          <div key={segment.floor} className="flex items-center gap-1">
            <ComboCards
              cards={getCards(category, segment.floor)}
              showPlus={segment.touchesTop}
              variant={variant}
            />
            {/* Bounded segment: show ceiling cards with a dash separator */}
            {!segment.touchesTop && segment.ceiling !== segment.floor && (
              <>
                <span className="-ml-3 text-xl font-bold text-cream-muted leading-none">–</span>
                <ComboCards
                  cards={getCards(category, segment.ceiling)}
                  showPlus={false}
                  variant={variant}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
