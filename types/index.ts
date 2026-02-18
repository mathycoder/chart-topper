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
// 'black' = hand not in hero's range (excluded from grading)
export type SimpleAction = 'raise' | 'call' | 'fold' | 'shove' | 'black';

// Blended action - percentages for mixed strategies (must sum to 100)
export type BlendedAction = {
  raise?: number; // 0-100
  call?: number;  // 0-100
  fold?: number;  // 0-100
  shove?: number; // 0-100
};

// Hand entry can be simple OR blended
export type HandAction = SimpleAction | BlendedAction;

// Type guard to check if an action is simple (string) vs blended (object)
export function isSimpleAction(action: HandAction): action is SimpleAction {
  return typeof action === 'string';
}

// Helper: get the highest-frequency action from a blended strategy.
// Use this for grading in quiz mode when you don't want to deal with mixes yet.
export function getPrimaryAction(action: HandAction): SimpleAction {
  if (isSimpleAction(action)) return action;

  // Default missing keys to 0
  const raise = action.raise ?? 0;
  const call = action.call ?? 0;
  const fold = action.fold ?? 0;
  const shove = action.shove ?? 0;

  // Tie-break order: raise > call > fold > shove
  if (raise >= call && raise >= fold && raise >= shove) return 'raise';
  if (call >= fold && call >= shove) return 'call';
  if (fold >= shove) return 'fold';
  return 'shove';
}

// ============================================
// Blend Types (for Quiz Mode)
// ============================================

// Blend type identifies which actions are present in a mixed strategy
export type BlendType =
  | 'raise-call'
  | 'raise-fold'
  | 'call-fold'
  | 'raise-call-fold'
  | 'raise-shove'
  | 'call-shove'
  | 'fold-shove'
  | 'raise-call-shove'
  | 'raise-fold-shove'
  | 'call-fold-shove'
  | 'raise-call-fold-shove';

const ALL_BLEND_TYPES: BlendType[] = [
  'raise-call-fold-shove',
  'raise-call-shove',
  'raise-fold-shove',
  'call-fold-shove',
  'raise-call-fold',
  'raise-call',
  'raise-fold',
  'call-fold',
  'raise-shove',
  'call-shove',
  'fold-shove',
];

// Quiz answers can be simple actions OR blend types
export type QuizAction = SimpleAction | BlendType;

// Type guard for blend types
export function isBlendType(action: QuizAction): action is BlendType {
  return ALL_BLEND_TYPES.includes(action as BlendType);
}

// Helper: extract blend type from a blended action
export function getBlendType(action: HandAction): BlendType | null {
  if (isSimpleAction(action)) return null;

  const hasRaise = (action.raise ?? 0) > 0;
  const hasCall = (action.call ?? 0) > 0;
  const hasFold = (action.fold ?? 0) > 0;
  const hasShove = (action.shove ?? 0) > 0;

  if (hasRaise && hasCall && hasFold && hasShove) return 'raise-call-fold-shove';
  if (hasRaise && hasCall && hasShove) return 'raise-call-shove';
  if (hasRaise && hasFold && hasShove) return 'raise-fold-shove';
  if (hasCall && hasFold && hasShove) return 'call-fold-shove';
  if (hasRaise && hasCall && hasFold) return 'raise-call-fold';
  if (hasRaise && hasCall) return 'raise-call';
  if (hasRaise && hasFold) return 'raise-fold';
  if (hasCall && hasFold) return 'call-fold';
  if (hasRaise && hasShove) return 'raise-shove';
  if (hasCall && hasShove) return 'call-shove';
  if (hasFold && hasShove) return 'fold-shove';
  return null;
}

// Helper: get dominant action from blended (same as getPrimaryAction but explicitly named)
export function getDominantAction(action: HandAction): SimpleAction {
  return getPrimaryAction(action);
}

// ============================================
// Hand Combinations (169 total)
// ============================================

// This is a simplified type - the full 169 combos are defined in hands.ts
export type HandCombo = string; // e.g. "AKs", "AJo", "77"

// ============================================
// Range Data Structure
// ============================================

// Full range data for one chart - maps each hand combo to its action
export type RangeData = Record<HandCombo, HandAction>;

// Stack size categories
export type StackSize = '5bb' | '10bb' | '15bb' | '25bb' | '50bb' | '80bb';

// Table positions (8-max)
export type Position = 'UTG' | 'UTG+1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

// Scenario types - what situation is this range for?
export type Scenario = 'rfi' | 'vs-3bet' | 'vs-4bet' | 'after-limp' | 'vs-raise' | 'vs-raise-call';

// Range metadata - describes what situation this range applies to
export type RangeMeta = {
  stackSize: StackSize;
  position: Position;
  scenario: Scenario;
  opponentPosition?: Position; // Raiser for vs-raise, vs-raise-call scenarios
  callerPosition?: Position; // Caller for vs-raise-call (3-way pot) scenarios
  displayName: string; // Human-readable: "80bb+ UTG - Raise First In"
  description?: string; // Strategy explanation for this range
};

// Canonical spot descriptor for one chart (used by Quiz Delta Mode)
export type SpotDescriptor = {
  stackSize: StackSize;
  position: Position;
  scenario: Scenario;
  opponent: Position | null;
  caller: Position | null;
};

// Delta Mode: which single axis is being varied
export type DeltaAxis = 'stackSize' | 'position' | 'opponent';

// ============================================
// Teaching / Explanation Metadata (our framework)
// ============================================

export type Bucket =
  | 'raise_value'
  | 'raise_pressure'
  | 'call_realize'
  | 'fold_no_ev'
  // future-proof if you add jams:
  | 'shove_escape'
  | 'shove_thin_value';

export type EvSource =
  | 'called_value'
  | 'fold_equity'
  | 'realization'
  | 'position_edge'
  | 'domination_avoidance'
  | 'no_ev'
  | 'mixed';

export type Robustness = 'robust' | 'fragile' | 'unknown';

export type HandTag =
  | 'premium'
  | 'big_pair'
  | 'mid_pair'
  | 'small_pair'
  | 'suited_ace'
  | 'offsuit_ace'
  | 'suited_broadway'
  | 'offsuit_broadway'
  | 'suited_king'
  | 'suited_queen'
  | 'suited_jack'
  | 'offsuit_king'
  | 'offsuit_queen'
  | 'offsuit_jack'
  | 'offsuit_ten'
  | 'suited_connector'
  | 'offsuit_connector'
  | 'suited_one_gapper'
  | 'edge_open'
  | 'core_open'
  | 'trash';

export type Confidence = 'high' | 'medium' | 'low';

// Per-hand teaching metadata.
// Key rule: this is pedagogy scaffolding, not solver-truth.
export type DecisionMeta = {
  action?: SimpleAction;
  bucket?: Bucket;
  evSource?: EvSource;
  robustness?: Robustness;
  tags?: HandTag[];
  oneLiner?: string; // <= ~140 chars recommended
  confidence?: Confidence;
  generatedBy?: 'template_v1' | 'manual';
};

// Enrichment output requires full fields (used by the enricher + validator).
export type EnrichedDecisionMeta = {
  action: SimpleAction;
  bucket: Bucket;
  evSource: EvSource;
  robustness: Robustness;
  tags: HandTag[];
  oneLiner: string; // keep <= 120 in your prompt rules
  confidence: Confidence;
  generatedBy: 'template_v1';
};

export type RangeNotes = Partial<Record<HandCombo, DecisionMeta>>;

// Optional: if you want a stricter “validated notes” shape elsewhere in the app.
export type ValidatedRangeNotes = Partial<Record<HandCombo, EnrichedDecisionMeta>>;

// Complete poker range with metadata, action data, and optional teaching notes
export type PokerRange = {
  meta: RangeMeta;
  data: RangeData;

  // Optional: add as you enrich ranges
  notes?: RangeNotes;
};

// ============================================
// UI State Types
// ============================================

// User's selections while building a range (now supports blend types for quiz)
export type UserSelections = Record<HandCombo, SimpleAction | null>;
export type QuizSelections = Record<HandCombo, QuizAction | null>;

// Result of checking user's answers against the correct range
export type CheckResultDetail = {
  userAnswer: QuizAction | null;

  // Keep original for transparency, but also provide primary for grading.
  correctAnswer: HandAction;
  correctPrimary: SimpleAction;
  correctBlendType: BlendType | null; // null if simple action

  isCorrect: boolean;
  isHalfCredit: boolean; // true if user got dominant action on blended hand
  score: number; // 0.0, 0.5, or 1.0

  // Optional teaching metadata for results screens
  meta?: DecisionMeta;
};

export type CheckResult = {
  correct: number;
  incorrect: number;
  halfCredit: number; // count of half-credit answers
  total: number;
  percentage: number;
  totalScore: number; // sum of all scores (accounts for half credit)

  details: Record<HandCombo, CheckResultDetail>;
};
