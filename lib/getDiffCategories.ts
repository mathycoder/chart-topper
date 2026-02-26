import type { PokerRange, HandAction } from '@/types';
import { isSimpleAction, getPrimaryAction } from '@/types';
import { ALL_HANDS } from '@/data/hands';

export type DiffCategoryKey = 'actionChanged' | 'added' | 'removed' | 'blendShifted';

export interface DiffCategories {
  actionChanged: Set<string>;
  added: Set<string>;
  removed: Set<string>;
  blendShifted: Set<string>;
  all: Set<string>;
  counts: Record<DiffCategoryKey, number> & { total: number };
}

/**
 * Categorize hand differences between two ranges:
 * - added: black → non-black (hand entered the range)
 * - removed: non-black → black (hand left the range)
 * - actionChanged: primary action flipped (e.g. raise → fold)
 * - blendShifted: same primary action, different blend percentages
 */
export function getDiffCategories(
  startRange: PokerRange,
  targetRange: PokerRange,
): DiffCategories {
  const actionChanged = new Set<string>();
  const added = new Set<string>();
  const removed = new Set<string>();
  const blendShifted = new Set<string>();
  const all = new Set<string>();

  for (const hand of ALL_HANDS) {
    const startAction = startRange.data[hand] as HandAction | undefined;
    const targetAction = targetRange.data[hand] as HandAction | undefined;

    const startIsBlack = !startAction || startAction === 'black';
    const targetIsBlack = !targetAction || targetAction === 'black';

    if (startIsBlack && targetIsBlack) continue;

    if (startIsBlack && !targetIsBlack) {
      added.add(hand);
      all.add(hand);
      continue;
    }

    if (!startIsBlack && targetIsBlack) {
      removed.add(hand);
      all.add(hand);
      continue;
    }

    // Both are non-black — compare them
    if (JSON.stringify(startAction) === JSON.stringify(targetAction)) continue;

    const startPrimary = getPrimaryAction(startAction!);
    const targetPrimary = getPrimaryAction(targetAction!);

    if (startPrimary !== targetPrimary) {
      actionChanged.add(hand);
    } else {
      blendShifted.add(hand);
    }
    all.add(hand);
  }

  return {
    actionChanged,
    added,
    removed,
    blendShifted,
    all,
    counts: {
      actionChanged: actionChanged.size,
      added: added.size,
      removed: removed.size,
      blendShifted: blendShifted.size,
      total: all.size,
    },
  };
}

/**
 * Build dimmed hands set from diff categories + enabled filter categories.
 * Hands NOT in any enabled category get dimmed (unless they're black).
 */
export function buildDimmedFromCategories(
  categories: DiffCategories,
  enabledCategories: Set<DiffCategoryKey>,
  rangeData: Record<string, HandAction>,
): Set<string> {
  const highlighted = new Set<string>();
  if (enabledCategories.has('actionChanged')) categories.actionChanged.forEach(h => highlighted.add(h));
  if (enabledCategories.has('added')) categories.added.forEach(h => highlighted.add(h));
  if (enabledCategories.has('removed')) categories.removed.forEach(h => highlighted.add(h));
  if (enabledCategories.has('blendShifted')) categories.blendShifted.forEach(h => highlighted.add(h));

  const dimmed = new Set<string>();
  for (const hand of ALL_HANDS) {
    if (!highlighted.has(hand) && rangeData[hand] !== 'black') {
      dimmed.add(hand);
    }
  }
  return dimmed;
}

export const ALL_DIFF_CATEGORIES: DiffCategoryKey[] = ['actionChanged', 'added', 'removed', 'blendShifted'];

export const DIFF_CATEGORY_LABELS: Record<DiffCategoryKey, string> = {
  actionChanged: 'Action Changed',
  added: 'Added',
  removed: 'Removed',
  blendShifted: 'Blend Shifted',
};
