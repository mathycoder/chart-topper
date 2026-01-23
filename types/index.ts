// ============================================
// Poker Range Types
// ============================================

// The 13 card ranks in standard poker order (high to low)
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export type Rank = (typeof RANKS)[number];

// ============================================
// Hand Actions
// ============================================

// Simple action - 100% one choice
export type SimpleAction = 'raise' | 'call' | 'fold';

// Blended action - percentages for mixed strategies (must sum to 100)
export type BlendedAction = {
  raise?: number; // 0-100
  call?: number;  // 0-100
  fold?: number;  // 0-100
};

// Hand entry can be simple OR blended
export type HandAction = SimpleAction | BlendedAction;

// Type guard to check if an action is simple (string) vs blended (object)
export function isSimpleAction(action: HandAction): action is SimpleAction {
  return typeof action === 'string';
}

// ============================================
// Hand Combinations (169 total)
// ============================================

// Generate all pocket pair combinations (AA, KK, QQ, etc.)
type PocketPair = `${Rank}${Rank}`;

// For suited and offsuit, we need distinct first and second cards
// This is a simplified type - the full 169 combos are defined in hands.ts
export type HandCombo = string;

// ============================================
// Range Data Structure
// ============================================

// Full range data for one chart - maps each hand combo to its action
export type RangeData = Record<string, HandAction>;

// Stack size categories
export type StackSize = '10bb' | '20bb' | '40bb' | '80bb';

// Table positions (8-max)
export type Position = 'UTG' | 'UTG+1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

// Scenario types - what situation is this range for?
export type Scenario = 'rfi' | 'vs-3bet' | 'vs-4bet' | 'after-limp' | 'vs-raise';

// Range metadata - describes what situation this range applies to
export type RangeMeta = {
  stackSize: StackSize;
  position: Position;
  scenario: Scenario;
  displayName: string; // Human-readable: "80bb+ UTG - Raise First In"
};

// Complete poker range with metadata and data
export type PokerRange = {
  meta: RangeMeta;
  data: RangeData;
};

// ============================================
// UI State Types
// ============================================

// User's selections while building a range
export type UserSelections = Record<string, SimpleAction | null>;

// Result of checking user's answers against the correct range
export type CheckResult = {
  correct: number;
  incorrect: number;
  total: number;
  percentage: number;
  details: Record<string, { userAnswer: SimpleAction | null; correctAnswer: HandAction; isCorrect: boolean }>;
};
