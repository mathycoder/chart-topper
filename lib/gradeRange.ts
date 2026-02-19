import type { PokerRange, HandAction, SimpleAction, BlendType, GradeBucket } from '@/types';
import { isBlendType } from '@/types';
import { scoreChoice } from '@/lib/scoreChoice';
import type { UserChoice } from '@/lib/scoreChoice';

export type GradeAction = SimpleAction | BlendType | 'mixed';

export type ChartGradeSummary = {
  overall: {
    accuracy: number;   // 0..1 (totalScore / attempted)
    attempted: number;
    correct: number;    // "perfect" bucket count
    halfCredit: number; // "good" + "partial" bucket count
    wrong: number;      // "miss" bucket count
    unanswered: number;
    totalScore: number; // fractional sum across all attempted hands
    byBucket: Record<GradeBucket, number>;
    byAction: Record<SimpleAction, { expected: number; correct: number; halfCredit: number; accuracy: number }>;
  };
};

// --- Helpers ------------------------------------------------------------------

function isSimpleAction(a: HandAction): a is SimpleAction {
  return typeof a === 'string';
}

function getPrimaryAction(a: HandAction): SimpleAction {
  if (isSimpleAction(a)) return a;

  const raise = a.raise ?? 0;
  const call = a.call ?? 0;
  const fold = a.fold ?? 0;
  const shove = a.shove ?? 0;

  // tie-break: raise > call > fold > shove
  if (raise >= call && raise >= fold && raise >= shove) return 'raise';
  if (call >= fold && call >= shove) return 'call';
  if (fold >= shove) return 'fold';
  return 'shove';
}

/**
 * Convert a HandAction to a solver probability distribution (values sum to 1).
 * SimpleAction becomes { action: 1.0 }.
 * BlendedAction percentages (0-100) are divided by 100 and only non-zero keys kept.
 */
function toSolverDist(action: HandAction): Record<string, number> {
  if (isSimpleAction(action)) {
    return { [action]: 1.0 };
  }
  const dist: Record<string, number> = {};
  const keys: Array<keyof typeof action> = ['raise', 'call', 'fold', 'shove'];
  for (const k of keys) {
    const v = action[k] ?? 0;
    if (v > 0) dist[k] = v / 100;
  }
  return dist;
}

/**
 * Map a GradeAction (user quiz answer) to the UserChoice expected by scoreChoice.
 * Any BlendType (e.g. 'raise-fold') is treated as 'mixed'.
 * 'black' should never reach grading; fall through to 'fold' as a safety guard.
 */
function toUserChoice(got: GradeAction): UserChoice {
  if (got === 'mixed') return 'mixed';
  if (isBlendType(got)) return 'mixed';
  if (got === 'black') return 'fold'; // should never happen
  return got;
}

// --- Main export --------------------------------------------------------------

export function gradeRangeSubmission(args: {
  expectedRange: PokerRange;
  userResults: Record<string, GradeAction>;
}): ChartGradeSummary {
  const { expectedRange, userResults } = args;
  const expectedData = expectedRange.data as Record<string, HandAction>;

  let attempted = 0;
  let correct = 0;
  let halfCreditCount = 0;
  let wrong = 0;
  let unanswered = 0;
  let totalScore = 0;

  const byBucket: Record<GradeBucket, number> = {
    perfect: 0,
    good: 0,
    partial: 0,
    miss: 0,
  };

  const byAction: ChartGradeSummary['overall']['byAction'] = {
    raise: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    call:  { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    fold:  { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    shove: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
    black: { expected: 0, correct: 0, halfCredit: 0, accuracy: 0 },
  };

  for (const [hand, action] of Object.entries(expectedData)) {
    if (action === 'black') {
      byAction.black.expected += 1;
      continue;
    }

    const expectedPrimary = getPrimaryAction(action);
    byAction[expectedPrimary].expected += 1;

    const got = userResults[hand];
    if (!got) {
      unanswered += 1;
      continue;
    }

    attempted += 1;

    const solverDist = toSolverDist(action);
    const userChoice = toUserChoice(got);
    const { score, gradeBucket } = scoreChoice(solverDist, userChoice);

    totalScore += score;
    byBucket[gradeBucket] += 1;

    if (gradeBucket === 'perfect') {
      correct += 1;
      byAction[expectedPrimary].correct += 1;
    } else if (gradeBucket === 'good' || gradeBucket === 'partial') {
      halfCreditCount += 1;
      byAction[expectedPrimary].halfCredit += 1;
    } else {
      wrong += 1;
    }
  }

  for (const a of Object.keys(byAction) as SimpleAction[]) {
    const exp = byAction[a].expected;
    const fullCredit = byAction[a].correct;
    const half = byAction[a].halfCredit;
    byAction[a].accuracy = exp > 0 ? (fullCredit + half * 0.5) / exp : 1;
  }

  const accuracy = attempted > 0 ? totalScore / attempted : 0;

  return {
    overall: {
      accuracy,
      attempted,
      correct,
      halfCredit: halfCreditCount,
      wrong,
      unanswered,
      totalScore,
      byBucket,
      byAction,
    },
  };
}
