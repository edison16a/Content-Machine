import { describe, expect, it } from 'vitest';
import { detectFormat, formatClock, parseClock, parseCueTime, parseTranscript } from '@content-machine/core';

const YOUTUBE_TWO_LINE = `Transcript
Search in video
0:00
so today we're building a tiny house
0:04
4 seconds
[Music]
0:07
and it has to be done
in thirty days
1:02:45
that's a wrap
`;

const YOUTUBE_INLINE = `0:00 hello there
0:03 general kenobi
0:09 you are a bold one`;

const SRT = `1
00:00:00,000 --> 00:00:02,500
Hello <i>there</i>

2
00:00:02,500 --> 00:00:05,000
General Kenobi
`;

const VTT = `WEBVTT
Kind: captions

NOTE this is a note

intro
00:00.000 --> 00:02.000 align:start position:0%
<v Speaker>Hello<00:00:01.000><c> there</c>

00:00:02.000 --> 00:00:04.000
Hello there

00:00:04.000 --> 00:00:06.500
Next line
`;

describe('timestamps', () => {
  it('parses clock stamps', () => {
    expect(parseClock('0:00')).toBe(0);
    expect(parseClock('1:23')).toBe(83);
    expect(parseClock('1:02:45')).toBe(3765);
    expect(parseClock('1:75')).toBeUndefined();
    expect(parseClock('hello')).toBeUndefined();
  });

  it('parses cue times', () => {
    expect(parseCueTime('00:01:02,500')).toBe(62.5);
    expect(parseCueTime('01:02.5')).toBe(62.5);
    expect(parseCueTime('nope')).toBeUndefined();
  });

  it('formats clocks', () => {
    expect(formatClock(83)).toBe('1:23');
    expect(formatClock(3765)).toBe('1:02:45');
    expect(formatClock(-3)).toBe('0:00');
  });
});

describe('detectFormat', () => {
  it('detects each format', () => {
    expect(detectFormat(YOUTUBE_TWO_LINE)).toBe('youtube');
    expect(detectFormat(SRT)).toBe('srt');
    expect(detectFormat(`﻿${VTT}`)).toBe('vtt');
  });
});

describe('parseTranscript', () => {
  it('parses a two line YouTube paste and skips panel chrome', () => {
    const result = parseTranscript(YOUTUBE_TWO_LINE, 3800);
    expect(result.format).toBe('youtube');
    expect(result.segments).toEqual([
      { start: 0, end: 4, text: "so today we're building a tiny house" },
      { start: 4, end: 7, text: '[Music]' },
      { start: 7, end: 3765, text: 'and it has to be done in thirty days' },
      { start: 3765, end: 3800, text: "that's a wrap" },
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.stats.segments).toBe(4);
    expect(result.stats.lastTimestamp).toBe(3765);
  });

  it('parses inline stamps and infers the last end from the duration', () => {
    const result = parseTranscript(YOUTUBE_INLINE, 12);
    expect(result.segments.map((s) => [s.start, s.end])).toEqual([
      [0, 3],
      [3, 9],
      [9, 12],
    ]);
  });

  it('parses SRT with tags stripped', () => {
    const result = parseTranscript(SRT, 5);
    expect(result.format).toBe('srt');
    expect(result.segments[0]).toEqual({ start: 0, end: 2.5, text: 'Hello there' });
  });

  it('parses WebVTT, drops notes and merges rolling duplicates', () => {
    const result = parseTranscript(VTT, 6.5);
    expect(result.format).toBe('vtt');
    expect(result.segments).toEqual([
      { start: 0, end: 4, text: 'Hello there' },
      { start: 4, end: 6.5, text: 'Next line' },
    ]);
  });

  it('warns when the paste stops well before the end', () => {
    const result = parseTranscript(YOUTUBE_INLINE, 600);
    expect(result.warnings[0]).toMatch(/may be incomplete/);
    expect(result.stats.coverage).toBeCloseTo(9 / 600);
  });

  it('rejects text with no timestamps', () => {
    expect(() => parseTranscript('just words', 10)).toThrow(
      expect.objectContaining({ code: 'E_TRANSCRIPT_EMPTY' }),
    );
  });

  it('ignores text before the first stamp and empty stamps', () => {
    const result = parseTranscript('hello\n0:01\n0:02\nreal text', 0);
    expect(result.segments).toEqual([{ start: 2, end: 2, text: 'real text' }]);
    expect(result.stats.coverage).toBe(1);
  });
});
