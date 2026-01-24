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

// If you later add jams, add it here and it will propagate.
// export type SimpleAction = 'raise' | 'call' | 'fold' | 'shove';

// Blended action - percentages for mixed strategies (must sum to 100)
export type BlendedAction = {
  raise?: number; // 0-100
  call?: number;  // 0-100
  fold?: number;  // 0-100
  // shove?: number; // 0-100 (optional later)
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

  // Tie-break order can be opinionated; this is fine for now.
  if (raise >= call && raise >= fold) return 'raise';
  if (call >= fold) return 'call';
  return 'fold';
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

// User's selections while building a range
export type UserSelections = Record<HandCombo, SimpleAction | null>;

// Result of checking user's answers against the correct range
export type CheckResultDetail = {
  userAnswer: SimpleAction | null;

  // Keep original for transparency, but also provide primary for grading.
  correctAnswer: HandAction;
  correctPrimary: SimpleAction;

  isCorrect: boolean;

  // Optional teaching metadata for results screens
  meta?: DecisionMeta;
};

export type CheckResult = {
  correct: number;
  incorrect: number;
  total: number;
  percentage: number;

  details: Record<HandCombo, CheckResultDetail>;
};
