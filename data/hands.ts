import { RANKS, type Rank, type QuizAction } from '@/types';

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

// ============================================
// Category Floor Functions (for wheel picker)
// ============================================

// Category type for in-chart category selection
export type HandCategory = 'pocketPairs' | 'axSuited' | 'axOffsuit' | 'suitedKings' | 'suitedConnectors' | 'suitedOneGappers';

// Pocket pairs ordered low-to-high for "X+" floor semantics
export const POCKET_PAIRS_LOW_TO_HIGH = ['22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA'];

// Ax suited ordered low-to-high (A2s to AKs)
export const AX_SUITED_LOW_TO_HIGH = ['A2s', 'A3s', 'A4s', 'A5s', 'A6s', 'A7s', 'A8s', 'A9s', 'ATs', 'AJs', 'AQs', 'AKs'];

// Ax offsuit ordered low-to-high (A2o to AKo)
export const AX_OFFSUIT_LOW_TO_HIGH = ['A2o', 'A3o', 'A4o', 'A5o', 'A6o', 'A7o', 'A8o', 'A9o', 'ATo', 'AJo', 'AQo', 'AKo'];

// Suited kings ordered low-to-high (K2s to KQs)
export const SUITED_KINGS_LOW_TO_HIGH = ['K2s', 'K3s', 'K4s', 'K5s', 'K6s', 'K7s', 'K8s', 'K9s', 'KTs', 'KJs', 'KQs'];

// Suited connectors ordered low-to-high (32s to JTs)
export const SUITED_CONNECTORS_LOW_TO_HIGH = ['32s', '43s', '54s', '65s', '76s', '87s', '98s', 'T9s', 'JTs'];

// Suited one-gappers ordered low-to-high (42s to T8s)
export const SUITED_ONE_GAPPERS_LOW_TO_HIGH = ['42s', '53s', '64s', '75s', '86s', '97s', 'T8s'];

// Category configuration
export const CATEGORY_CONFIG: Record<HandCategory, {
  name: string;
  shortName: string;
  hands: string[];
  formatLabel: (hand: string) => string;
}> = {
  pocketPairs: {
    name: 'Pocket Pairs',
    shortName: 'Pairs',
    hands: POCKET_PAIRS_LOW_TO_HIGH,
    formatLabel: (hand) => `${hand}+`,
  },
  axSuited: {
    name: 'Ax Suited',
    shortName: 'Suited Aces',
    hands: AX_SUITED_LOW_TO_HIGH,
    formatLabel: (hand) => `${hand.replace('s', '')}s+`,
  },
  axOffsuit: {
    name: 'Ax Offsuit',
    shortName: 'Offsuit Aces',
    hands: AX_OFFSUIT_LOW_TO_HIGH,
    formatLabel: (hand) => `${hand.replace('o', '')}o+`,
  },
  suitedKings: {
    name: 'Suited Kings',
    shortName: 'Suited Kings',
    hands: SUITED_KINGS_LOW_TO_HIGH,
    formatLabel: (hand) => `${hand.replace('s', '')}s+`,
  },
  suitedConnectors: {
    name: 'Suited Connectors',
    shortName: 'Suited Connectors',
    hands: SUITED_CONNECTORS_LOW_TO_HIGH,
    formatLabel: (hand) => `${hand}+`,
  },
  suitedOneGappers: {
    name: 'Suited 1-Gappers',
    shortName: 'Suited 1-Gappers',
    hands: SUITED_ONE_GAPPERS_LOW_TO_HIGH,
    formatLabel: (hand) => `${hand}+`,
  },
};

// Priority order when a hand belongs to multiple categories (1 = highest)
const CATEGORY_PRIORITY: HandCategory[] = [
  'pocketPairs',
  'axSuited',
  'axOffsuit',
  'suitedKings',
  'suitedConnectors',
  'suitedOneGappers',
];

/**
 * Resolve which category a hand belongs to (for in-chart category selection).
 */
export function getCategoryForHand(hand: string): HandCategory | null {
  for (const category of CATEGORY_PRIORITY) {
    if (CATEGORY_CONFIG[category].hands.includes(hand)) {
      return category;
    }
  }
  return null;
}

/**
 * Get all hands in a category at or above a floor (inclusive).
 * E.g., for pocketPairs with "55" returns ["55", "66", ..., "AA"]
 * E.g., for axSuited with "A5s" returns ["A5s", "A6s", ..., "AKs"]
 */
export function getCategoryHandsAtOrAboveFloor(category: HandCategory, floor: string): string[] {
  const hands = CATEGORY_CONFIG[category].hands;
  const floorIndex = hands.indexOf(floor);
  if (floorIndex === -1) return [];
  return hands.slice(floorIndex);
}

/**
 * Get all hands in a category below a floor (exclusive).
 */
export function getCategoryHandsBelowFloor(category: HandCategory, floor: string): string[] {
  const hands = CATEGORY_CONFIG[category].hands;
  const floorIndex = hands.indexOf(floor);
  if (floorIndex === -1) return [];
  return hands.slice(0, floorIndex);
}

/**
 * Detect the continuous floor from the top of a category.
 * Returns the floor (lowest hand in the continuous run from top) and any exceptions below.
 * 
 * E.g., if AKs, AQs, AJs, ATs, A9s, A8s are raise, and A7s, A6s, A5s are also raise but A4s-A2s are fold:
 * - floor: "A8s" (continuous from top)
 * - exceptions: ["A7s", "A6s", "A5s"] (selected but below the continuous range)
 */
export function detectCategoryFloorWithExceptions(
  category: HandCategory,
  selections: Record<string, QuizAction | null>,
  action: QuizAction
): { floor: string | null; exceptions: string[] } {
  const hands = CATEGORY_CONFIG[category].hands;
  
  // Find the continuous range from the top (strongest hand)
  // hands array is low-to-high, so we iterate from the end
  let continuousFloorIndex: number = -1;
  
  // Start from the strongest hand (end of array) and find where the continuous run breaks
  for (let i = hands.length - 1; i >= 0; i--) {
    const hand = hands[i];
    if (selections[hand] === action) {
      continuousFloorIndex = i;
    } else {
      // Gap found - stop here
      break;
    }
  }
  
  // No hands have this action from the top
  if (continuousFloorIndex === -1) {
    // Check if there are any exceptions (hands with action but not continuous from top)
    const exceptions: string[] = [];
    for (let i = 0; i < hands.length; i++) {
      if (selections[hands[i]] === action) {
        exceptions.push(hands[i]);
      }
    }
    return { floor: null, exceptions };
  }
  
  // Find exceptions (hands with the action below the continuous floor)
  const exceptions: string[] = [];
  for (let i = 0; i < continuousFloorIndex; i++) {
    if (selections[hands[i]] === action) {
      exceptions.push(hands[i]);
    }
  }
  
  return { floor: hands[continuousFloorIndex], exceptions };
}

/**
 * Detect if current selections represent a clean "X+" pattern for a category.
 * Returns the floor if pattern matches, or null if no clean floor pattern exists.
 * @deprecated Use detectCategoryFloorWithExceptions for better UX
 */
export function detectCategoryFloor(
  category: HandCategory,
  selections: Record<string, QuizAction | null>,
  action: QuizAction
): string | null {
  const { floor, exceptions } = detectCategoryFloorWithExceptions(category, selections, action);
  // Only return floor if there are no exceptions (clean pattern)
  return exceptions.length === 0 ? floor : null;
}

// Legacy functions for backwards compatibility
export function getPocketPairsAtOrAboveFloor(floor: string): string[] {
  return getCategoryHandsAtOrAboveFloor('pocketPairs', floor);
}

export function getPocketPairsBelowFloor(floor: string): string[] {
  return getCategoryHandsBelowFloor('pocketPairs', floor);
}

export function detectPocketPairFloor(
  selections: Record<string, QuizAction | null>,
  action: QuizAction
): string | null {
  return detectCategoryFloor('pocketPairs', selections, action);
}
