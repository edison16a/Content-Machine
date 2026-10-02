import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LIVE_DATA_GLOBAL, type LiveData } from '@content-machine/dashboard';
import { runOpen } from '../src/commands/dashboard.js';
import { runNew } from '../src/commands/new.js';
import { context, tempRoot } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

/** Runs the data file the way the browser would and returns what it assigned. */
async function readLive(): Promise<LiveData> {
  const text = await readFile(join(root, 'projects', 'dashboard-data.js'), 'utf8');
  const prefix = `window.${LIVE_DATA_GLOBAL} = `;
  expect(text.startsWith(prefix)).toBe(true);
  return JSON.parse(text.slice(prefix.length).trim().replace(/;$/, '')) as LiveData;
}

describe('live index data', () => {
  it('lists every project, and grows as projects are added', async () => {
    const { ctx } = context(root);
    await runNew(ctx, 'bees', { channel: 'Bee TV' });
    expect((await readLive()).projects.map((p) => p.project)).toEqual(['bees']);
    await runNew(ctx, 'ants', {});
    const live = await readLive();
    expect(live.projects.map((p) => p.project)).toEqual(['ants', 'bees']);
    expect(live.projects[1]?.channel).toBe('Bee TV');
    expect(live.build).toMatch(/^[0-9a-f]{12}$/);
  });

  it('skips a broken project with a warning instead of failing', async () => {
    const { ctx, capture } = context(root);
    await runNew(ctx, 'bees', {});
    await runNew(ctx, 'ants', {});
    await writeFile(join(root, 'projects', 'ants', 'project.json'), '{ broken');
    await runOpen(ctx, 'bees', () => Promise.resolve(true));
    expect((await readLive()).projects.map((p) => p.project)).toEqual(['bees']);
    expect(capture.stderr).toContain('Left ants off the live dashboard');
  });

  it('opens index.html at the root, with or without a project', async () => {
    const { ctx, capture } = context(root);
    const opened: string[] = [];
    const opener = (path: string): Promise<boolean> => {
      opened.push(path);
      return Promise.resolve(true);
    };
    await runOpen(ctx, undefined, opener);
    expect((await readLive()).projects).toEqual([]);
    await runNew(ctx, 'bees', {});
    await runOpen(ctx, 'bees', opener);
    expect(opened).toEqual([join(root, 'index.html'), join(root, 'index.html')]);
    expect(capture.stdout).toContain(`Opened file://${join(root, 'index.html')}`);
  });
});
