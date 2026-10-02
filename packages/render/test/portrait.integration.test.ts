import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { fixedClock, type Plan } from '@content-machine/core';
import {
  NodeFileSystem,
  NodeProcessRunner,
  generateSyntheticSource,
  probeMedia,
  projectDirs,
  renderProject,
  type RenderOptions,
} from '@content-machine/render';
import { hasFfmpeg } from './helpers.js';

const fs = new NodeFileSystem();
const runner = new NodeProcessRunner();
const deps = { fs, runner, clock: fixedClock('2026-10-01T12:00:00Z'), log: () => undefined };
const brand = { font: 'Poppins ExtraBold', textColor: '#FFFFFF', accentColor: '#FF8A1F' };
const options: RenderOptions = {
  only: undefined,
  force: false,
  dryRun: false,
  hw: false,
  concurrency: 1,
  snapWindow: 2,
  preset: 'ultrafast',
};

describe.skipIf(!hasFfmpeg)('portrait clip with no audio', () => {
  let dir = '';

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('covers the canvas and still gets an audio track', async () => {
    dir = await mkdtemp(join(tmpdir(), 'cm-portrait-'));
    const dirs = projectDirs(dir);
    await fs.mkdirp(dirs.sourceDir);
    await generateSyntheticSource(runner, join(dirs.sourceDir, 'tall.mp4'), {
      duration: 14,
      width: 720,
      height: 1280,
      fps: 24,
      colors: ['7C3AED', 'EC4899'],
      pauses: [],
      pauseLength: 0,
      toneHz: 300,
      audio: false,
    });
    const plan: Plan = {
      schemaVersion: 1,
      mode: 'clip',
      accentColor: '#FF8A1F',
      sources: [{ file: 'tall.mp4', channel: 'Example Channel', platform: 'twitch' }],
      items: [
        {
          id: 1,
          source: 'tall.mp4',
          start: 2,
          end: 11,
          title: 'He Missed By One Inch',
          accent: 'One Inch',
        },
      ],
    };
    const result = await renderProject(deps, {
      plan,
      dirs,
      brand,
      options,
      previousLog: undefined,
    });
    expect(result.items[0]?.status).toBe('rendered');
    expect(result.warnings.some((w) => w.includes('no audio'))).toBe(true);
    const info = await probeMedia(runner, join(dir, 'videos', '001.mp4'));
    expect(info).toMatchObject({ width: 1080, height: 1920, audioCodec: 'aac', audioStreams: 1 });
    expect(info.duration).toBeCloseTo(9, 0);
  });
});
