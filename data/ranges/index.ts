import type { PokerRange, Position, StackSize, Scenario } from '@/types';

// Import all range files
import range80bbUtgRfi from './80bb-utg-rfi';
import range80bbUtgPlus1Rfi from './80bb-utgplus1-rfi';
import range80bbLjRfi from './80bb-lj-rfi';
import range80bbHjRfi from './80bb-hj-rfi';
import range80bbCoRfi from './80bb-co-rfi';
import range80bbBtnRfi from './80bb-btn-rfi';

import range80bbUtgPlus1VsUtgVsRaise from './80bb-utgplus1-vs-utg-vs-raise';
import range80bbHjVsUtgVsRaise from './80bb-hj-vs-utg-vs-raise';
import range80bbHjVsLjVsRaise from './80bb-hj-vs-lj-vs-raise';
import range80bbBtnVsUtgVsRaise from './80bb-btn-vs-utg-vs-raise';
import range80bbBtnVsLjVsRaise from './80bb-btn-vs-lj-vs-raise';
import range80bbBtnVsCoVsRaise from './80bb-btn-vs-co-vs-raise';
import range80bbSbVsUtgVsRaise from './80bb-sb-vs-utg-vs-raise';
import range80bbSbVsLjVsRaise from './80bb-sb-vs-lj-vs-raise';
import range80bbSbVsCoVsRaise from './80bb-sb-vs-co-vs-raise';
import range80bbBbVsUtgVsRaise from './80bb-bb-vs-utg-vs-raise';
import range80bbBbVsLjVsRaise from './80bb-bb-vs-lj-vs-raise';
import range80bbBbVsBtnVsRaise from './80bb-bb-vs-btn-vs-raise';

import range80bbHjVsUtgRaiseLjCall from './80bb-hj-vs-utg-raise-lj-call';
import range80bbSbVsUtgRaiseLjCall from './80bb-sb-vs-utg-raise-lj-call';
import range80bbBtnVsUtgRaiseLjCall from './80bb-btn-vs-utg-raise-lj-call';
import range80bbBbVsUtgRaiseLjCall from './80bb-bb-vs-utg-raise-lj-call';
import range80bbBtnVsLjRaiseCoCall from './80bb-btn-vs-lj-raise-co-call';
import range80bbSbVsLjRaiseCoCall from './80bb-sb-vs-lj-raise-co-call';
import range80bbBbVsLjRaiseCoCall from './80bb-bb-vs-lj-raise-co-call';
import range80bbSbVsCoRaiseBtnCall from './80bb-sb-vs-co-raise-btn-call';
import range80bbBbVsCoRaiseBtnCall from './80bb-bb-vs-co-raise-btn-call';
import range80bbBbVsBtnRaiseSbCall from './80bb-bb-vs-btn-raise-sb-call';

/**
 * Build a lookup key from range parameters.
 * Format for RFI: {stackSize}-{position}-rfi
 * Format for vs-raise: {stackSize}-{position}-vs-{opponent}-vs-raise
 * Format for vs-raise-call: {stackSize}-{position}-vs-{raiser}-raise-{caller}-call
 */
function buildKey(
  stackSize: StackSize,
  position: Position,
  scenario: Scenario,
  opponent?: Position | null,
  caller?: Position | null
): string {
  const positionSlug = position.toLowerCase().replace('+', 'plus');
  
  // vs-raise-call: 3-way pot with raiser and caller
  if (scenario === 'vs-raise-call' && opponent && caller) {
    const raiserSlug = opponent.toLowerCase().replace('+', 'plus');
    const callerSlug = caller.toLowerCase().replace('+', 'plus');
    return `${stackSize}-${positionSlug}-vs-${raiserSlug}-raise-${callerSlug}-call`;
  }
  
  // Other vs-* scenarios with single opponent
  if (opponent && scenario !== 'rfi') {
    const opponentSlug = opponent.toLowerCase().replace('+', 'plus');
    return `${stackSize}-${positionSlug}-vs-${opponentSlug}-${scenario}`;
  }
  
  return `${stackSize}-${positionSlug}-${scenario}`;
}

/**
 * Registry of all available ranges, keyed by their lookup string.
 */
const RANGE_REGISTRY: Record<string, PokerRange> = {
  // RFI ranges
  '80bb-utg-rfi': range80bbUtgRfi,
  '80bb-utgplus1-rfi': range80bbUtgPlus1Rfi,
  '80bb-lj-rfi': range80bbLjRfi,
  '80bb-hj-rfi': range80bbHjRfi,
  '80bb-co-rfi': range80bbCoRfi,
  '80bb-btn-rfi': range80bbBtnRfi,
  
  // vs Raise ranges
  '80bb-utgplus1-vs-utg-vs-raise': range80bbUtgPlus1VsUtgVsRaise,
  '80bb-hj-vs-utg-vs-raise': range80bbHjVsUtgVsRaise,
  '80bb-hj-vs-lj-vs-raise': range80bbHjVsLjVsRaise,
  '80bb-btn-vs-utg-vs-raise': range80bbBtnVsUtgVsRaise,
  '80bb-btn-vs-lj-vs-raise': range80bbBtnVsLjVsRaise,
  '80bb-btn-vs-co-vs-raise': range80bbBtnVsCoVsRaise,
  '80bb-sb-vs-utg-vs-raise': range80bbSbVsUtgVsRaise,
  '80bb-sb-vs-lj-vs-raise': range80bbSbVsLjVsRaise,
  '80bb-sb-vs-co-vs-raise': range80bbSbVsCoVsRaise,
  '80bb-bb-vs-utg-vs-raise': range80bbBbVsUtgVsRaise,
  '80bb-bb-vs-lj-vs-raise': range80bbBbVsLjVsRaise,
  '80bb-bb-vs-btn-vs-raise': range80bbBbVsBtnVsRaise,
  
  // vs Raise + Call ranges (3-way pots)
  // Key format: {stack}-{position}-vs-{raiser}-raise-{caller}-call
  '80bb-hj-vs-utg-raise-lj-call': range80bbHjVsUtgRaiseLjCall,
  '80bb-sb-vs-utg-raise-lj-call': range80bbSbVsUtgRaiseLjCall,
  '80bb-btn-vs-utg-raise-lj-call': range80bbBtnVsUtgRaiseLjCall,
  '80bb-bb-vs-utg-raise-lj-call': range80bbBbVsUtgRaiseLjCall,
  '80bb-btn-vs-lj-raise-co-call': range80bbBtnVsLjRaiseCoCall,
  '80bb-sb-vs-lj-raise-co-call': range80bbSbVsLjRaiseCoCall,
  '80bb-bb-vs-lj-raise-co-call': range80bbBbVsLjRaiseCoCall,
  '80bb-sb-vs-co-raise-btn-call': range80bbSbVsCoRaiseBtnCall,
  '80bb-bb-vs-co-raise-btn-call': range80bbBbVsCoRaiseBtnCall,
  '80bb-bb-vs-btn-raise-sb-call': range80bbBbVsBtnRaiseSbCall,
};

/**
 * Get a range by its parameters.
 * Returns the PokerRange if found, or null if not available.
 */
export function getRange(
  stackSize: StackSize,
  position: Position,
  scenario: Scenario,
  opponent?: Position | null,
  caller?: Position | null
): PokerRange | null {
  const key = buildKey(stackSize, position, scenario, opponent, caller);
  return RANGE_REGISTRY[key] ?? null;
}

/**
 * Check if a range exists for the given parameters.
 */
export function rangeExists(
  stackSize: StackSize,
  position: Position,
  scenario: Scenario,
  opponent?: Position | null,
  caller?: Position | null
): boolean {
  const key = buildKey(stackSize, position, scenario, opponent, caller);
  return key in RANGE_REGISTRY;
}

/**
 * Get all available range keys.
 */
export function getAllRangeKeys(): string[] {
  return Object.keys(RANGE_REGISTRY);
}

/**
 * Export the registry for advanced use cases.
 */
export { RANGE_REGISTRY };
