import { RANKS, type Rank } from '@/types';

// ============================================
// Hand Name Generation
// ============================================

/**
 * Generates the hand combo name from row and column indices.
 * 
 * The 13x13 grid has a specific structure:
 * - Diagonal (row === col): Pocket pairs (AA, KK, QQ...)
 * - Above diagonal (col > row): Suited hands (AKs, AQs...)
 * - Below diagonal (row > col): Offsuit hands (AKo, AQo...)
 * 
 * @param rowIndex - Row index (0-12, where 0 = A, 12 = 2)
 * @param colIndex - Column index (0-12, where 0 = A, 12 = 2)
 * @returns Hand combo string like "AA", "AKs", or "AKo"
 */
export function getHandName(rowIndex: number, colIndex: number): string {
  const rowRank = RANKS[rowIndex];
  const colRank = RANKS[colIndex];

  if (rowIndex === colIndex) {
    // Pocket pair - same rank twice
    return `${rowRank}${colRank}`;
  } else if (colIndex > rowIndex) {
    // Above diagonal - suited (row card first, then column card + 's')
    return `${rowRank}${colRank}s`;
  } else {
    // Below diagonal - offsuit (column card first, then row card + 'o')
    // Note: We keep the higher card first for conventional notation
    return `${colRank}${rowRank}o`;
  }
}

// ============================================
// All 169 Hand Combinations
// ============================================

/**
 * Generates all 169 unique hand combinations in standard order.
 * Order follows the grid: left-to-right, top-to-bottom.
 */
export function generateAllHands(): string[] {
  const hands: string[] = [];
  
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      hands.push(getHandName(row, col));
    }
  }
  
  return hands;
}

// Pre-computed list of all 169 hands
export const ALL_HANDS = generateAllHands();

// ============================================
// Hand Categories
// ============================================

// All 13 pocket pairs
export const POCKET_PAIRS = RANKS.map(rank => `${rank}${rank}`);

// All 78 suited hands (above diagonal)
export const SUITED_HANDS: string[] = [];
for (let row = 0; row < 13; row++) {
  for (let col = row + 1; col < 13; col++) {
    SUITED_HANDS.push(`${RANKS[row]}${RANKS[col]}s`);
  }
}

// All 78 offsuit hands (below diagonal)
export const OFFSUIT_HANDS: string[] = [];
for (let row = 1; row < 13; row++) {
  for (let col = 0; col < row; col++) {
    OFFSUIT_HANDS.push(`${RANKS[col]}${RANKS[row]}o`);
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Checks if a hand is a pocket pair
 */
export function isPocketPair(hand: string): boolean {
  return hand.length === 2 && hand[0] === hand[1];
}

/**
 * Checks if a hand is suited
 */
export function isSuited(hand: string): boolean {
  return hand.endsWith('s');
}

/**
 * Checks if a hand is offsuit
 */
export function isOffsuit(hand: string): boolean {
  return hand.endsWith('o');
}

/**
 * Gets the grid position [row, col] for a given hand combo
 */
export function getHandPosition(hand: string): [number, number] {
  const rank1 = hand[0] as Rank;
  const rank2 = hand[1] as Rank;
  
  const idx1 = RANKS.indexOf(rank1);
  const idx2 = RANKS.indexOf(rank2);
  
  if (isPocketPair(hand)) {
    return [idx1, idx1];
  } else if (isSuited(hand)) {
    // Suited: first rank is row, second is column
    return [idx1, idx2];
  } else {
    // Offsuit: second rank is row, first is column
    return [idx2, idx1];
  }
}
