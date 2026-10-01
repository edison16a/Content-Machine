import { ValidationError } from '../errors/index.js';
import { parseTimedCues } from './cues.js';
import { formatClock } from './timestamp.js';
import type { RawCue, Segment, Transcript, TranscriptFormat } from './types.js';
import { parseYouTube } from './youtube.js';

/** A last timestamp more than this share short of the video means a partial paste. */
const INCOMPLETE_THRESHOLD = 0.9;

/** Picks the format from the text itself so users never have to say. */
export function detectFormat(text: string): TranscriptFormat {
  const trimmed = text.replace(/^﻿/, '').trimStart();
  if (trimmed.startsWith('WEBVTT')) return 'vtt';
  if (/\d{1,2}:\d{2}:\d{2},\d{1,3}\s+-->/.test(text)) return 'srt';
  return 'youtube';
}

/** Sorts cues and fills each end from the next start (or the video end). */
function toSegments(cues: RawCue[], duration: number): Segment[] {
  const sorted = [...cues].sort((a, b) => a.start - b.start);
  return sorted.map((cue, index) => {
    const next = sorted[index + 1];
    const inferred = next === undefined ? Math.max(duration, cue.start) : next.start;
    const end = Math.min(cue.end ?? inferred, Math.max(duration, cue.start));
    return { start: cue.start, end: Math.max(end, cue.start), text: cue.text };
  });
}

/**
 * Parses a transcript in any supported format into normalized segments.
 * Pure: takes the text and the video's duration in seconds.
 */
export function parseTranscript(text: string, duration: number): Transcript {
  const format = detectFormat(text);
  const cues = format === 'youtube' ? parseYouTube(text) : parseTimedCues(text);
  if (cues.length === 0) {
    throw new ValidationError('E_TRANSCRIPT_EMPTY', 'No timestamped lines were found in the transcript.', {
      hint: 'On YouTube open "Show transcript", select everything in the panel, copy, and paste it again.',
    });
  }
  const segments = toSegments(cues, duration);
  const first = segments[0]?.start ?? 0;
  const last = segments[segments.length - 1]?.start ?? 0;
  const coverage = duration > 0 ? Math.min(1, last / duration) : 1;
  const warnings: string[] = [];
  if (duration > 0 && last < duration * INCOMPLETE_THRESHOLD) {
    warnings.push(
      `The last timestamp is ${formatClock(last)} but the video runs ${formatClock(duration)}. ` +
        'The paste may be incomplete: scroll the transcript panel to the end and copy again.',
    );
  }
  return {
    format,
    segments,
    stats: { segments: segments.length, firstTimestamp: first, lastTimestamp: last, videoDuration: duration, coverage },
    warnings,
  };
}
