import type { PokerRange, Position, StackSize, Scenario } from '@/types';

////////////////////////////////////////////////////////////
// 80bb+ ranges
////////////////////////////////////////////////////////////
// RFI ranges
import range80bbUtgRfi from './80bb-utg-rfi';
import range80bbUtgPlus1Rfi from './80bb-utgplus1-rfi';
import range80bbLjRfi from './80bb-lj-rfi';
import range80bbHjRfi from './80bb-hj-rfi';
import range80bbCoRfi from './80bb-co-rfi';
import range80bbBtnRfi from './80bb-btn-rfi';
import range80bbSbRfi from './80bb-sb-rfi';

// vs Raise ranges
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

// vs Raise + Call ranges (3-way pots)
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

// vs 3-bet ranges
import range80bbUtgVsUtgPlus1Vs3bet from './80bb-utg-vs-utgplus1-vs-3bet';
import range80bbUtgVsHjVs3bet from './80bb-utg-vs-hj-vs-3bet';
import range80bbUtgVsBtnVs3bet from './80bb-utg-vs-btn-vs-3bet';
import range80bbUtgVsSbVs3bet from './80bb-utg-vs-sb-vs-3bet';
import range80bbUtgVsBbVs3bet from './80bb-utg-vs-bb-vs-3bet';
import range80bbLjVsHjVs3bet from './80bb-lj-vs-hj-vs-3bet';
import range80bbLjVsBtnVs3bet from './80bb-lj-vs-btn-vs-3bet';
import range80bbLjVsSbVs3bet from './80bb-lj-vs-sb-vs-3bet';
import range80bbLjVsBbVs3bet from './80bb-lj-vs-bb-vs-3bet';
import range80bbCoVsBtnVs3bet from './80bb-co-vs-btn-vs-3bet';
import range80bbCoVsSbVs3bet from './80bb-co-vs-sb-vs-3bet';
import range80bbCoVsBbVs3bet from './80bb-co-vs-bb-vs-3bet';
import range80bbBtnVsSbVs3bet from './80bb-btn-vs-sb-vs-3bet';
import range80bbBtnVsBbVs3bet from './80bb-btn-vs-bb-vs-3bet';

////////////////////////////////////////////////////////////
// 50bb+ ranges
////////////////////////////////////////////////////////////
// RFI ranges
import range50bbUtgRfi from './50bb-utg-rfi';
import range50bbUtgPlus1Rfi from './50bb-utgplus1-RFI';
import range50bbLjRfi from './50bb-lj-RFI';
import range50bbHjRfi from './50bb-hj-RFI';
import range50bbCoRfi from './50bb-co-RFI';
import range50bbBtnRfi from './50bb-btn-RFI';

// vs Raise ranges
// import range50bbUtgVsUtgPlus1VsRaise from './50bb-utg-vs-utgplus1-vs-raise';
import rangeBBVsBTNVsRaise from './50bb-bb-vs-btn-vs-raise';
import rangeBBVsCOVsRaise from './50bb-bb-vs-co-vs-raise';
import rangeBBVsLJVsRaise from './50bb-bb-vs-lj-vs-raise';
import rangeBBVsUTGVsRaise from './50bb-bb-vs-utg-vs-raise';
import rangeBTNVsCOVsRaise from './50bb-btn-vs-co-vs-raise';
import rangeBTNVsLJVsRaise from './50bb-btn-vs-lj-vs-raise'; 
import rangeBTNVsUTGVsRaise from './50bb-btn-vs-utg-vs-raise'; 
import rangeHJVsLJVsRaise from './50bb-hj-vs-lj-vs-raise'; 
import rangeHJVsUTGVsRaise from './50bb-hj-vs-utg-vs-raise';  
import rangeSBVsBTNVsRaise from './50bb-sb-vs-btn-vs-raise'; 
import rangeSBVsCOVsRaise from './50bb-sb-vs-co-vs-raise'; 
import rangeSbVsLJVsRaise from './50bb-sb-vs-lj-vs-raise';
import rangeSbVsUTGVsRaise from './50bb-sb-vs-utg-vs-raise';
import rangeUTGPlus1VsUTGVsRaise from './50bb-utgplus1-vs-utg-vs-raise';


////////////////////////////////////////////////////////////
// 25bb+ ranges
////////////////////////////////////////////////////////////
// RFI ranges
import range25bbUtgRfi from './25bb-utg-RFI';
import range25bbUtgPlus1Rfi from './25bb-utgplus1-RFI';
import range25bbLjRfi from './25bb-lj-RFI';
import range25bbHjRfi from './25bb-hj-RFI';
import range25bbCoRfi from './25bb-co-RFI';
import range25bbBtnRfi from './25bb-btn-RFI';

////////////////////////////////////////////////////////////
// 15bb+ ranges
////////////////////////////////////////////////////////////
// RFI ranges
import range15bbUtgRfi from './15bb-utg-RFI';
import range15bbUtgPlus1Rfi from './15bb-utgplus1-RFI';
import range15bbLjRfi from './15bb-lj-RFI';
import range15bbHjRfi from './15bb-hj-RFI';
import range15bbCoRfi from './15bb-co-RFI';
import range15bbBtnRfi from './15bb-btn-RFI';

////////////////////////////////////////////////////////////
// 10bb+ ranges
////////////////////////////////////////////////////////////
// RFI ranges
import range10bbUtgRfi from './10bb-utg-RFI';
import range10bbUtgPlus1Rfi from './10bb-utgplus1-RFI';
import range10bbLjRfi from './10bb-lj-RFI';
import range10bbHjRfi from './10bb-hj-RFI';
import range10bbCoRfi from './10bb-co-RFI';
import range10bbBtnRfi from './10bb-btn-RFI';

////////////////////////////////////////////////////////////
// 5bb+ ranges
////////////////////////////////////////////////////////////
// RFI ranges
import range5bbUtgRfi from './5bb-utg-RFI';
import range5bbUtgPlus1Rfi from './5bb-utgplus1-RFI';
import range5bbLjRfi from './5bb-lj-RFI';
import range5bbHjRfi from './5bb-hj-RFI';
import range5bbCoRfi from './5bb-co-RFI';
import range5bbBtnRfi from './5bb-btn-RFI';

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
  ////////////////////////////////////////////////////////////
// 80bb+ ranges
////////////////////////////////////////////////////////////
  // RFI ranges
  '80bb-utg-rfi': range80bbUtgRfi,
  '80bb-utgplus1-rfi': range80bbUtgPlus1Rfi,
  '80bb-lj-rfi': range80bbLjRfi,
  '80bb-hj-rfi': range80bbHjRfi,
  '80bb-co-rfi': range80bbCoRfi,
  '80bb-btn-rfi': range80bbBtnRfi,
  '80bb-sb-rfi': range80bbSbRfi,
  
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
  
  // vs 3-bet ranges
  '80bb-utg-vs-utgplus1-vs-3bet': range80bbUtgVsUtgPlus1Vs3bet,
  '80bb-utg-vs-hj-vs-3bet': range80bbUtgVsHjVs3bet,
  '80bb-utg-vs-btn-vs-3bet': range80bbUtgVsBtnVs3bet,
  '80bb-utg-vs-sb-vs-3bet': range80bbUtgVsSbVs3bet,
  '80bb-utg-vs-bb-vs-3bet': range80bbUtgVsBbVs3bet,
  '80bb-lj-vs-hj-vs-3bet': range80bbLjVsHjVs3bet,
  '80bb-lj-vs-btn-vs-3bet': range80bbLjVsBtnVs3bet,
  '80bb-lj-vs-sb-vs-3bet': range80bbLjVsSbVs3bet,
  '80bb-lj-vs-bb-vs-3bet': range80bbLjVsBbVs3bet,
  '80bb-co-vs-btn-vs-3bet': range80bbCoVsBtnVs3bet,
  '80bb-co-vs-sb-vs-3bet': range80bbCoVsSbVs3bet,
  '80bb-co-vs-bb-vs-3bet': range80bbCoVsBbVs3bet,
  '80bb-btn-vs-sb-vs-3bet': range80bbBtnVsSbVs3bet,
  '80bb-btn-vs-bb-vs-3bet': range80bbBtnVsBbVs3bet,

  ////////////////////////////////////////////////////////////
  // 50bb+ ranges
  ////////////////////////////////////////////////////////////
  // RFI
  '50bb-utg-rfi': range50bbUtgRfi,
  '50bb-utgplus1-rfi': range50bbUtgPlus1Rfi,
  '50bb-lj-rfi': range50bbLjRfi,
  '50bb-hj-rfi': range50bbHjRfi,
  '50bb-co-rfi': range50bbCoRfi,
  '50bb-btn-rfi': range50bbBtnRfi,
  // vs Raise
  '50bb-bb-vs-btn-vs-raise': rangeBBVsBTNVsRaise,
  '50bb-bb-vs-co-vs-raise': rangeBBVsCOVsRaise,
  '50bb-bb-vs-lj-vs-raise': rangeBBVsLJVsRaise,
  '50bb-bb-vs-utg-vs-raise': rangeBBVsUTGVsRaise,
  '50bb-btn-vs-co-vs-raise': rangeBTNVsCOVsRaise,
  '50bb-btn-vs-lj-vs-raise': rangeBTNVsLJVsRaise,
  '50bb-btn-vs-utg-vs-raise': rangeBTNVsUTGVsRaise,
  '50bb-hj-vs-lj-vs-raise': rangeHJVsLJVsRaise,
  '50bb-hj-vs-utg-vs-raise': rangeHJVsUTGVsRaise,
  '50bb-sb-vs-btn-vs-raise': rangeSBVsBTNVsRaise,
  '50bb-sb-vs-co-vs-raise': rangeSBVsCOVsRaise,
  '50bb-sb-vs-lj-vs-raise': rangeSbVsLJVsRaise,
  '50bb-sb-vs-utg-vs-raise': rangeSbVsUTGVsRaise,
  '50bb-utgplus1-vs-utg-vs-raise': rangeUTGPlus1VsUTGVsRaise,

  // 25bb+ ranges
  '25bb-utg-rfi': range25bbUtgRfi,
  '25bb-utgplus1-rfi': range25bbUtgPlus1Rfi,
  '25bb-lj-rfi': range25bbLjRfi,
  '25bb-hj-rfi': range25bbHjRfi,
  '25bb-co-rfi': range25bbCoRfi,
  '25bb-btn-rfi': range25bbBtnRfi,

  // 15bb+ ranges
  '15bb-utg-rfi': range15bbUtgRfi,
  '15bb-utgplus1-rfi': range15bbUtgPlus1Rfi,
  '15bb-lj-rfi': range15bbLjRfi,
  '15bb-hj-rfi': range15bbHjRfi,
  '15bb-co-rfi': range15bbCoRfi,
  '15bb-btn-rfi': range15bbBtnRfi,

  // 10bb+ ranges
  '10bb-utg-rfi': range10bbUtgRfi,
  '10bb-utgplus1-rfi': range10bbUtgPlus1Rfi,
  '10bb-lj-rfi': range10bbLjRfi,
  '10bb-hj-rfi': range10bbHjRfi,
  '10bb-co-rfi': range10bbCoRfi,
  '10bb-btn-rfi': range10bbBtnRfi,

  // 5bb+ ranges
  '5bb-utg-rfi': range5bbUtgRfi,
  '5bb-utgplus1-rfi': range5bbUtgPlus1Rfi,
  '5bb-lj-rfi': range5bbLjRfi,
  '5bb-hj-rfi': range5bbHjRfi,
  '5bb-co-rfi': range5bbCoRfi,
  '5bb-btn-rfi': range5bbBtnRfi,
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

// Position order for consistent sorting
const POSITION_ORDER: Position[] = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// Helper to convert slug back to Position
function slugToPosition(slug: string): Position | null {
  const map: Record<string, Position> = {
    'utg': 'UTG',
    'utgplus1': 'UTG+1',
    'lj': 'LJ',
    'hj': 'HJ',
    'co': 'CO',
    'btn': 'BTN',
    'sb': 'SB',
    'bb': 'BB',
  };
  return map[slug] ?? null;
}

// Helper to parse a registry key into its components
function parseKey(key: string): {
  stackSize: StackSize;
  position: Position;
  scenario: Scenario;
  opponent?: Position;
  caller?: Position;
} | null {
  // vs-raise-call: {stack}-{position}-vs-{raiser}-raise-{caller}-call
  const vsRaiseCallMatch = key.match(/^(\d+bb)-(\w+)-vs-(\w+)-raise-(\w+)-call$/);
  if (vsRaiseCallMatch) {
    const pos = slugToPosition(vsRaiseCallMatch[2]);
    const opp = slugToPosition(vsRaiseCallMatch[3]);
    const cal = slugToPosition(vsRaiseCallMatch[4]);
    if (pos && opp && cal) {
      return {
        stackSize: vsRaiseCallMatch[1] as StackSize,
        position: pos,
        scenario: 'vs-raise-call',
        opponent: opp,
        caller: cal,
      };
    }
  }

  // vs-raise: {stack}-{position}-vs-{opponent}-vs-raise
  const vsRaiseMatch = key.match(/^(\d+bb)-(\w+)-vs-(\w+)-vs-raise$/);
  if (vsRaiseMatch) {
    const pos = slugToPosition(vsRaiseMatch[2]);
    const opp = slugToPosition(vsRaiseMatch[3]);
    if (pos && opp) {
      return {
        stackSize: vsRaiseMatch[1] as StackSize,
        position: pos,
        scenario: 'vs-raise',
        opponent: opp,
      };
    }
  }

  // vs-3bet: {stack}-{position}-vs-{opponent}-vs-3bet
  const vs3betMatch = key.match(/^(\d+bb)-(\w+)-vs-(\w+)-vs-3bet$/);
  if (vs3betMatch) {
    const pos = slugToPosition(vs3betMatch[2]);
    const opp = slugToPosition(vs3betMatch[3]);
    if (pos && opp) {
      return {
        stackSize: vs3betMatch[1] as StackSize,
        position: pos,
        scenario: 'vs-3bet',
        opponent: opp,
      };
    }
  }

  // RFI: {stack}-{position}-rfi
  const rfiMatch = key.match(/^(\d+bb)-(\w+)-rfi$/);
  if (rfiMatch) {
    const pos = slugToPosition(rfiMatch[2]);
    if (pos) {
      return {
        stackSize: rfiMatch[1] as StackSize,
        position: pos,
        scenario: 'rfi',
      };
    }
  }

  return null;
}

/**
 * Get scenarios that have at least one range for this stack size.
 */
export function getAvailableScenarios(stackSize: StackSize): Scenario[] {
  const scenarios = new Set<Scenario>();
  for (const key of Object.keys(RANGE_REGISTRY)) {
    const parsed = parseKey(key);
    if (parsed && parsed.stackSize === stackSize) {
      scenarios.add(parsed.scenario);
    }
  }
  // Return in a logical order
  const order: Scenario[] = ['rfi', 'vs-raise', 'vs-raise-call', 'vs-3bet', 'vs-4bet', 'after-limp'];
  return order.filter(s => scenarios.has(s));
}

/**
 * Get hero positions that have data for this stack/scenario.
 */
export function getAvailablePositions(stackSize: StackSize, scenario: Scenario): Position[] {
  const positions = new Set<Position>();
  for (const key of Object.keys(RANGE_REGISTRY)) {
    const parsed = parseKey(key);
    if (parsed && parsed.stackSize === stackSize && parsed.scenario === scenario) {
      positions.add(parsed.position);
    }
  }
  // Return in position order
  return POSITION_ORDER.filter(p => positions.has(p));
}

/**
 * Get opponents that have data for this stack/position/scenario.
 */
export function getAvailableOpponents(
  stackSize: StackSize,
  position: Position,
  scenario: Scenario
): Position[] {
  const opponents = new Set<Position>();
  for (const key of Object.keys(RANGE_REGISTRY)) {
    const parsed = parseKey(key);
    if (
      parsed &&
      parsed.stackSize === stackSize &&
      parsed.position === position &&
      parsed.scenario === scenario &&
      parsed.opponent
    ) {
      opponents.add(parsed.opponent);
    }
  }
  // Return in position order
  return POSITION_ORDER.filter(p => opponents.has(p));
}

/**
 * Get callers that have data for this stack/position/opponent (vs-raise-call only).
 */
export function getAvailableCallers(
  stackSize: StackSize,
  position: Position,
  opponent: Position
): Position[] {
  const callers = new Set<Position>();
  for (const key of Object.keys(RANGE_REGISTRY)) {
    const parsed = parseKey(key);
    if (
      parsed &&
      parsed.stackSize === stackSize &&
      parsed.position === position &&
      parsed.scenario === 'vs-raise-call' &&
      parsed.opponent === opponent &&
      parsed.caller
    ) {
      callers.add(parsed.caller);
    }
  }
  // Return in position order
  return POSITION_ORDER.filter(p => callers.has(p));
}
