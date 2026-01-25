# Poker Range Parser (Sharp-based)

A deterministic pixel-based parser that converts poker range chart screenshots into TypeScript data files.

## How It Works

1. **Color Sampling**: Samples raise/call/fold colors from known cells (AA=red, 99=green, A2s=blue)
2. **Grid Parsing**: Splits the 13x13 grid into cells and analyzes each pixel
3. **Color Matching**: Uses LAB color space with Delta-E distance for accurate color matching
4. **Mixed Strategy Detection**: Detects split cells (e.g., 60% raise / 40% call)

## Quick Start

```bash
# 1. Take a screenshot of JUST the 13x13 grid (no legend, no title)
#    - From AA (top-left) to 22 (bottom-right)
#    - Save to tmp/chart.png

# 2. Parse the range
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position UTG --scenario rfi

# 3. Output will be in data/ranges/
```

## Screenshot Requirements

For best results, your screenshot should include **only the 13x13 grid**:

```
┌────────────────────────────────────────────┐
│ AA  AKs AQs AJs ATs A9s A8s A7s ... A2s   │
│ AKo KK  KQs KJs KTs K9s K8s K7s ... K2s   │
│ AQo KQo QQ  QJs QTs Q9s Q8s Q7s ... Q2s   │
│ ...                                        │
│ A2o K2o Q2o J2o T2o 92o 82o 72o ... 22    │
└────────────────────────────────────────────┘
```

**Do NOT include:**
- Legend (Raise/Call/Fold labels)
- Title or header text
- Extra padding or borders

The parser samples colors from known cells:
- **Raise**: AA cell (should be red/raise in most charts)
- **Call**: 99 cell (should be green/call)
- **Fold**: A2s cell (should be blue/fold)

## CLI Options

```
Usage: npx tsx tools/range-parser/parseRange.ts <image-path> [options]

Options:
  --stack <size>      Stack size (default: 80bb)
  --position <pos>    Position: UTG, UTG+1, LJ, HJ, CO, BTN, SB, BB
  --scenario <type>   Scenario: rfi, vs-3bet, vs-4bet, vs-raise
  --opponent <pos>    Opponent position (for vs-* scenarios)
  --output <path>     Output file path (default: auto-generated in data/ranges/)
  --preview-only      Only generate preview crops, don't parse
  --no-preview        Skip generating preview crops
```

## Examples

```bash
# UTG Raise First In
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position UTG --scenario rfi

# UTG+1 vs UTG Raise
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position "UTG+1" --scenario vs-raise --opponent UTG

# Button RFI with custom output path
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --position BTN --scenario rfi --output data/ranges/my-btn-range.ts
```

## Verifying Configuration

If parsing results seem off, check the crop previews:

```bash
npx tsx tools/range-parser/parseRange.ts tmp/chart.png --preview-only
```

This generates:
- `tmp/preview-grid.png` - Should show the full 13x13 grid
- `tmp/preview-legend-raise.png` - Should show AA (red)
- `tmp/preview-legend-call.png` - Should show 99 (green)
- `tmp/preview-legend-fold.png` - Should show A2s (blue)

## Configuration

The parser uses crop regions defined in `config.ts`. The default config is optimized for grid-only screenshots around 1190×934 pixels.

If your screenshots have different dimensions, adjust these values:

```typescript
export const DEFAULT_CONFIG: RangeChartConfig = {
  // Grid covers the entire image with small margins
  gridBox: { x: 8, y: 8, w: 1175, h: 920 },
  legend: {
    // Sample colors from known solid cells:
    // AA (row 0, col 0) for raise color
    raiseBox: { x: 20, y: 20, w: 60, h: 45 },
    // 99 (row 5, col 5) for call color
    callBox: { x: 468, y: 365, w: 60, h: 45 },
    // A2s (row 0, col 12) for fold color
    foldBox: { x: 1100, y: 20, w: 60, h: 45 },
  },
  cellInsetPct: 0.15,  // Ignore 15% of cell edges to avoid borders
};
```

## Output

The parser generates:

1. **TypeScript range file** in `data/ranges/`
2. **JSON debug output** in `tmp/parsed-range.json`
3. **Console stats** showing action counts and detected colors

### Sample Output

```
Parsing range chart...

Legend colors detected (RGB):
  Raise: rgb(235, 66, 68)
  Call:  rgb(114, 192, 116)
  Fold:  rgb(80, 136, 191)

Action counts:
  Raise: 3
  Call: 6
  Fold: 141
  Blended: 19
  Total: 169

Range file written to: data/ranges/80bb-utgplus1-vs-raise-vs-utg.ts
```

## Mixed Strategies (Splits)

The parser detects cells with multiple colors and outputs blended actions:

```typescript
// Pure action
'AA': 'raise',

// Mixed strategy (70% raise, 30% call)
'A5s': { raise: 70, call: 30 },
```

Detection thresholds (tune in `parseRangeChart.ts`):
- **>85% one color** → Pure action
- **Second color <12%** → Pure action (ignore noise)
- **Otherwise** → Blended action (rounded to 10%)

## Troubleshooting

### Colors detected incorrectly
- Ensure AA is a solid raise (red) cell in your chart
- Ensure 99 is a solid call (green) cell
- Ensure A2s is a solid fold (blue) cell
- If not, adjust the sample box positions in `config.ts`

### Grid misaligned
- Run with `--preview-only` and check `tmp/preview-grid.png`
- Adjust `gridBox` coordinates to capture exactly the 13x13 cells

### Cells misidentified near borders
- Increase `cellInsetPct` to ignore more edge pixels
- Default is 0.15 (15% inset from each edge)

### Different image dimensions
- Get your image dimensions: check file properties or use an image editor
- Adjust `gridBox` and legend sample positions proportionally

## File Structure

```
tools/range-parser/
├── config.ts          # Crop region configuration
├── parseRange.ts      # Main CLI entry point
├── parseRangeChart.ts # Core parsing logic
├── previewCrops.ts    # Preview crop generator
├── template.ts        # Range file template (reference)
└── README.md          # This file
```
