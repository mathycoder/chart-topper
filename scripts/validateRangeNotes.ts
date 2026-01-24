/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';

// Adjust if your types live elsewhere
import type { HandAction, SimpleAction, RangeNotes } from '@/types';

// --- helpers -------------------------------------------------

function isSimpleAction(a: HandAction): a is SimpleAction {
  return typeof a === 'string';
}

function getPrimaryAction(a: HandAction): SimpleAction {
  if (isSimpleAction(a)) return a;

  const raise = a.raise ?? 0;
  const call = a.call ?? 0;
  const fold = a.fold ?? 0;

  // tie-break: raise > call > fold
  if (raise >= call && raise >= fold) return 'raise';
  if (call >= fold) return 'call';
  return 'fold';
}

const BANNED_PHRASES = [
  'surprise',
  'deception',
  'board coverage',
  'great hand but wrong position',
  'dominates all',
];

const EV_ENGINE_PREFIX: Record<string, string> = {
  called_value: 'Called value:',
  realization: 'Realization:',
  domination_avoidance: 'Domination avoidance:',
  no_ev: 'No EV:',
  mixed: 'Mixed EV:',
};

type AnyRangeModule = {
  default?: { data: Record<string, HandAction>; notes?: RangeNotes };
  data?: Record<string, HandAction>;
  notes?: RangeNotes;
};

// --- main ----------------------------------------------------

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: ts-node scripts/validateRangeNotes.ts <path-to-range-file>');
    process.exit(1);
  }

  const absPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  // Dynamically import the TS module (works if you run via ts-node/tsx)
  const mod = (await import(absPath)) as AnyRangeModule;

  // Support either default export of PokerRange or named exports
  const range = mod.default ?? (mod as any);

  const data: Record<string, HandAction> | undefined = (range?.data ?? mod.data) as any;
  const notes: RangeNotes | undefined = (range?.notes ?? mod.notes) as any;

  if (!data) {
    console.error('Could not find `data` in module. Make sure you export a PokerRange or `data`.');
    process.exit(1);
  }
  if (!notes) {
    console.warn('No `notes` found. Nothing to validate.');
    process.exit(0);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [hand, meta] of Object.entries(notes)) {
    if (!meta) continue;

    const actionInData = data[hand];
    if (!actionInData) {
      warnings.push(`notes has hand "${hand}" but data has no such key`);
      continue;
    }

    const primary = getPrimaryAction(actionInData);

    // 1) Action fidelity
    if (meta.action && meta.action !== primary) {
      errors.push(`Action mismatch for ${hand}: notes.action=${meta.action} but data primary=${primary}`);
    }

    // 2) Raise must have exactly one of core_open / edge_open
    if (primary === 'raise') {
      const tags = meta.tags ?? [];
      const hasCore = tags.includes('core_open' as any);
      const hasEdge = tags.includes('edge_open' as any);
      if ((hasCore && hasEdge) || (!hasCore && !hasEdge)) {
        errors.push(
          `Tag rule failed for ${hand}: raise must have exactly one of core_open/edge_open (tags=${JSON.stringify(tags)})`,
        );
      }
    }

    // 3) Banned phrases
    if (meta.oneLiner) {
      const lower = meta.oneLiner.toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        if (lower.includes(phrase)) {
          errors.push(`Banned phrase "${phrase}" found in ${hand} oneLiner: "${meta.oneLiner}"`);
        }
      }
    }

    // 4) EV engine prefix matches evSource
    if (meta.evSource && meta.oneLiner) {
      const expectedPrefix = EV_ENGINE_PREFIX[meta.evSource];
      if (expectedPrefix && !meta.oneLiner.startsWith(expectedPrefix)) {
        warnings.push(
          `Prefix mismatch for ${hand}: evSource=${meta.evSource} expects "${expectedPrefix}" but got "${meta.oneLiner}"`,
        );
      }
    }
  }

  // Print results
  if (warnings.length) {
    console.warn('\nWarnings:');
    for (const w of warnings) console.warn(`- ${w}`);
  }
  if (errors.length) {
    console.error('\nErrors:');
    for (const e of errors) console.error(`- ${e}`);
    process.exit(1);
  }

  console.log('\n✅ Range notes validation passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
