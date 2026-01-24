import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import type { RangeNotes, DecisionMeta, HandTag, Bucket, Robustness, Confidence } from '@/types';

/**
 * Load an existing range file if it exists.
 * Returns the range data and notes (if available) or null if not found.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stackSize = searchParams.get('stackSize');
    const position = searchParams.get('position');
    const scenario = searchParams.get('scenario');
    const opponent = searchParams.get('opponent'); // Optional for non-RFI scenarios

    if (!stackSize || !position || !scenario) {
      return NextResponse.json(
        { error: 'Missing required query params' },
        { status: 400 }
      );
    }

    // Build filename based on whether opponent is present
    // Format: {stackSize}-{position}[-vs-{opponent}]-{scenario}.ts
    const positionSlug = position.toLowerCase().replace('+', 'plus');
    let filename: string;
    
    if (opponent && scenario !== 'rfi') {
      const opponentSlug = opponent.toLowerCase().replace('+', 'plus');
      filename = `${stackSize}-${positionSlug}-vs-${opponentSlug}-${scenario}.ts`;
    } else {
      filename = `${stackSize}-${positionSlug}-${scenario}.ts`;
    }
    
    const filepath = path.join(process.cwd(), 'data', 'ranges', filename);

    try {
      const content = await readFile(filepath, 'utf-8');
      
      // Parse the data object from the file content
      // This is a simple regex-based parser for our known format
      const dataMatch = content.match(/const data: RangeData = \{([\s\S]*?)\};/);
      
      if (!dataMatch) {
        return NextResponse.json({ exists: false, data: null, notes: null });
      }

      // Parse the hand entries - supports both simple actions and blended actions
      const dataSection = dataMatch[1];
      const data: Record<string, string | { raise?: number; call?: number; fold?: number }> = {};
      
      // First, parse simple actions: 'AA': 'raise'
      const simpleRegex = /'([A-Za-z0-9]+)':\s*'(raise|call|fold)'/g;
      let match;
      while ((match = simpleRegex.exec(dataSection)) !== null) {
        data[match[1]] = match[2];
      }
      
      // Then, parse blended actions: 'A5s': { raise: 50, call: 50 }
      const blendedRegex = /'([A-Za-z0-9]+)':\s*\{\s*(raise:\s*\d+)?\s*,?\s*(call:\s*\d+)?\s*,?\s*(fold:\s*\d+)?\s*\}/g;
      while ((match = blendedRegex.exec(dataSection)) !== null) {
        const hand = match[1];
        const blended: { raise?: number; call?: number; fold?: number } = {};
        
        // Parse each component if present
        if (match[2]) {
          const raiseMatch = match[2].match(/raise:\s*(\d+)/);
          if (raiseMatch) blended.raise = parseInt(raiseMatch[1], 10);
        }
        if (match[3]) {
          const callMatch = match[3].match(/call:\s*(\d+)/);
          if (callMatch) blended.call = parseInt(callMatch[1], 10);
        }
        if (match[4]) {
          const foldMatch = match[4].match(/fold:\s*(\d+)/);
          if (foldMatch) blended.fold = parseInt(foldMatch[1], 10);
        }
        
        // Only add if we parsed at least one component
        if (Object.keys(blended).length > 0) {
          data[hand] = blended;
        }
      }

      // Parse the notes object if it exists
      let notes: RangeNotes | null = null;
      const notesMatch = content.match(/const notes: RangeNotes = \{([\s\S]*?)\};\s*\n\nexport/);
      
      if (notesMatch) {
        notes = parseNotesSection(notesMatch[1]);
      }

      return NextResponse.json({
        exists: true,
        data,
        notes,
        filename,
      });
    } catch {
      // File doesn't exist
      return NextResponse.json({ exists: false, data: null, notes: null });
    }
  } catch (error) {
    console.error('Error loading range:', error);
    return NextResponse.json(
      { error: 'Failed to load range' },
      { status: 500 }
    );
  }
}

/**
 * Parse the notes section from file content into a RangeNotes object.
 * This handles our specific TypeScript format with DecisionMeta entries.
 */
function parseNotesSection(notesContent: string): RangeNotes {
  const notes: RangeNotes = {};
  
  // Match each hand entry like 'AA': { ... }
  // This regex captures the hand and the entire object content
  const handEntryRegex = /'([A-Za-z0-9]+)':\s*\{([^}]+)\}/g;
  
  let entryMatch;
  while ((entryMatch = handEntryRegex.exec(notesContent)) !== null) {
    const hand = entryMatch[1];
    const objContent = entryMatch[2];
    
    const meta: DecisionMeta = {};
    
    // Parse action
    const actionMatch = objContent.match(/action:\s*'(raise|call|fold)'/);
    if (actionMatch) meta.action = actionMatch[1] as 'raise' | 'call' | 'fold';
    
    // Parse bucket
    const bucketMatch = objContent.match(/bucket:\s*'([^']+)'/);
    if (bucketMatch) meta.bucket = bucketMatch[1] as Bucket;
    
    // Parse evSource
    const evSourceMatch = objContent.match(/evSource:\s*'([^']+)'/);
    if (evSourceMatch) meta.evSource = evSourceMatch[1] as DecisionMeta['evSource'];
    
    // Parse robustness
    const robustnessMatch = objContent.match(/robustness:\s*'([^']+)'/);
    if (robustnessMatch) meta.robustness = robustnessMatch[1] as Robustness;
    
    // Parse tags array
    const tagsMatch = objContent.match(/tags:\s*\[([^\]]+)\]/);
    if (tagsMatch) {
      const tagsContent = tagsMatch[1];
      const tagRegex = /'([^']+)'/g;
      const tags: HandTag[] = [];
      let tagMatch;
      while ((tagMatch = tagRegex.exec(tagsContent)) !== null) {
        tags.push(tagMatch[1] as HandTag);
      }
      meta.tags = tags;
    }
    
    // Parse oneLiner
    const oneLinerMatch = objContent.match(/oneLiner:\s*'([^']+)'/);
    if (oneLinerMatch) meta.oneLiner = oneLinerMatch[1];
    
    // Parse confidence
    const confidenceMatch = objContent.match(/confidence:\s*'([^']+)'/);
    if (confidenceMatch) meta.confidence = confidenceMatch[1] as Confidence;
    
    // Parse generatedBy
    const generatedByMatch = objContent.match(/generatedBy:\s*'([^']+)'/);
    if (generatedByMatch) meta.generatedBy = generatedByMatch[1] as DecisionMeta['generatedBy'];
    
    notes[hand] = meta;
  }
  
  return notes;
}
