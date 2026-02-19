import { describe, it, expect } from 'vitest';
import { scoreChoice } from '@/lib/scoreChoice';

// Helpers
function score(dist: Record<string, number>, choice: string) {
  return scoreChoice(dist, choice as Parameters<typeof scoreChoice>[1]).score;
}

function bucket(dist: Record<string, number>, choice: string) {
  return scoreChoice(dist, choice as Parameters<typeof scoreChoice>[1]).gradeBucket;
}

// ---------------------------------------------------------------------------
// Spec test cases
// ---------------------------------------------------------------------------

describe('{raise:0.8, fold:0.2}', () => {
  const dist = { raise: 0.8, fold: 0.2 };

  it('MIXED => 1.0 / perfect', () => {
    expect(score(dist, 'mixed')).toBe(1.0);
    expect(bucket(dist, 'mixed')).toBe('perfect');
  });

  it('raise => 1.0 / perfect (STRONG band, top action)', () => {
    expect(score(dist, 'raise')).toBe(1.0);
    expect(bucket(dist, 'raise')).toBe('perfect');
  });

  it('fold => 0.25 / partial (STRONG band, minority)', () => {
    expect(score(dist, 'fold')).toBe(0.25);
    expect(bucket(dist, 'fold')).toBe('partial');
  });

  it('call => 0 / miss (not in distribution)', () => {
    expect(score(dist, 'call')).toBe(0);
    expect(bucket(dist, 'call')).toBe('miss');
  });
});

describe('{raise:0.62, fold:0.38}', () => {
  const dist = { raise: 0.62, fold: 0.38 };

  it('MIXED => 1.0 / perfect (pSecond=0.38 >= 0.15)', () => {
    expect(score(dist, 'mixed')).toBe(1.0);
    expect(bucket(dist, 'mixed')).toBe('perfect');
  });

  it('raise => 0.9 / good (MODERATE band, top action)', () => {
    expect(score(dist, 'raise')).toBe(0.9);
    expect(bucket(dist, 'raise')).toBe('good');
  });

  it('fold => 0.5 / partial (MODERATE band, minority)', () => {
    expect(score(dist, 'fold')).toBe(0.5);
    expect(bucket(dist, 'fold')).toBe('partial');
  });
});

describe('{raise:0.55, fold:0.45}', () => {
  const dist = { raise: 0.55, fold: 0.45 };

  it('MIXED => 1.0 / perfect (pSecond=0.45 >= 0.15)', () => {
    expect(score(dist, 'mixed')).toBe(1.0);
    expect(bucket(dist, 'mixed')).toBe('perfect');
  });

  it('raise => 0.75 / partial (CLOSE band, top action)', () => {
    expect(score(dist, 'raise')).toBe(0.75);
    expect(bucket(dist, 'raise')).toBe('partial');
  });

  it('fold => 0.75 / partial (CLOSE band, minority but >= TINY_MIN)', () => {
    expect(score(dist, 'fold')).toBe(0.75);
    expect(bucket(dist, 'fold')).toBe('partial');
  });
});

describe('{shove:0.95, raise:0.05} — effectively pure', () => {
  const dist = { shove: 0.95, raise: 0.05 };

  it('MIXED => 0.0 / miss (pSecond=0.05 < 0.15)', () => {
    expect(score(dist, 'mixed')).toBe(0.0);
    expect(bucket(dist, 'mixed')).toBe('miss');
  });

  it('shove => 1.0 / perfect (STRONG band, top action)', () => {
    expect(score(dist, 'shove')).toBe(1.0);
    expect(bucket(dist, 'shove')).toBe('perfect');
  });

  it('raise => 0.25 / partial (STRONG band, minority)', () => {
    expect(score(dist, 'raise')).toBe(0.25);
    expect(bucket(dist, 'raise')).toBe('partial');
  });
});

describe('{fold:0.55, call:0.40, raise:0.05} — TINY_MIN floor', () => {
  const dist = { fold: 0.55, call: 0.40, raise: 0.05 };

  it('MIXED => 1.0 / perfect (pSecond=0.40 >= 0.15)', () => {
    expect(score(dist, 'mixed')).toBe(1.0);
    expect(bucket(dist, 'mixed')).toBe('perfect');
  });

  it('fold => 0.75 / partial (CLOSE band, top action)', () => {
    expect(score(dist, 'fold')).toBe(0.75);
    expect(bucket(dist, 'fold')).toBe('partial');
  });

  it('call => 0.75 / partial (CLOSE band, minority but >= TINY_MIN)', () => {
    expect(score(dist, 'call')).toBe(0.75);
    expect(bucket(dist, 'call')).toBe('partial');
  });

  it('raise => <= 0.25 / partial (TINY_MIN floor applied, pUser=0.05 < 0.10)', () => {
    const s = score(dist, 'raise');
    expect(s).toBeLessThanOrEqual(0.25);
    expect(bucket(dist, 'raise')).toBe('partial');
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('action not in distribution => 0.0 / miss', () => {
    expect(score({ raise: 1.0 }, 'call')).toBe(0.0);
    expect(bucket({ raise: 1.0 }, 'call')).toBe('miss');
  });

  it('normalizes distributions that do not sum to exactly 1', () => {
    // 160/200 = 0.8 raise, 40/200 = 0.2 fold after normalizing
    const s = scoreChoice({ raise: 160, fold: 40 }, 'raise');
    expect(s.score).toBe(1.0);
    expect(s.gradeBucket).toBe('perfect');
  });

  it('single-action pure range => MIXED scores 0.0', () => {
    expect(score({ raise: 1.0 }, 'mixed')).toBe(0.0);
    expect(bucket({ raise: 1.0 }, 'mixed')).toBe('miss');
  });

  it('respects custom MIX_MIN config', () => {
    // pSecond=0.2 is >= default 0.15 but below a custom 0.25
    const dist = { raise: 0.8, fold: 0.2 };
    const high = scoreChoice(dist, 'mixed', { MIX_MIN: 0.25 });
    expect(high.score).toBe(0.0);
    expect(high.gradeBucket).toBe('miss');
  });

  it('respects custom mixedPenaltyScore', () => {
    const dist = { raise: 0.95, fold: 0.05 };
    const lenient = scoreChoice(dist, 'mixed', { mixedPenaltyScore: 0.25 });
    expect(lenient.score).toBe(0.25);
  });
});
