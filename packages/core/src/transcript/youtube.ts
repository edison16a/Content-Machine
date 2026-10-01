import { CLOCK_PATTERN, parseClock } from './timestamp.js';
import type { RawCue } from './types.js';

/** Panel chrome that sneaks into a copy of YouTube's "Show transcript" box. */
const UI_LINES = new Set([
  'transcript',
  'search in video',
  'show transcript',
  'hide transcript',
  'chapters',
  'no results found',
  'follow along using the transcript.',
  'english',
  'english (auto-generated)',
]);

/** Screen reader duration text such as "2 minutes, 5 seconds". */
const SPOKEN_DURATION =
  /^\d+\s+(hours?|minutes?|seconds?)(,\s*\d+\s+(hours?|minutes?|seconds?))*$/i;

const INLINE_STAMP = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+)$/;

function isNoise(line: string): boolean {
  return UI_LINES.has(line.toLowerCase()) || SPOKEN_DURATION.test(line);
}

/**
 * Parses a YouTube transcript paste. Handles both layouts: the stamp on its
 * own line followed by text, and stamp plus text on one line. Text lines that
 * follow one stamp are joined, so wrapped captions stay one cue.
 */
export function parseYouTube(text: string): RawCue[] {
  const cues: RawCue[] = [];
  let current: RawCue | undefined;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || isNoise(line)) continue;
    if (CLOCK_PATTERN.test(line)) {
      const start = parseClock(line);
      if (start === undefined) continue;
      current = { start, text: '' };
      cues.push(current);
      continue;
    }
    const inline = INLINE_STAMP.exec(line);
    const inlineStart = inline?.[1] === undefined ? undefined : parseClock(inline[1]);
    if (inline?.[2] !== undefined && inlineStart !== undefined) {
      current = { start: inlineStart, text: inline[2].trim() };
      cues.push(current);
      continue;
    }
    if (current !== undefined) {
      current.text = current.text === '' ? line : `${current.text} ${line}`;
    }
  }
  return cues.filter((cue) => cue.text !== '');
}
