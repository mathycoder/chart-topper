import type { PokerRange, HandAction, SimpleAction, BlendType } from '@/types';
import { getBlendType as getBlendTypeFromTypes, isBlendType } from '@/types';

/**
 * Output model (UI-friendly)
 * Now supports blend types for quiz answers
 */
export type GradeAction = SimpleAction | BlendType;

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
};

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

/**
 * --- main ----------------------------------------------------
 */

export function gradeRangeSubmission(args: {
  expectedRange: PokerRange;
  userResults: Record<string, GradeAction>;
}): ChartGradeSummary {
  const { expectedRange, userResults } = args;

  const expectedData = expectedRange.data as Record<string, HandAction>;

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

  // Grade every hand in expected range data
  for (const [hand, action] of Object.entries(expectedData)) {
    const expectedPrimary = getPrimaryAction(action);
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
    }

    if (score === 0) {
      wrong += 1;
    }
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
  };
}
