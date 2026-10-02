import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { statsSchema } from '@content-machine/core';
import { runNew } from '../src/commands/new.js';
import { runSchedule } from '../src/commands/schedule.js';
import { runStats } from '../src/commands/stats.js';
import { runTestData } from '../src/commands/testdata.js';
import { run } from '../src/program.js';
import { context, fakeRender, tempRoot, writeMetadata } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

const plan = (file: string): string => join(root, 'projects', 'clips', 'plan', file);
const live = (): Promise<string> => readFile(join(root, 'projects', 'dashboard-data.js'), 'utf8');

describe('testdata', () => {
  it('switches made-up stats on and off without touching real ones', async () => {
    const { ctx, capture } = context(root);
    await runNew(ctx, 'clips', {});
    await expect(
      runTestData(ctx, 'clips', 'on', { income: 30000, days: 30 }),
    ).rejects.toMatchObject({ code: 'E_FILE_NOT_FOUND' });

    await fakeRender(root, 'clips', 3);
    await writeMetadata(root, 'clips', 3);
    await runSchedule(ctx, 'clips', {});
    await runStats(ctx, 'clips', { platform: 'tiktok', item: 1, views: 100 });
    const real = await readFile(plan('stats.json'), 'utf8');

    await runTestData(ctx, 'clips', 'on', { income: 30000, days: 30 });
    const sample = statsSchema.parse(JSON.parse(await readFile(plan('sample-stats.json'), 'utf8')));
    expect(sample.snapshots.length).toBeGreaterThan(30);
    expect(await live()).toContain('"sample":true');
    expect(capture.stdout).toContain('Test data is on for clips');
    expect(capture.stdout).toContain('$30,000.');

    await runTestData(ctx, 'clips', 'off', { income: 30000, days: 30 });
    expect(await live()).toContain('"sample":false');
    expect(await readFile(plan('stats.json'), 'utf8')).toBe(real);
    await expect(readFile(plan('sample-stats.json'), 'utf8')).rejects.toThrow();
    await runTestData(ctx, 'clips', 'off', { income: 30000, days: 30 });
    expect(capture.stdout).toContain('clips had no test data.');
  });

  it('reads amounts like 30k and refuses bad ones', async () => {
    const quiet = ['--root', root, '--quiet'];
    await run([...quiet, 'new', 'clips']);
    expect(await run([...quiet, 'testdata', 'clips', 'maybe'])).toBe(2);
    expect(await run([...quiet, 'testdata', 'clips', 'on', '--income', 'lots'])).toBe(2);
    expect(await run([...quiet, 'testdata', 'clips', 'off'])).toBe(0);
  });
});
