import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_CONFIG } from './config';
import { parseRangeChart, RangeData } from './parseRangeChart';
import { previewCrops } from './previewCrops';

// Usage help
const USAGE = `
Usage: npx tsx tools/range-parser/parseRange.ts <image-path> [options]

Options:
  --stack <size>      Stack size (default: 80bb)
  --position <pos>    Position: UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB
  --scenario <type>   Scenario: rfi, vs-3bet, vs-4bet, vs-raise, vs-raise-call
  --opponent <pos>    Opponent/raiser position (for vs-* scenarios)
  --caller <pos>      Caller position (for vs-raise-call scenario only)
  --output <path>     Output file path (default: auto-generated in data/ranges/)
  --preview-only      Only generate preview crops, don't parse
  --no-preview        Skip generating preview crops

Examples:
  npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position UTG --scenario rfi
  npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position UTG+1 --scenario vs-raise --opponent UTG
  npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position BTN --scenario vs-raise-call --opponent UTG --caller HJ
`;

// Parse CLI args
function parseArgs(args: string[]) {
  const result: Record<string, string | boolean> = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key === 'preview-only' || key === 'no-preview') {
        result[key] = true;
        i++;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        result[key] = args[i + 1];
        i += 2;
      } else {
        result[key] = true;
        i++;
      }
    } else {
      if (!result.imagePath) {
        result.imagePath = arg;
      }
      i++;
    }
  }
  return result;
}

// Generate filename from metadata
// Format: {stack}-{position}-{scenario}.ts (for RFI)
// Format: {stack}-{position}-vs-{opponent}-{scenario}.ts (for vs-* scenarios)
// Format: {stack}-{position}-vs-{raiser}-raise-{caller}-call.ts (for vs-raise-call)
function generateFilename(stack: string, position: string, scenario: string, opponent?: string, caller?: string): string {
  const posSlug = position.toLowerCase().replace('+', 'plus');
  
  // vs-raise-call: 3-way pot with raiser and caller
  if (scenario === 'vs-raise-call' && opponent && caller) {
    const raiserSlug = opponent.toLowerCase().replace('+', 'plus');
    const callerSlug = caller.toLowerCase().replace('+', 'plus');
    return `${stack}-${posSlug}-vs-${raiserSlug}-raise-${callerSlug}-call.ts`;
  }
  
  if (opponent) {
    const oppSlug = opponent.toLowerCase().replace('+', 'plus');
    return `${stack}-${posSlug}-vs-${oppSlug}-${scenario}.ts`;
  }
  return `${stack}-${posSlug}-${scenario}.ts`;
}

// Generate display name from metadata
function generateDisplayName(stack: string, position: string, scenario: string, opponent?: string, caller?: string): string {
  const scenarioNames: Record<string, string> = {
    'rfi': 'Raise First In',
    'vs-3bet': 'vs 3-Bet',
    'vs-4bet': 'vs 4-Bet',
    'vs-raise': 'vs Raise',
    'vs-raise-call': 'vs Raise + Call',
    'after-limp': 'After Limp',
  };
  const scenarioDisplay = scenarioNames[scenario] || scenario;
  
  // vs-raise-call: "80bb+ BTN vs UTG raise and HJ call"
  if (scenario === 'vs-raise-call' && opponent && caller) {
    return `${stack}+ ${position} vs ${opponent} raise and ${caller} call`;
  }
  
  if (opponent) {
    return `${stack}+ ${position} - ${scenarioDisplay} from ${opponent}`;
  }
  return `${stack}+ ${position} - ${scenarioDisplay}`;
}

// Format a hand action for TS output
function formatAction(action: string | { raise?: number; call?: number; fold?: number }): string {
  if (typeof action === 'string') {
    return `'${action}'`;
  }
  // Blended action
  const parts: string[] = [];
  if (action.raise !== undefined) parts.push(`raise: ${action.raise}`);
  if (action.call !== undefined) parts.push(`call: ${action.call}`);
  if (action.fold !== undefined) parts.push(`fold: ${action.fold}`);
  return `{ ${parts.join(', ')} }`;
}

// Hand order for output (matches existing range files)
const HAND_ORDER = [
  // Pocket pairs first
  '22', '33', '44', '55', '66', '77', '88', '99', 'TT', 'JJ', 'QQ', 'KK', 'AA',
  // Then suited hands by high card
  'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'AKo',
  'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
  'AQo', 'KQo',
  'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
  'AJo', 'KJo', 'QJo',
  'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
  'ATo', 'KTo', 'QTo', 'JTo',
  'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
  'A9o', 'K9o', 'Q9o', 'J9o', 'T9o',
  '98s', '97s', '96s', '95s', '94s', '93s', '92s',
  'A8o', 'K8o', 'Q8o', 'J8o', 'T8o', '98o',
  '87s', '86s', '85s', '84s', '83s', '82s',
  'A7o', 'K7o', 'Q7o', 'J7o', 'T7o', '97o', '87o',
  '76s', '75s', '74s', '73s', '72s',
  'A6o', 'K6o', 'Q6o', 'J6o', 'T6o', '96o', '86o', '76o',
  '65s', '64s', '63s', '62s',
  'A5o', 'K5o', 'Q5o', 'J5o', 'T5o', '95o', '85o', '75o', '65o',
  '54s', '53s', '52s',
  'A4o', 'K4o', 'Q4o', 'J4o', 'T4o', '94o', '84o', '74o', '64o', '54o',
  '43s', '42s',
  'A3o', 'K3o', 'Q3o', 'J3o', 'T3o', '93o', '83o', '73o', '63o', '53o', '43o',
  '32s',
  'A2o', 'K2o', 'Q2o', 'J2o', 'T2o', '92o', '82o', '72o', '62o', '52o', '42o', '32o',
];

// Generate TypeScript file content
function generateTsFile(
  data: RangeData,
  stack: string,
  position: string,
  scenario: string,
  displayName: string,
  opponent?: string,
  caller?: string
): string {
  const lines: string[] = [];

  lines.push(`import type { PokerRange, RangeData } from '@/types';`);
  lines.push('');
  lines.push(`/**`);
  lines.push(` * ${displayName}`);
  lines.push(` * Generated by range-parser`);
  lines.push(` */`);
  lines.push('');
  lines.push('const data: RangeData = {');

  // Output hands in order
  for (const hand of HAND_ORDER) {
    const action = data[hand];
    if (action !== undefined) {
      lines.push(`  '${hand}': ${formatAction(action)},`);
    }
  }

  lines.push('};');
  lines.push('');

  // Generate variable name from filename pattern
  let varName = `range${position.replace('+', 'Plus')}`;
  if (opponent) {
    varName += `Vs${opponent.replace('+', 'Plus')}`;
  }
  if (caller && scenario === 'vs-raise-call') {
    varName += `And${caller.replace('+', 'Plus')}`;
  }
  varName += scenario.charAt(0).toUpperCase() + scenario.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  lines.push(`export const ${varName}: PokerRange = {`);
  lines.push(`  meta: {`);
  lines.push(`    stackSize: '${stack}',`);
  lines.push(`    position: '${position}',`);
  lines.push(`    scenario: '${scenario}',`);
  if (opponent) {
    lines.push(`    opponentPosition: '${opponent}',`);
  }
  if (caller && scenario === 'vs-raise-call') {
    lines.push(`    callerPosition: '${caller}',`);
  }
  lines.push(`    displayName: '${displayName}',`);
  lines.push(`  },`);
  lines.push(`  data,`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${varName};`);

  return lines.join('\n');
}

const args = parseArgs(process.argv.slice(2));

if (!args.imagePath) {
  console.error(USAGE);
  process.exit(1);
}

const imagePath = args.imagePath as string;
const stack = (args.stack as string) || '80bb';
const position = (args.position as string) || 'UTG';
const scenario = (args.scenario as string) || 'rfi';
const opponent = args.opponent as string | undefined;
const caller = args.caller as string | undefined;
const previewOnly = args['preview-only'] as boolean;
const noPreview = args['no-preview'] as boolean;

async function main() {
  // Ensure tmp directory exists
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Generate preview crops (unless --no-preview)
  if (!noPreview) {
    console.log('Generating preview crops in tmp/...');
    await previewCrops(imagePath, DEFAULT_CONFIG);
    console.log('  tmp/preview-grid.png');
    console.log('  tmp/preview-legend-raise.png');
    console.log('  tmp/preview-legend-call.png');
    console.log('  tmp/preview-legend-fold.png');
  }

  if (previewOnly) {
    console.log('\nPreview-only mode. Check the crop previews and adjust config.ts if needed.');
    return;
  }

  // Parse the range chart
  console.log('\nParsing range chart...');
  const { data, palette } = await parseRangeChart(imagePath, DEFAULT_CONFIG);

  console.log('\nLegend colors detected (RGB):');
  console.log(`  Raise: rgb(${palette.raiseRGB.r}, ${palette.raiseRGB.g}, ${palette.raiseRGB.b})`);
  console.log(`  Call:  rgb(${palette.callRGB.r}, ${palette.callRGB.g}, ${palette.callRGB.b})`);
  console.log(`  Fold:  rgb(${palette.foldRGB.r}, ${palette.foldRGB.g}, ${palette.foldRGB.b})`);

  // Count actions
  let raiseCount = 0, callCount = 0, foldCount = 0, blendCount = 0;
  for (const hand of Object.keys(data)) {
    const action = data[hand];
    if (typeof action === 'string') {
      if (action === 'raise') raiseCount++;
      else if (action === 'call') callCount++;
      else foldCount++;
    } else {
      blendCount++;
    }
  }

  console.log('\nAction counts:');
  console.log(`  Raise: ${raiseCount}`);
  console.log(`  Call: ${callCount}`);
  console.log(`  Fold: ${foldCount}`);
  console.log(`  Blended: ${blendCount}`);
  console.log(`  Total: ${raiseCount + callCount + foldCount + blendCount}`);

  // Generate output
  const displayName = generateDisplayName(stack, position, scenario, opponent, caller);
  const tsContent = generateTsFile(data, stack, position, scenario, displayName, opponent, caller);

  // Determine output path
  let outputPath: string;
  if (args.output) {
    outputPath = args.output as string;
  } else {
    const filename = generateFilename(stack, position, scenario, opponent, caller);
    outputPath = path.join(process.cwd(), 'data', 'ranges', filename);
  }

  // Write file
  fs.writeFileSync(outputPath, tsContent);
  console.log(`\nRange file written to: ${outputPath}`);

  // Also output JSON to tmp for debugging
  const jsonPath = path.join(tmpDir, 'parsed-range.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`JSON debug output: ${jsonPath}`);
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
