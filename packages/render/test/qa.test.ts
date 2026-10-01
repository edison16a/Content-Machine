import { loadImage } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import type { RenderLogEntry } from '@content-machine/core';
import {
  drawContactSheet,
  fingerprint,
  verifyCoverage,
  verifyOutput,
  type MediaInfo,
} from '@content-machine/render';
import { createCanvas } from '@napi-rs/canvas';

function entry(id: number, start: number, end: number): RenderLogEntry {
  return {
    id,
    source: 'a.mp4',
    plannedStart: start,
    plannedEnd: end,
    start,
    end,
    startSnapped: true,
    endSnapped: true,
    planKey: 'k',
    fingerprint: 'f',
    output: `videos/00${id}.mp4`,
    thumb: `thumbs/00${id}.jpg`,
    renderedAt: 'x',
  };
}

const good: MediaInfo = {
  duration: 30,
  width: 1080,
  height: 1920,
  fps: 30,
  videoCodec: 'h264',
  audioCodec: 'aac',
  sampleRate: 48000,
  videoStreams: 1,
  audioStreams: 1,
};

describe('verifyOutput', () => {
  it('passes a correct output', () => {
    expect(verifyOutput(entry(1, 0, 30), good, true)).toMatchObject({ ok: true, problems: [] });
  });

  it('lists every problem', () => {
    const bad = {
      ...good,
      width: 720,
      videoCodec: 'hevc',
      audioCodec: undefined,
      audioStreams: 0,
      videoStreams: 2,
      duration: 61,
    };
    const result = verifyOutput(entry(2, 0, 30), bad, false);
    expect(result.ok).toBe(false);
    expect(result.problems).toHaveLength(8);
    expect(result.problems[0]).toMatch(/^Item 2 is 720x1920/);
  });
});

describe('verifyCoverage', () => {
  it('accepts contiguous Sequential parts covering the source', () => {
    expect(
      verifyCoverage('sequential', [entry(1, 0, 30), entry(2, 30, 60)], { 'a.mp4': 60 }),
    ).toEqual([]);
    expect(verifyCoverage('clip', [entry(1, 5, 9)], { 'a.mp4': 60 })).toEqual([]);
  });

  it('reports gaps, late starts and missing coverage', () => {
    const problems = verifyCoverage('sequential', [entry(1, 1, 30), entry(2, 31, 50)], {
      'a.mp4': 60,
    });
    expect(problems).toHaveLength(3);
  });
});

describe('drawContactSheet', () => {
  it('lays six posters in a 3 by 2 grid', async () => {
    const canvas = createCanvas(360, 640);
    canvas.getContext('2d').fillRect(0, 0, 360, 640);
    const poster = await canvas.encode('jpeg', 80);
    const sheet = await drawContactSheet(
      Array.from({ length: 7 }, (_, i) => ({ id: i + 1, image: poster })),
    );
    const image = await loadImage(Buffer.from(sheet));
    expect([image.width, image.height]).toEqual([3 * 360 + 4 * 12, 2 * 640 + 3 * 12]);
  });
});

describe('fingerprint', () => {
  it('is stable and changes with any input', () => {
    const base = {
      planKey: 'k',
      start: 0,
      end: 30,
      brand: { font: 'f', textColor: '#FFFFFF', accentColor: '#FF8A1F' },
      hw: false,
      sourceSize: 1,
      sourceMtimeMs: 2,
    };
    expect(fingerprint(base)).toBe(fingerprint({ ...base }));
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, end: 30.1 }));
  });
});
