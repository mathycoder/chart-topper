import sharp from 'sharp';
import type { RangeChartConfig, Box } from './config';

type Action = 'raise' | 'call' | 'fold' | 'shove' | 'black';
type RangeValue = Action | { raise?: number; call?: number; fold?: number; shove?: number };
export type RangeData = Record<string, RangeValue>;

const HAND_GRID: string[][] = [
  ['AA','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s'],
  ['AKo','KK','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s'],
  ['AQo','KQo','QQ','QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s'],
  ['AJo','KJo','QJo','JJ','JTs','J9s','J8s','J7s','J6s','J5s','J4s','J3s','J2s'],
  ['ATo','KTo','QTo','JTo','TT','T9s','T8s','T7s','T6s','T5s','T4s','T3s','T2s'],
  ['A9o','K9o','Q9o','J9o','T9o','99','98s','97s','96s','95s','94s','93s','92s'],
  ['A8o','K8o','Q8o','J8o','T8o','98o','88','87s','86s','85s','84s','83s','82s'],
  ['A7o','K7o','Q7o','J7o','T7o','97o','87o','77','76s','75s','74s','73s','72s'],
  ['A6o','K6o','Q6o','J6o','T6o','96o','86o','76o','66','65s','64s','63s','62s'],
  ['A5o','K5o','Q5o','J5o','T5o','95o','85o','75o','65o','55','54s','53s','52s'],
  ['A4o','K4o','Q4o','J4o','T4o','94o','84o','74o','64o','54o','44','43s','42s'],
  ['A3o','K3o','Q3o','J3o','T3o','93o','83o','73o','63o','53o','43o','33','32s'],
  ['A2o','K2o','Q2o','J2o','T2o','92o','82o','72o','62o','52o','42o','32o','22'],
];

type RGB = { r: number; g: number; b: number };
type LAB = { l: number; a: number; b: number };

function crop(img: sharp.Sharp, box: Box) {
  return img.clone().extract({ left: box.x, top: box.y, width: box.w, height: box.h });
}

async function medianColor(img: sharp.Sharp): Promise<RGB> {
  // Downsample to reduce cost and make median robust.
  const { data, info } = await img
    .resize(64, 64, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];

  for (let i = 0; i < data.length; i += info.channels) {
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  }

  rs.sort((a, b) => a - b);
  gs.sort((a, b) => a - b);
  bs.sort((a, b) => a - b);

  const mid = Math.floor(rs.length / 2);
  return { r: rs[mid], g: gs[mid], b: bs[mid] };
}

// --- Color math (RGB -> LAB) and distance ---
function srgbToLinear(v: number) {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function rgbToXyz({ r, g, b }: RGB) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // D65
  return {
    x: (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047,
    y: (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0,
    z: (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883,
  };
}

function f(t: number) {
  return t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
}

function rgbToLab(rgb: RGB): LAB {
  const { x, y, z } = rgbToXyz(rgb);
  const fx = f(x), fy = f(y), fz = f(z);
  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function deltaE(l1: LAB, l2: LAB) {
  const dl = l1.l - l2.l;
  const da = l1.a - l2.a;
  const db = l1.b - l2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

// Mask out “white-ish” text pixels
function isWhiteText(rgb: RGB) {
  // Simple, works well for these charts: high brightness + low chroma-ish
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return max > 210 && sat < 0.25;
}

function nearestAction(rgb: RGB, palette: Record<Action, LAB>): Action {
  const lab = rgbToLab(rgb);
  let best: { a: Action; d: number } = { a: 'fold', d: Infinity };
  (Object.keys(palette) as Action[]).forEach((a) => {
    const d = deltaE(lab, palette[a]);
    if (d < best.d) best = { a, d };
  });
  return best.a;
}

function roundTo(n: number, step: number) {
  return Math.max(0, Math.min(100, Math.round(n / step) * step));
}

function normalizeTo100(mix: Record<Action, number>) {
  const entries = Object.entries(mix).sort((a, b) => b[1] - a[1]) as [Action, number][];
  if (entries.length === 0) return mix;
  const sum = entries.reduce((s, [, v]) => s + v, 0);
  if (sum === 100) return mix;
  // Adjust the largest bucket to make sum exactly 100
  const diff = 100 - sum;
  const [topAction] = entries[0];
  mix[topAction] = (mix[topAction] ?? 0) + diff;
  return mix;
}

export async function parseRangeChart(imagePath: string, config: RangeChartConfig) {
  const img = sharp(imagePath);
  
  // Get image metadata to handle dynamic sizing
  const metadata = await img.metadata();
  const imgWidth = metadata.width || config.gridBox.w;
  const imgHeight = metadata.height || config.gridBox.h;
  
  // If gridBox covers most of the image, use full image dimensions
  // This allows the parser to work with different image sizes
  const useFullImage = config.gridBox.x < 20 && config.gridBox.y < 20;
  const gridBox = useFullImage 
    ? { x: 0, y: 0, w: imgWidth, h: imgHeight }
    : config.gridBox;

  // --- 1) Extract grid and calculate cell dimensions ---
  const gridImg = useFullImage ? img : crop(img, gridBox);
  const cellW = Math.floor(gridBox.w / 13);
  const cellH = Math.floor(gridBox.h / 13);
  
  // --- 2) Use hardcoded palette colors ---
  // These are the consistent colors used in poker range charts:
  // Bright Red = Raise, Green = Call, Blue = Fold, Dark Red = Shove, Black = Not in range
  const raiseRGB: RGB = { r: 235, g: 66, b: 68 };   // Bright red
  const callRGB: RGB = { r: 114, g: 192, b: 115 };  // Green
  const foldRGB: RGB = { r: 80, g: 136, b: 191 };   // Blue
  const shoveRGB: RGB = { r: 139, g: 0, b: 0 };     // Dark red
  const blackRGB: RGB = { r: 30, g: 30, b: 30 };    // Black/very dark (not in range)

  const palette: Record<Action, LAB> = {
    raise: rgbToLab(raiseRGB),
    call: rgbToLab(callRGB),
    fold: rgbToLab(foldRGB),
    shove: rgbToLab(shoveRGB),
    black: rgbToLab(blackRGB),
  };

  const data: RangeData = {};

  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const hand = HAND_GRID[row][col];

      const left = col * cellW;
      const top = row * cellH;

      const cell = gridImg.clone().extract({
        left,
        top,
        width: cellW,
        height: cellH,
      });

      // Grab raw pixels
      const { data: px, info } = await cell.raw().toBuffer({ resolveWithObject: true });

      // Inset to avoid borders
      const insetX = Math.floor(cellW * config.cellInsetPct);
      const insetY = Math.floor(cellH * config.cellInsetPct);

      const counts: Record<Action, number> = { raise: 0, call: 0, fold: 0, shove: 0, black: 0 };
      let total = 0;

      for (let y = insetY; y < cellH - insetY; y++) {
        for (let x = insetX; x < cellW - insetX; x++) {
          const i = (y * cellW + x) * info.channels;
          const rgb = { r: px[i], g: px[i + 1], b: px[i + 2] };

          if (isWhiteText(rgb)) continue;

          const a = nearestAction(rgb, palette);
          counts[a]++;
          total++;
        }
      }

      // Fallback (should be rare)
      if (total < 50) {
        data[hand] = 'fold';
        continue;
      }

      const pct = (a: Action) => counts[a] / total;
      const ranked = (Object.keys(counts) as Action[])
        .map((a) => [a, pct(a)] as const)
        .sort((a, b) => b[1] - a[1]);

      const [a1, p1] = ranked[0];
      const [a2, p2] = ranked[1];

      // Decision thresholds (tune as needed)
      // Black cells are always pure (not in range) - no mixing
      if (a1 === 'black' && p1 >= 0.70) {
        data[hand] = 'black';
      } else if (p1 >= 0.85) {
        data[hand] = a1;
      } else if (p2 < 0.12) {
        data[hand] = a1;
      } else {
        // For blended hands, only mix raise/call/fold/shove (not black)
        const mix: Partial<Record<Action, number>> = {};
        if (a1 !== 'black') mix[a1] = roundTo(p1 * 100, 10);
        if (a2 !== 'black') mix[a2] = roundTo(p2 * 100, 10);
        
        // Remove zeros and normalize
        (Object.keys(mix) as Action[]).forEach((k) => {
          if (mix[k] === 0) delete mix[k];
        });
        
        // If we have a valid mix, normalize it
        if (Object.keys(mix).length > 0) {
          normalizeTo100(mix as Record<Action, number>);
          data[hand] = mix as RangeValue;
        } else {
          // Fallback to dominant action
          data[hand] = a1;
        }
      }
    }
  }

  return { data, palette: { raiseRGB, callRGB, foldRGB, shoveRGB, blackRGB } };
}
