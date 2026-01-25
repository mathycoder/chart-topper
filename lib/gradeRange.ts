/* eslint-disable no-console */

import type { PokerRange, RangeNotes, HandAction, SimpleAction, HandTag, BlendType, QuizAction, BlendedAction } from '@/types';
import { getBlendType as getBlendTypeFromTypes, isBlendType } from '@/types';

/**
 * Output model (UI-friendly)
 * Now supports blend types for quiz answers
 */
export type GradeAction = SimpleAction | BlendType;

export type HandDiff = {
  hand: string;
  expectedAction: HandAction; // Original action (simple or blended)
  expectedPrimary: SimpleAction; // Dominant action for display
  expectedBlendType: BlendType | null; // Blend type if applicable
  got: GradeAction; // User's answer (simple action or blend type)
  score: number; // 0.0, 0.5, or 1.0
  isHalfCredit: boolean;
  mistakeType: 'too_tight' | 'too_loose' | 'over_aggressive' | 'under_aggressive' | 'wrong_blend';
  severity: 'high' | 'medium' | 'low';
  severityScore: number;
  why: string; // short, derived from notes/tags
  tags: HandTag[];
  evSource?: 'called_value' | 'realization' | 'domination_avoidance' | 'no_ev' | 'mixed';
};

export type LeakGroup = {
  id: string;
  title: string;
  diagnosis: string;
  whatToDo: string;
  examples: HandDiff[]; // 3–8 max
  drill: string;
  weight: number;
};

export type ChartGradeSummary = {
  overall: {
    accuracy: number; // 0..1 (accounts for half credit)
    attempted: number;
    correct: number; // Full credit answers
    halfCredit: number; // Half credit answers (dominant action on blended)
    wrong: number;
    unanswered: number;
    totalScore: number; // Sum of all scores (1.0 for correct, 0.5 for half credit)
    byAction: Record<SimpleAction, { expected: number; correct: number; halfCredit: number; accuracy: number }>;
  };
  strengths: string[];
  priorityFixes: string[];
  topLeaks: LeakGroup[]; // 3–5
  // optional: for a detailed view
  diffs: HandDiff[];
};

type EvSource = 'called_value' | 'realization' | 'domination_avoidance' | 'no_ev' | 'mixed';

type DecisionMeta = NonNullable<RangeNotes[string]>;

/**
 * --- helpers -------------------------------------------------
 */

function isSimpleAction(a: HandAction): a is SimpleAction {
  return typeof a === 'string';
}

function getPrimaryAction(a: HandAction): SimpleAction {
  if (isSimpleAction(a)) return a;

  const raise = a.raise ?? 0;
  const call = a.call ?? 0;
  const fold = a.fold ?? 0;

  // tie-break: raise > call > fold
  if (raise >= call && raise >= fold) return 'raise';
  if (call >= fold) return 'call';
  return 'fold';
}

function getBlendType(a: HandAction): BlendType | null {
  return getBlendTypeFromTypes(a);
}

/**
 * Grade a single hand answer.
 * Returns: { score, isHalfCredit }
 * - score: 1.0 (correct), 0.5 (half credit), 0.0 (wrong)
 * - isHalfCredit: true if user got dominant action on blended hand
 */
function gradeHandAnswer(expected: HandAction, got: GradeAction): { score: number; isHalfCredit: boolean } {
  const expectedPrimary = getPrimaryAction(expected);
  const expectedBlendType = getBlendType(expected);
  
  // Simple expected action - needs exact match
  if (isSimpleAction(expected)) {
    if (got === expected) {
      return { score: 1.0, isHalfCredit: false };
    }
    return { score: 0.0, isHalfCredit: false };
  }
  
  // Blended expected action
  // Full credit: user selected correct blend type
  if (expectedBlendType && got === expectedBlendType) {
    return { score: 1.0, isHalfCredit: false };
  }
  
  // Half credit: user selected dominant action (simple, not blend type)
  if (!isBlendType(got) && got === expectedPrimary) {
    return { score: 0.5, isHalfCredit: true };
  }
  
  // Wrong
  return { score: 0.0, isHalfCredit: false };
}

function classifyMistake(expectedPrimary: SimpleAction, got: GradeAction, isBlendedExpected: boolean): HandDiff['mistakeType'] {
  // If expected was blended and user got wrong blend type
  if (isBlendedExpected && isBlendType(got)) {
    return 'wrong_blend';
  }
  
  // Extract simple action from got for comparison
  const gotSimple: SimpleAction = isBlendType(got) 
    ? (got.includes('raise') ? 'raise' : got.includes('call') ? 'call' : 'fold')
    : got;
  
  if (expectedPrimary === 'raise' && gotSimple === 'fold') return 'too_tight';
  if (expectedPrimary === 'fold' && (gotSimple === 'raise' || gotSimple === 'call')) return 'too_loose';
  if (expectedPrimary === 'call' && gotSimple === 'raise') return 'over_aggressive';
  if (expectedPrimary === 'raise' && gotSimple === 'call') return 'under_aggressive';
  // default fallback (shouldn't happen if expected != got)
  return expectedPrimary === 'fold' ? 'too_loose' : 'too_tight';
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Infer tags when notes are missing or sparse.
 * This keeps feedback useful even if you annotate only 40–70 hands.
 */
function inferTagsFromHand(hand: string): HandTag[] {
  // Pairs: "22", "TT", "AA"
  if (/^[2-9TJQKA]{2}$/.test(hand) && hand[0] === hand[1]) {
    const rank = hand[0] as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
    if (['A', 'K', 'Q', 'J'].includes(rank)) return ['big_pair'];
    if (rank === 'T' || rank === '9' || rank === '8' || rank === '7' || rank === '6') return ['mid_pair'];
    return ['small_pair'];
  }

  // Non-pairs like "AKs", "AJo", "98s"
  const m = /^([2-9TJQKA])([2-9TJQKA])(s|o)$/.exec(hand);
  if (!m) return [];

  const r1 = m[1]!;
  const r2 = m[2]!;
  const suitedness = m[3] as 's' | 'o';
  const tags: HandTag[] = [];

  const isAce = r1 === 'A' || r2 === 'A';
  const isKing = r1 === 'K' || r2 === 'K';
  const isQueen = r1 === 'Q' || r2 === 'Q';
  const isJack = r1 === 'J' || r2 === 'J';
  const isTen = r1 === 'T' || r2 === 'T';

  const rankValue = (r: string) => '23456789TJQKA'.indexOf(r);
  const hi = Math.max(rankValue(r1), rankValue(r2));
  const lo = Math.min(rankValue(r1), rankValue(r2));
  const gap = hi - lo;

  // Aces
  if (isAce) tags.push(suitedness === 's' ? 'suited_ace' : 'offsuit_ace');

  // Broadways (T+)
  const isBroadway = (r: string) => ['T', 'J', 'Q', 'K', 'A'].includes(r);
  if (isBroadway(r1) && isBroadway(r2)) tags.push(suitedness === 's' ? 'suited_broadway' : 'offsuit_broadway');

  // Rank-tags for suited K/Q/J
  if (suitedness === 's') {
    if (isKing && !tags.includes('suited_king')) tags.push('suited_king');
    if (isQueen && !tags.includes('suited_queen')) tags.push('suited_queen');
    if (isJack && !tags.includes('suited_jack')) tags.push('suited_jack');
  } else {
    // Offsuit rank tags (non-broadway opens still want these)
    if (isKing) tags.push('offsuit_king');
    if (isQueen) tags.push('offsuit_queen');
    if (isJack) tags.push('offsuit_jack');
    if (isTen) tags.push('offsuit_ten');
  }

  // Connectors / one-gappers (only meaningful if not a pair)
  if (gap === 1) tags.push(suitedness === 's' ? 'suited_connector' : 'offsuit_connector');
  if (gap === 2 && suitedness === 's') tags.push('suited_one_gapper');

  return uniq(tags);
}

/**
 * Decide which "pattern group" a hand belongs to for leak grouping.
 * Use notes.tags if present, else inferred tags.
 */
function choosePrimaryGroupKey(tags: HandTag[], expected: GradeAction): string {
  // Prioritize broad, useful buckets first:
  const priority: HandTag[] = [
    'premium',
    'big_pair',
    'mid_pair',
    'small_pair',
    'suited_ace',
    'offsuit_ace',
    'suited_broadway',
    'offsuit_broadway',
    'suited_connector',
    'offsuit_connector',
    'suited_one_gapper',
    'suited_king',
    'suited_queen',
    'suited_jack',
    'offsuit_king',
    'offsuit_queen',
    'offsuit_jack',
    'offsuit_ten',
    'trash',
  ];

  for (const t of priority) {
    if (tags.includes(t)) return t;
  }

  // fallback: action-based grouping
  return expected === 'raise' ? 'missed_opens' : 'bad_defends';
}

function evSourceToEngine(ev?: EvSource): string {
  switch (ev) {
    case 'called_value':
      return 'Called value:';
    case 'realization':
      return 'Realization:';
    case 'domination_avoidance':
      return 'Domination avoidance:';
    case 'mixed':
      return 'Mixed EV:';
    case 'no_ev':
    default:
      return 'No EV:';
  }
}

function computeSeverityScore(args: {
  expected: SimpleAction;
  got: GradeAction;
  tags: HandTag[];
  notes?: DecisionMeta;
  isHalfCredit?: boolean;
}): number {
  const { expected, got, tags, notes, isHalfCredit } = args;

  let s = 1.0;

  // Half credit answers are less severe
  if (isHalfCredit) {
    s = 0.5;
    return s;
  }

  // Extract simple action from got for comparison
  const gotSimple: SimpleAction = isBlendType(got) 
    ? (got.includes('raise') ? 'raise' : got.includes('call') ? 'call' : 'fold')
    : got;

  // Important misses: core opens and robust premiums
  if (expected === 'raise') {
    if (tags.includes('core_open')) s += 1.0;
    if (notes?.robustness === 'robust') s += 1.0;
    if (gotSimple === 'fold') s += 0.5; // missed initiative
  }

  if (expected === 'fold') {
    if (gotSimple === 'raise' || gotSimple === 'call') s += 0.5; // spew risk
  }

  // Edge opens should be penalized less
  if (tags.includes('edge_open')) s -= 0.5;

  return clamp(s, 0.5, 3.5);
}

function scoreToSeverity(score: number): HandDiff['severity'] {
  if (score >= 2.5) return 'high';
  if (score >= 1.5) return 'medium';
  return 'low';
}

/**
 * Short "why" line for a single hand diff.
 * Prefer notes.oneLiner when it exists, otherwise generate a compact explanation.
 */
function explainHandDiff(args: {
  hand: string;
  expected: SimpleAction;
  got: GradeAction;
  tags: HandTag[];
  notes?: DecisionMeta;
  isBlendedExpected?: boolean;
  expectedBlendType?: BlendType | null;
}): { why: string; evSource?: EvSource } {
  const { expected, got, tags, notes, isBlendedExpected, expectedBlendType } = args;

  if (notes?.oneLiner && typeof notes.oneLiner === 'string') {
    // Keep it short (UI snippet); don't exceed ~120 chars
    const s = notes.oneLiner.length > 120 ? `${notes.oneLiner.slice(0, 117)}...` : notes.oneLiner;
    return { why: s, evSource: notes.evSource as EvSource | undefined };
  }

  // For blended actions, explain the mix
  if (isBlendedExpected && expectedBlendType) {
    const blendExplain = expectedBlendType === 'raise-call' ? 'raise or call'
      : expectedBlendType === 'raise-fold' ? 'raise or fold'
      : expectedBlendType === 'call-fold' ? 'call or fold'
      : 'a mix of actions';
    return { why: `This is a mixed strategy spot where you should ${blendExplain}. Dominant action is ${expected}.`, evSource: 'mixed' };
  }

  // fallback: infer an EV engine + a one-sentence reason
  const likelyEv: EvSource =
    expected === 'raise'
      ? tags.includes('premium') || tags.includes('big_pair') || tags.includes('offsuit_broadway') || tags.includes('suited_broadway')
        ? 'called_value'
        : 'realization'
      : tags.includes('offsuit_ace') || tags.includes('offsuit_broadway')
        ? 'domination_avoidance'
        : 'no_ev';

  const engine = evSourceToEngine(likelyEv);
  
  // Extract simple action from got for comparison
  const gotSimple: SimpleAction = isBlendType(got) 
    ? (got.includes('raise') ? 'raise' : got.includes('call') ? 'call' : 'fold')
    : got;

  if (expected === 'raise' && gotSimple === 'fold') {
    if (tags.includes('suited_connector') || tags.includes('suited_one_gapper') || tags.includes('suited_ace')) {
      return { why: `${engine} BTN profit comes from position and playability; this is a standard open.`, evSource: likelyEv };
    }
    if (tags.includes('small_pair') || tags.includes('mid_pair')) {
      return { why: `${engine} Opens to realize equity with initiative and position.`, evSource: likelyEv };
    }
    return { why: `${engine} This is opened for value or realization depending on who continues.`, evSource: likelyEv };
  }

  if (expected === 'fold' && gotSimple !== 'fold') {
    return { why: `${engine} Too weak when called; folding avoids dominated and low-EV spots.`, evSource: likelyEv };
  }

  // call/raise mismatches (less common in your current preflop-only charts)
  return { why: `${engine} Chart prefers ${expected} here; your ${got} shifts EV the wrong way.`, evSource: likelyEv };
}

function groupTitle(groupKey: string): string {
  const map: Record<string, string> = {
    premium: 'Premium value hands',
    big_pair: 'Big pairs',
    mid_pair: 'Mid pairs',
    small_pair: 'Small pairs',
    suited_ace: 'Suited aces',
    offsuit_ace: 'Offsuit aces',
    suited_broadway: 'Suited broadways',
    offsuit_broadway: 'Offsuit broadways',
    suited_connector: 'Suited connectors',
    offsuit_connector: 'Offsuit connectors',
    suited_one_gapper: 'Suited one-gappers',
    suited_king: 'Suited kings',
    suited_queen: 'Suited queens',
    suited_jack: 'Suited jacks',
    offsuit_king: 'Offsuit kings',
    offsuit_queen: 'Offsuit queens',
    offsuit_jack: 'Offsuit jacks',
    offsuit_ten: 'Offsuit tens',
    trash: 'Trash hands',
    missed_opens: 'Missed opens',
    bad_defends: 'Bad continues',
  };
  return map[groupKey] ?? groupKey;
}

function groupDiagnosis(args: { groupKey: string; mistakes: HandDiff[]; expectedAction: SimpleAction }): string {
  const { groupKey, expectedAction } = args;
  // Keep these as short templates (your UI will show examples anyway)
  if (expectedAction === 'raise') {
    if (groupKey.includes('suited') || groupKey.includes('connector') || groupKey.includes('one_gapper')) {
      return 'You are skipping many BTN opens that exist mainly because position helps you realize equity.';
    }
    if (groupKey.includes('pair')) return 'You are missing profitable BTN opens with pairs that benefit from position and initiative.';
    if (groupKey.includes('ace') || groupKey.includes('broadway')) return 'You are too tight with hands that can win by value or realization on the BTN.';
    return 'You are too tight in a cluster of standard BTN opens.';
  }
  // expected fold groups
  if (groupKey.includes('offsuit') && (groupKey.includes('ace') || groupKey.includes('broadway'))) {
    return 'You are continuing with hands that tend to be dominated when called; folding is the default.';
  }
  return 'You are continuing with hands the chart folds; these are low-EV when called.';
}

function groupWhatToDo(args: { expectedAction: SimpleAction; groupKey: string }): string {
  const { expectedAction, groupKey } = args;
  if (expectedAction === 'raise') {
    if (groupKey === 'suited_connector' || groupKey === 'suited_one_gapper') return 'Add back the suited-connectivity opens on BTN.';
    if (groupKey === 'suited_ace') return 'Open suited aces down to the chart boundary on BTN.';
    if (groupKey === 'small_pair' || groupKey === 'mid_pair') return 'Open all pairs on BTN per the chart.';
    return 'Widen your BTN opens toward the chart core and edge opens.';
  }
  return 'Tighten up by folding these combos per the chart.';
}

function groupDrill(groupKey: string, expectedAction: SimpleAction): string {
  if (expectedAction === 'raise') {
    if (groupKey === 'suited_ace') return 'Drill: flash-card the lowest opened suited ace + the next one down in earlier positions.';
    if (groupKey === 'suited_connector' || groupKey === 'suited_one_gapper') return 'Drill: pick 5 connectors/one-gappers and repeat until instant.';
    if (groupKey.includes('pair')) return 'Drill: recite "BTN opens all pairs" + test yourself on 22–66 repeatedly.';
    return 'Drill: 20 quick reps—only the missed opens list until accuracy stabilizes.';
  }
  return 'Drill: 20 quick reps—only the hands you over-played until they become auto-folds.';
}

function pickStrengths(diffs: HandDiff[], expectedData: Record<string, GradeAction>): string[] {
  // Simple heuristics: if all premiums correct, say so; if few too-loose mistakes, say so.
  const strengths: string[] = [];

  const premiums = ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs'];
  const premiumAttempts = premiums.filter((h) => expectedData[h]).length;
  const premiumCorrect = premiums.filter((h) => {
    const d = diffs.find((x) => x.hand === h);
    return !d; // if not in diffs, it was correct (assuming user answered; we can't know if unanswered here)
  }).length;

  // This is a best-effort; if you track unanswered, you can refine.
  if (premiumAttempts >= 5 && premiumCorrect >= 5) strengths.push('Premiums are handled well (your value opens are in place).');

  const tooLoose = diffs.filter((d) => d.mistakeType === 'too_loose').length;
  const tooTight = diffs.filter((d) => d.mistakeType === 'too_tight').length;
  if (tooLoose < Math.max(2, Math.floor(tooTight / 5))) strengths.push('You avoid most of the obvious spew (not many over-continues).');

  // If they got a lot of raises correct in general
  const raiseMistakes = diffs.filter((d) => d.expectedPrimary === 'raise').length;
  if (raiseMistakes < 10) strengths.push('You are close on the high-level "raise the strong stuff" rule.');

  return strengths.slice(0, 4);
}

function pickPriorityFixes(topLeaks: LeakGroup[]): string[] {
  return topLeaks
    .slice(0, 3)
    .map((g) => {
      if (g.examples.length) {
        const ex = g.examples[0]!;
        return `${g.title}: fix ${ex.hand} (${ex.got} → ${ex.expectedPrimary}) and nearby hands.`;
      }
      return `${g.title}: tighten your pattern recognition.`;
    })
    .slice(0, 4);
}

/**
 * --- main ----------------------------------------------------
 */

export function gradeRangeSubmission(args: {
  expectedRange: PokerRange;
  userResults: Record<string, GradeAction>;
  maxLeaks?: number; // default 5
  maxExamplesPerLeak?: number; // default 6
}): ChartGradeSummary {
  const { expectedRange, userResults } = args;
  const maxLeaks = args.maxLeaks ?? 5;
  const maxExamplesPerLeak = args.maxExamplesPerLeak ?? 6;

  const expectedData = expectedRange.data as Record<string, HandAction>;
  const notes = (expectedRange.notes ?? {}) as RangeNotes;

  // Overall counters
  let attempted = 0;
  let correct = 0;
  let halfCreditCount = 0;
  let wrong = 0;
  let unanswered = 0;
  let totalScore = 0;

  const byAction: ChartGradeSummary['overall']['byAction'] = {
    raise: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    call: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    fold: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    shove: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
  };

  const diffs: HandDiff[] = [];

  // Grade every hand in expected range data
  for (const [hand, action] of Object.entries(expectedData)) {
    const expectedPrimary = getPrimaryAction(action);
    const expectedBlendType = getBlendType(action);
    byAction[expectedPrimary].expected += 1;

    const got = userResults[hand];
    if (!got) {
      unanswered += 1;
      continue;
    }

    attempted += 1;

    // Grade the answer with half-credit support
    const { score, isHalfCredit } = gradeHandAnswer(action, got);
    totalScore += score;

    if (score === 1.0) {
      correct += 1;
      byAction[expectedPrimary].correct += 1;
      continue;
    }

    if (isHalfCredit) {
      halfCreditCount += 1;
      byAction[expectedPrimary].halfCredit += 1;
      // Still add to diffs for feedback, but mark as half credit
    }

    if (score === 0) {
      wrong += 1;
    }

    const meta = notes[hand] as DecisionMeta | undefined;

    // tags: notes.tags if present else infer
    const tags = uniq([...(meta?.tags ?? []), ...inferTagsFromHand(hand)]) as HandTag[];

    const isBlendedExpected = !isSimpleAction(action);
    const mistakeType = classifyMistake(expectedPrimary, got, isBlendedExpected);
    const severityScore = computeSeverityScore({ expected: expectedPrimary, got, tags, notes: meta, isHalfCredit });
    const severity = scoreToSeverity(severityScore);
    const { why, evSource } = explainHandDiff({ hand, expected: expectedPrimary, got, tags, notes: meta, isBlendedExpected, expectedBlendType });

    diffs.push({
      hand,
      expectedAction: action,
      expectedPrimary,
      expectedBlendType,
      got,
      score,
      isHalfCredit,
      mistakeType,
      severity,
      severityScore,
      why,
      tags,
      evSource,
    });
  }

  // finalize byAction accuracies (count full + half credit for accuracy)
  for (const a of Object.keys(byAction) as SimpleAction[]) {
    const exp = byAction[a].expected;
    const fullCredit = byAction[a].correct;
    const halfCredit = byAction[a].halfCredit;
    // Accuracy treats half credit as 0.5
    const effectiveCorrect = fullCredit + (halfCredit * 0.5);
    byAction[a].accuracy = exp > 0 ? effectiveCorrect / exp : 1;
  }

  const accuracy = attempted > 0 ? totalScore / attempted : 0;

  // Build leak groups from diffs
  const mistakeGroups = new Map<
    string,
    { key: string; expectedAction: SimpleAction; diffs: HandDiff[]; weight: number }
  >();

  for (const d of diffs) {
    // group mainly by "what they should have done" and tag cluster
    const groupKey = choosePrimaryGroupKey(d.tags, d.expectedPrimary);
    const id = `${d.expectedPrimary}_${d.mistakeType}_${groupKey}`;

    const entry = mistakeGroups.get(id);
    const w = d.severityScore;

    if (!entry) {
      mistakeGroups.set(id, { key: groupKey, expectedAction: d.expectedPrimary, diffs: [d], weight: w });
    } else {
      entry.diffs.push(d);
      entry.weight += w;
    }
  }

  // Rank groups
  const ranked = Array.from(mistakeGroups.entries())
    .map(([id, g]) => {
      // Sort examples by severity score desc
      const examples = g.diffs.sort((a, b) => b.severityScore - a.severityScore).slice(0, maxExamplesPerLeak);
      const title = groupTitle(g.key);

      const diagnosis = groupDiagnosis({ groupKey: g.key, mistakes: g.diffs, expectedAction: g.expectedAction });
      const whatToDo = groupWhatToDo({ expectedAction: g.expectedAction, groupKey: g.key });
      const drill = groupDrill(g.key, g.expectedAction);

      // Mild boost if this is a "too_tight" miss on BTN/CO (common, very actionable)
      const pos = expectedRange.meta?.position;
      const isLatePos = pos === 'CO' || pos === 'BTN';
      const boost = isLatePos && g.expectedAction === 'raise' ? 1.15 : 1.0;

      const weight = g.weight * boost;

      const leak: LeakGroup = {
        id,
        title,
        diagnosis,
        whatToDo,
        examples,
        drill,
        weight,
      };

      return leak;
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxLeaks);

  const strengths = pickStrengths(diffs, Object.fromEntries(Object.entries(expectedData).map(([h, a]) => [h, getPrimaryAction(a)])));
  const priorityFixes = pickPriorityFixes(ranked);

  return {
    overall: {
      accuracy,
      attempted,
      correct,
      halfCredit: halfCreditCount,
      wrong,
      unanswered,
      totalScore,
      byAction,
    },
    strengths,
    priorityFixes,
    topLeaks: ranked,
    diffs: diffs.sort((a, b) => b.severityScore - a.severityScore),
  };
}

/**
 * Optional: pretty-print a summary for console logs / dev mode.
 */
export function formatGradeSummary(summary: ChartGradeSummary): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const lines: string[] = [];
  lines.push(`Accuracy: ${pct(summary.overall.accuracy)} (${summary.overall.correct}/${summary.overall.attempted})`);
  lines.push(`Unanswered: ${summary.overall.unanswered}`);
  lines.push('');

  if (summary.strengths.length) {
    lines.push('Strengths:');
    for (const s of summary.strengths) lines.push(`- ${s}`);
    lines.push('');
  }

  if (summary.priorityFixes.length) {
    lines.push('Priority fixes:');
    for (const p of summary.priorityFixes) lines.push(`- ${p}`);
    lines.push('');
  }

  if (summary.topLeaks.length) {
    lines.push('Top leaks:');
    for (const g of summary.topLeaks) {
      lines.push(`- ${g.title} (weight ${g.weight.toFixed(1)})`);
      lines.push(`  ${g.diagnosis}`);
      lines.push(`  Do: ${g.whatToDo}`);
      lines.push(`  Drill: ${g.drill}`);
      for (const ex of g.examples) {
        lines.push(`    • ${ex.hand}: ${ex.got} → ${ex.expectedPrimary} (${ex.severity}) — ${ex.why}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
