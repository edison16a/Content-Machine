import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixedClock, type Plan, type RenderLog } from '@content-machine/core';
import {
  NodeFileSystem,
  NodeProcessRunner,
  checkProject,
  generateSyntheticSource,
  pausesEvery,
  previewItem,
  probeMedia,
  projectDirs,
  renderProject,
  type RenderOptions,
} from '@content-machine/render';
import { decodeAudio, hasFfmpeg, rmsDb } from './helpers.js';

const fs = new NodeFileSystem();
const runner = new NodeProcessRunner();
const deps = { fs, runner, clock: fixedClock('2026-10-01T12:00:00Z'), log: () => undefined };
const brand = { font: 'Poppins ExtraBold', textColor: '#FFFFFF', accentColor: '#FF8A1F' };
const options: RenderOptions = {
  only: undefined,
  force: false,
  dryRun: false,
  hw: false,
  concurrency: 2,
  snapWindow: 2,
  preset: 'ultrafast',
};

let root = '';

function sequentialPlan(firstEnd = 13): Plan {
  return {
    schemaVersion: 1,
    mode: 'sequential',
    accentColor: '#FF8A1F',
    sources: [
      {
        file: 'long.mp4',
        channel: 'Example Channel',
        platform: 'youtube',
        title: 'How We Built A Tiny House In 30 Days',
        accent: '30 Days',
      },
    ],
    items: [
      { id: 1, source: 'long.mp4', start: 0, end: firstEnd },
      { id: 2, source: 'long.mp4', start: firstEnd, end: 26 },
    ],
  };
}

describe.skipIf(!hasFfmpeg)('render pipeline on synthetic video', () => {
  const dirs = () => projectDirs(join(root, 'seq'));
  let log: RenderLog | undefined;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'cm-render-'));
    await fs.mkdirp(dirs().sourceDir);
    await generateSyntheticSource(runner, join(dirs().sourceDir, 'long.mp4'), {
      duration: 26,
      width: 1280,
      height: 720,
      fps: 30,
      colors: ['1E3A8A', 'F59E0B'],
      pauses: pausesEvery(26, 5),
      pauseLength: 0.6,
      toneHz: 220,
    });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('renders a dry run without writing anything', async () => {
    const result = await renderProject(deps, {
      plan: sequentialPlan(),
      dirs: dirs(),
      brand,
      options: { ...options, dryRun: true },
      previousLog: undefined,
    });
    expect(result.items.map((i) => i.status)).toEqual(['planned', 'planned']);
    expect(await fs.exists(join(dirs().workDir, 'render-log.json'))).toBe(false);
  });

  it('renders snapped, contiguous parts that pass check', async () => {
    const result = await renderProject(deps, {
      plan: sequentialPlan(),
      dirs: dirs(),
      brand,
      options,
      previousLog: undefined,
    });
    expect(result.items.map((i) => i.status)).toEqual(['rendered', 'rendered']);
    log = result.log;
    const [first, second] = result.log.items;
    expect(first?.end).toBe(second?.start);
    expect(first?.endSnapped).toBe(true);
    const report = await checkProject(deps, {
      mode: 'sequential',
      log: result.log,
      root: dirs().root,
      workDir: dirs().workDir,
      sourceDurations: { 'long.mp4': 26 },
    });
    expect(report.problems).toEqual([]);
    expect(report.sheets).toEqual(['work/qa/sheet_01.jpg']);
    expect(await fs.exists(join(dirs().workDir, 'qa', 'frames', '002_mid.jpg'))).toBe(true);
    const info = await probeMedia(runner, join(dirs().root, 'videos', '001.mp4'));
    expect(info).toMatchObject({
      width: 1080,
      height: 1920,
      videoCodec: 'h264',
      audioCodec: 'aac',
      sampleRate: 48000,
      audioStreams: 1,
    });
  });

  it('keeps the original audio level (no filters were applied)', () => {
    const entry = log?.items[0];
    expect(entry).toBeDefined();
    const duration = (entry?.end ?? 0) - (entry?.start ?? 0) - 1;
    const source = decodeAudio(
      join(dirs().sourceDir, 'long.mp4'),
      (entry?.start ?? 0) + 0.5,
      duration,
    );
    const output = decodeAudio(join(dirs().root, 'videos', '001.mp4'), 0.5, duration);
    expect(output.length).toBeGreaterThan(48000 * 5);
    expect(Math.abs(rmsDb(output) - rmsDb(source))).toBeLessThan(0.5);
  });

  it('skips up-to-date items and refuses edits to rendered ones', async () => {
    const again = await renderProject(deps, {
      plan: sequentialPlan(),
      dirs: dirs(),
      brand,
      options,
      previousLog: log,
    });
    expect(again.items.map((i) => i.status)).toEqual(['skipped', 'skipped']);
    await expect(
      renderProject(deps, {
        plan: sequentialPlan(14),
        dirs: dirs(),
        brand,
        options,
        previousLog: log,
      }),
    ).rejects.toMatchObject({ code: 'E_PLAN_LOCKED' });
    const forced = await renderProject(deps, {
      plan: sequentialPlan(14),
      dirs: dirs(),
      brand,
      options: { ...options, force: true, only: [1] },
      previousLog: log,
    });
    expect(forced.items.map((i) => [i.id, i.status])).toEqual([[1, 'rendered']]);
    expect(forced.log.items).toHaveLength(2);
  });

  it('previews one frame without encoding video', async () => {
    const path = await previewItem(deps, {
      plan: sequentialPlan(),
      itemId: 2,
      at: 2,
      dirs: dirs(),
      brand,
    });
    const info = await probeMedia(runner, path);
    expect([info.width, info.height]).toEqual([1080, 1920]);
    await expect(
      previewItem(deps, { plan: sequentialPlan(), itemId: 9, at: 2, dirs: dirs(), brand }),
    ).rejects.toMatchObject({ code: 'E_ITEM_NOT_FOUND' });
  });
});
