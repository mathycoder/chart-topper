---
name: range-parser
description: Parse poker range chart screenshots into TypeScript data files. Use when the user asks to parse a range, run range-parser, convert a chart image, or mentions parsing a poker range screenshot.
---

# Range Parser

Converts poker range chart screenshots into TypeScript range files using Sharp-based pixel analysis.

## Prerequisites

The user must have saved a screenshot of **just the 13x13 grid** (no legend, no title) to `tmp/chart.png`.

## Usage

When the user asks to parse a range, extract these parameters from their request:

| Parameter | Required | Values | Default |
|-----------|----------|--------|---------|
| position | Yes | UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB | - |
| scenario | Yes | rfi, vs-raise, vs-raise-call, vs-3bet, vs-4bet | - |
| opponent | Only for vs-* scenarios | UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB | - |
| caller | Only for vs-raise-call | UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB | - |
| stack | No | 15bb, 25bb, 40bb, 80bb | 80bb |

## Command

Run from the project root:

```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position "<POSITION>" --scenario <SCENARIO> [--opponent <OPPONENT>] [--caller <CALLER>] [--stack <STACK>]
```

## Examples

**User**: "Parse the range for UTG+1 vs UTG raise at 80bb"
```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position "UTG+1" --scenario vs-raise --opponent UTG
```

**User**: "Run range-parser for BTN RFI"
```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position BTN --scenario rfi
```

**User**: "Parse CO vs BTN 3-bet"
```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position CO --scenario vs-3bet --opponent BTN
```

**User**: "Parse HJ open at 40bb"
```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position HJ --scenario rfi --stack 40bb
```

**User**: "Parse BTN vs UTG raise and HJ call at 80bb"
```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position BTN --scenario vs-raise-call --opponent UTG --caller HJ
```

## Workflow

1. Confirm the user has saved their chart screenshot to `tmp/chart.png`
2. Extract position, scenario, opponent (if needed), caller (for vs-raise-call), and stack from the request
3. Run the command with `required_permissions: ["all"]` (needed for tsx)
4. Report the results: colors detected, action counts, output file path

## Output

The parser generates:
- TypeScript file in `data/ranges/` with the range data
- JSON debug output in `tmp/parsed-range.json`

## Troubleshooting

If parsing fails or results seem wrong:
1. Run with `--preview-only` to check crop alignment
2. Verify the screenshot is just the 13x13 grid (no legend/title)
3. Check that AA is red, 99 is green, A2s is blue in the chart
