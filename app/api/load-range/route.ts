import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Load an existing range file if it exists.
 * Returns the range data or null if not found.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stackSize = searchParams.get('stackSize');
    const position = searchParams.get('position');
    const scenario = searchParams.get('scenario');

    if (!stackSize || !position || !scenario) {
      return NextResponse.json(
        { error: 'Missing required query params' },
        { status: 400 }
      );
    }

    const filename = `${stackSize}-${position.toLowerCase().replace('+', 'plus')}-${scenario}.ts`;
    const filepath = path.join(process.cwd(), 'data', 'ranges', filename);

    try {
      const content = await readFile(filepath, 'utf-8');
      
      // Parse the data object from the file content
      // This is a simple regex-based parser for our known format
      const dataMatch = content.match(/const data: RangeData = \{([\s\S]*?)\};/);
      
      if (!dataMatch) {
        return NextResponse.json({ exists: false, data: null });
      }

      // Parse the hand entries
      const dataSection = dataMatch[1];
      const handRegex = /'([A-Za-z0-9]+)':\s*'(raise|call|fold)'/g;
      const data: Record<string, string> = {};
      
      let match;
      while ((match = handRegex.exec(dataSection)) !== null) {
        data[match[1]] = match[2];
      }

      return NextResponse.json({
        exists: true,
        data,
        filename,
      });
    } catch {
      // File doesn't exist
      return NextResponse.json({ exists: false, data: null });
    }
  } catch (error) {
    console.error('Error loading range:', error);
    return NextResponse.json(
      { error: 'Failed to load range' },
      { status: 500 }
    );
  }
}
