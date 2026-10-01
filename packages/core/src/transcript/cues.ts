import { parseCueTime } from './timestamp.js';
import type { RawCue } from './types.js';

const ARROW_LINE = /^(\S+)\s+-->\s+(\S+)/;

/** Strips WebVTT voice, class and inline timestamp tags, plus SRT font tags. */
function stripTags(text: string): string {
  return text
    .replace(/<\d{1,2}:\d{2}(?::\d{2})?\.\d{3}>/g, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses SRT and WebVTT. Both are blocks separated by blank lines, each with
 * a "start --> end" line followed by text, so one parser covers both.
 * Index lines, cue identifiers, NOTE and STYLE blocks are skipped.
 */
export function parseTimedCues(text: string): RawCue[] {
  const cues: RawCue[] = [];
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim());
    const timingIndex = lines.findIndex((line) => ARROW_LINE.test(line));
    if (timingIndex < 0) continue;
    const timing = ARROW_LINE.exec(lines[timingIndex] ?? '');
    const start = parseCueTime(timing?.[1] ?? '');
    const end = parseCueTime(timing?.[2] ?? '');
    const body = stripTags(lines.slice(timingIndex + 1).join(' '));
    if (start === undefined || end === undefined || body === '') continue;
    cues.push({ start, end, text: body });
  }
  return dedupeRollingCaptions(cues);
}

/**
 * YouTube's auto captions in VTT repeat each line as it scrolls. Drop a cue
 * whose text is identical to the one before it, keeping the earlier start.
 */
function dedupeRollingCaptions(cues: RawCue[]): RawCue[] {
  const out: RawCue[] = [];
  for (const cue of cues) {
    const previous = out[out.length - 1];
    if (previous?.text === cue.text) {
      previous.end = cue.end ?? previous.end ?? cue.start;
      continue;
    }
    out.push(cue);
  }
  return out;
}
