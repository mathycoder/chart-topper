import type { PokerRange, HandAction, SimpleAction } from '@/types';
import { gradeRangeSubmission, type GradeAction, type ChartGradeSummary } from './gradeRange';
import { ALL_HANDS } from '@/data/hands';

/**
 * Compute the set of hands that differ between startRange and targetRange.
 * Excludes 'black' hands (not in hero's range).
 * Uses JSON serialization to compare blended actions by value.
 */
export function getDiffHands(
  startRange: PokerRange,
  targetRange: PokerRange
): Set<string> {
  const diff = new Set<string>();
  for (const hand of ALL_HANDS) {
    const startAction = startRange.data[hand] as HandAction | undefined;
    const targetAction = targetRange.data[hand] as HandAction | undefined;
    if (startAction === 'black' || targetAction === 'black') continue;
    if (JSON.stringify(startAction) !== JSON.stringify(targetAction)) {
      diff.add(hand);
    }
  }
  return diff;
}

/**
 * Grade a delta quiz submission — score only against hands that changed
 * between startRange and targetRange.
 *
 * The denominator is diffHands.size, not 169. Hands that stay the same
 * between start and target are not graded.
 */
export function gradeDeltaRange(args: {
  startRange: PokerRange;
  targetRange: PokerRange;
  userResults: Record<string, GradeAction>;
}): ChartGradeSummary {
  const { startRange, targetRange, userResults } = args;

  const diffHands = getDiffHands(startRange, targetRange);

  // Build a filtered expected range containing only the diff hands,
  // treating all non-diff hands as 'black' so gradeRangeSubmission skips them.
  const filteredData: Record<string, HandAction> = {};
  for (const hand of ALL_HANDS) {
    if (diffHands.has(hand)) {
      filteredData[hand] = (targetRange.data[hand] as HandAction);
    } else {
      // Mark as black so the standard grader ignores it
      filteredData[hand] = 'black' as SimpleAction;
    }
  }

  const filteredRange: PokerRange = {
    meta: targetRange.meta,
    data: filteredData as PokerRange['data'],
  };

  return gradeRangeSubmission({
    expectedRange: filteredRange,
    userResults,
  });
}
