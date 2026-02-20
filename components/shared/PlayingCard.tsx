import { cn } from '@/lib/utils';

export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type CardVariant = 'traditional' | 'simple';

const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

interface PlayingCardProps {
  rank: string;
  suit: Suit;
  variant?: CardVariant;
  className?: string;
}

/**
 * A mini playing card in one of two visual styles:
 * - "traditional": white card with corner rank/suit indices and a center pip
 * - "simple": dark gradient card with a large centered rank and suit symbol stacked
 */
export function PlayingCard({ rank, suit, variant = 'traditional', className }: PlayingCardProps) {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const symbol = SUIT_SYMBOL[suit];

  if (variant === 'simple') {
    const suitColor = isRed ? 'text-red-500' : 'text-slate-800';
    return (
      <div
        className={cn(
          'relative w-8 h-11 rounded-lg border border-slate-300 shadow-lg select-none overflow-hidden',
          'bg-white',
          className
        )}
      >
        {/* Rank pinned to top-left */}
        <span className={cn('absolute top-0.5 left-1 text-sm font-bold leading-none', suitColor)}>{rank}</span>
        {/* Suit symbol in lower portion */}
        <div className={cn('absolute inset-0 flex items-end justify-center pb-1 text-xl', suitColor)}>
          {symbol}
        </div>
      </div>
    );
  }

  const textColor = isRed ? 'text-red-600' : 'text-slate-900';

  return (
    <div
      className={cn(
        'relative w-8 h-11 bg-white rounded-lg border border-slate-300 shadow-md select-none overflow-hidden',
        className
      )}
    >
      {/* Top-left index */}
      <div className={cn('absolute top-0.5 left-0.5 flex flex-col items-center leading-none', textColor)}>
        <span className="text-xs font-bold leading-none">{rank}</span>
        <span className="text-[9px] leading-none">{symbol}</span>
      </div>

      {/* Center pip */}
      <div className={cn('absolute inset-0 flex items-center justify-center text-sm', textColor)}>
        {symbol}
      </div>

      {/* Bottom-right index (rotated 180°) */}
      <div
        className={cn(
          'absolute bottom-0.5 right-0.5 flex flex-col items-center leading-none rotate-180',
          textColor
        )}
      >
        <span className="text-xs font-bold leading-none">{rank}</span>
        <span className="text-[9px] leading-none">{symbol}</span>
      </div>
    </div>
  );
}
