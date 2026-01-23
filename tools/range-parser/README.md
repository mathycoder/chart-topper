# Poker Range Parser Skill

This skill converts poker range chart screenshots into structured TypeScript data files.

**CRITICAL**: This is a VISUAL task, not a poker reasoning task. Do NOT use poker logic. Only report what colors you SEE.

## How to Use

1. Attach a screenshot of a poker range chart
2. Say: "Use the range-parser skill to convert this image"
3. Provide metadata: stack size, position, scenario

## Two-Pass Process

### PASS 1: Color Identification (NO REASONING)

Go through all 169 cells and report ONLY the color you see. Do not think about poker. Do not reason about what "should" be a raise or fold. Just see colors.

Output format for Pass 1:
```
Row 0: RED, RED, RED, RED, RED, BLUE, BLUE, BLUE, RED, RED, RED, RED, RED
Row 1: RED, RED, RED, RED, RED, BLUE, BLUE, BLUE, RED, BLUE, BLUE, BLUE, BLUE
Row 2: ...
```

**Rules for Pass 1:**
- Use only these color words: RED, BLUE, GREEN, GRAY, WHITE, PINK, OTHER
- If a color is ambiguous, write "RED?" or "BLUE?" with a question mark
- Do NOT write "raise", "fold", or "call" in this pass
- Do NOT add comments about poker strategy
- Do NOT skip cells or summarize ("rest are blue") - list every single cell

### PASS 2: Color-to-Action Mapping

After Pass 1 is complete, convert colors to actions using this fixed mapping:

| Color | Action |
|-------|--------|
| RED | raise |
| PINK | raise |
| GREEN | call |
| BLUE | fold |
| GRAY | fold |

Then generate the TypeScript file.

## Chart Structure Reference

```
     Col0 Col1 Col2 Col3 Col4 Col5 Col6 Col7 Col8 Col9 Col10 Col11 Col12
Row0  AA   AKs  AQs  AJs  ATs  A9s  A8s  A7s  A6s  A5s  A4s   A3s   A2s
Row1  AKo  KK   KQs  KJs  KTs  K9s  K8s  K7s  K6s  K5s  K4s   K3s   K2s
Row2  AQo  KQo  QQ   QJs  QTs  Q9s  Q8s  Q7s  Q6s  Q5s  Q4s   Q3s   Q2s
Row3  AJo  KJo  QJo  JJ   JTs  J9s  J8s  J7s  J6s  J5s  J4s   J3s   J2s
Row4  ATo  KTo  QTo  JTo  TT   T9s  T8s  T7s  T6s  T5s  T4s   T3s   T2s
Row5  A9o  K9o  Q9o  J9o  T9o  99   98s  97s  96s  95s  94s   93s   92s
Row6  A8o  K8o  Q8o  J8o  T8o  98o  88   87s  86s  85s  84s   83s   82s
Row7  A7o  K7o  Q7o  J7o  T7o  97o  87o  77   76s  75s  74s   73s   72s
Row8  A6o  K6o  Q6o  J6o  T6o  96o  86o  76o  66   65s  64s   63s   62s
Row9  A5o  K5o  Q5o  J5o  T5o  95o  85o  75o  65o  55   54s   53s   52s
Row10 A4o  K4o  Q4o  J4o  T4o  94o  84o  74o  64o  54o  44    43s   42s
Row11 A3o  K3o  Q3o  J3o  T3o  93o  83o  73o  63o  53o  43o   33    32s
Row12 A2o  K2o  Q2o  J2o  T2o  92o  82o  72o  62o  52o  42o   32o   22
```

## Output Format

```typescript
import type { PokerRange, RangeData } from '@/types';

const data: RangeData = {
  // Row 0
  'AA': 'raise',
  'AKs': 'raise',
  // ... all 169 hands, no comments about strategy
};

export const [variableName]: PokerRange = {
  meta: {
    stackSize: '[stackSize]',
    position: '[position]',
    scenario: '[scenario]',
    displayName: '[displayName]',
  },
  data,
};

export default [variableName];
```

## Example Execution

**User**: "Use the range-parser skill. 80bb UTG RFI." [image attached]

**AI Response**:

### Pass 1: Color Identification

```
Row 0:  RED, RED, RED, RED, RED, BLUE, BLUE, BLUE, RED, RED, RED, RED, RED
Row 1:  RED, RED, RED, RED, RED, BLUE, BLUE, BLUE, RED, BLUE, BLUE, BLUE, BLUE
Row 2:  RED, RED, RED, RED, RED, RED, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
Row 3:  RED, RED, BLUE, RED, RED, RED, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
Row 4:  RED, BLUE, BLUE, BLUE, RED, RED, RED, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
Row 5:  BLUE, BLUE, BLUE, BLUE, BLUE, RED, RED, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
Row 6:  BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, RED, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
Row 7:  BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, RED, RED, BLUE, BLUE, BLUE, BLUE
Row 8:  BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, RED, RED, BLUE, BLUE, BLUE
Row 9:  BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, RED, RED, BLUE, BLUE
Row 10: BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, RED, BLUE, BLUE
Row 11: BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
Row 12: BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE
```

### Pass 2: Mapping

RED → raise, BLUE → fold

[Then generate TypeScript file]

## Ambiguous Cells

If you see a cell that could be two colors:
1. Mark it with "?" in Pass 1: `RED?`
2. After Pass 1, list all ambiguous cells: "Cells marked uncertain: Row 1 Col 8 (RED?)"
3. Ask user to confirm before proceeding to Pass 2

## Verification

After generating, count:
- Total RED cells = X (should match raise count)
- Total BLUE cells = Y (should match fold count)
- Total GREEN cells = Z (should match call count)
- X + Y + Z should = 169
