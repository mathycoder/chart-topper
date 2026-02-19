import type { SimpleAction, ScoreResult, ScoreConfig, GradeBucket } from '@/types';

export type { ScoreResult, ScoreConfig, GradeBucket };

// The set of concrete poker actions (excludes 'black' and 'mixed')
export type ConcreteAction = SimpleAction extends 'black' ? never : Exclude<SimpleAction, 'black'>;

// User choice passed to scoreChoice
export type UserChoice = Exclude<SimpleAction, 'black'> | 'mixed';

export const DEFAULT_CONFIG: ScoreConfig = {
  MIX_MIN: 0.15,
  STRONG: 0.75,
  MODERATE: 0.60,
  TINY_MIN: 0.10,
  mixedPenaltyScore: 0.0,
};

/**
 * Score a single user hand choice against a solver distribution.
 *
 * @param solverDist  Probability distribution over actions. Values should sum
 *                    to ~1 but are safe-normalized before use.
 * @param userChoice  The action the user selected, or 'mixed'.
 * @param config      Tunable thresholds; defaults apply when omitted.
 */
export function scoreChoice(
  solverDist: Record<string, number>,
  userChoice: UserChoice,
  config?: Partial<ScoreConfig>,
): ScoreResult {
  const cfg: ScoreConfig = { ...DEFAULT_CONFIG, ...config };

  // --- Normalize distribution -------------------------------------------------
  const entries = Object.entries(solverDist).filter(([, p]) => p > 0);
  const total = entries.reduce((s, [, p]) => s + p, 0);
  const normalized: Record<string, number> =
    total > 0
      ? Object.fromEntries(entries.map(([a, p]) => [a, p / total]))
      : {};

  // --- Sort by probability descending ----------------------------------------
  const sorted = Object.entries(normalized).sort(([, a], [, b]) => b - a);
  const [topAction, pTop] = sorted[0] ?? ['', 0];
  const pSecond = sorted[1]?.[1] ?? 0;

  const isMeaningfullyMixed = pSecond >= cfg.MIX_MIN;

  const topPct = pct(pTop);
  const secondAction = sorted[1]?.[0] ?? '';
  const secondPct = pct(pSecond);

  // --- Score MIXED choice -----------------------------------------------------
  if (userChoice === 'mixed') {
    if (isMeaningfullyMixed) {
      return {
        score: 1.0,
        gradeBucket: 'perfect',
        explain: `Correct: this hand is meaningfully mixed (top ${topPct}, second ${secondPct}).`,
      };
    }
    return {
      score: cfg.mixedPenaltyScore,
      gradeBucket: 'miss',
      explain: `This is effectively pure (second action ${secondPct}); avoid marking mixed.`,
    };
  }

  // --- Score concrete action choice -------------------------------------------
  const pUser = normalized[userChoice] ?? 0;

  if (pUser === 0) {
    return {
      score: 0.0,
      gradeBucket: 'miss',
      explain: `Solver: ${topAction} ${topPct}, next ${secondAction} ${secondPct}. You chose ${userChoice} (not in solver range).`,
    };
  }

  const band: 'STRONG' | 'MODERATE' | 'CLOSE' =
    pTop >= cfg.STRONG ? 'STRONG' : pTop >= cfg.MODERATE ? 'MODERATE' : 'CLOSE';

  const isTop = userChoice === topAction;
  const baseExplain =
    `Solver: ${topAction} ${topPct}, next ${secondAction} ${secondPct}. You chose ${userChoice}.`;

  let score: number;
  let gradeBucket: GradeBucket;

  if (isTop) {
    if (band === 'STRONG') {
      score = 1.0;
      gradeBucket = 'perfect';
    } else if (band === 'MODERATE') {
      score = 0.9;
      gradeBucket = 'good';
    } else {
      // CLOSE — near 50/50; mixed recognition is ideal
      score = 0.75;
      gradeBucket = 'partial';
    }
  } else {
    // Minority action
    if (band === 'STRONG') {
      score = 0.25;
      gradeBucket = 'partial';
    } else if (band === 'MODERATE') {
      score = 0.5;
      gradeBucket = 'partial';
    } else {
      // CLOSE
      score = 0.75;
      gradeBucket = 'partial';
    }

    // Hard floor for very tiny minority actions
    if (pUser < cfg.TINY_MIN) {
      score = Math.min(score, 0.25);
    }
  }

  const detail = isTop ? 'Dominant action chosen.' : 'Minority action chosen.';

  return { score, gradeBucket, explain: `${baseExplain} ${detail}` };
}

// --- Helpers ------------------------------------------------------------------

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}
