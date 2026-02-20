import { cn } from '@/lib/utils';
import { PlayingCard, type Suit, type CardVariant } from './PlayingCard';

interface CardDescriptor {
  rank: string;
  suit: Suit;
}

interface ComboCardsProps {
  /** Tuple of two cards. Index 0 = higher card (peeks behind), index 1 = lower card (sits on top). */
  cards: [CardDescriptor, CardDescriptor];
  showPlus?: boolean;
  variant?: CardVariant;
}

/**
 * Displays two playing cards fanned/stacked like a hand being held.
 * The higher card (index 0) peeks out from behind; the lower card (index 1) sits on top.
 * Optionally shows a bold "+" to the right of the stack.
 */
export function ComboCards({ cards, showPlus, variant = 'traditional' }: ComboCardsProps) {
  const [higher, lower] = cards;

  const isSimple = variant === 'simple';

  return (
    <div className={cn('relative h-12', isSimple ? 'w-16' : 'w-12')}>
      {/* Higher card — peeks out behind, offset left, rotated counter-clockwise */}
      <div className="absolute top-1 left-0 -rotate-6 origin-bottom-right">
        <PlayingCard rank={higher.rank} suit={higher.suit} variant={variant} />
      </div>
      {/* Lower card — sits on top, offset right, rotated clockwise */}
      <div className={cn('absolute top-0 rotate-3 origin-bottom-left', isSimple ? 'left-5' : 'left-4')}>
        <PlayingCard rank={lower.rank} suit={lower.suit} variant={variant} />
      </div>
      {/* Plus sign — absolutely positioned, overlapping the front card's bottom-right */}
      {showPlus && (
        <span className="absolute top-2 right-0 z-20 text-xl font-bold text-slate-600 leading-none">
          +
        </span>
      )}
    </div>
  );
}
