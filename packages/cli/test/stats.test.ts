import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scheduleSchema, statsSchema } from '@content-machine/core';
import { demoStatsRows } from '../src/demo/stats.js';
import { runNew } from '../src/commands/new.js';
import { runSchedule } from '../src/commands/schedule.js';
import { runStats } from '../src/commands/stats.js';
import { context, fakeRender, tempRoot, writeMetadata } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

const TITLES = ['MrBeast $10 Million Puzzle', 'The Final Clue Nobody Solved', 'He Won It All'];

async function scheduledProject(): Promise<ReturnType<typeof context>> {
  const made = context(root, undefined, true);
  await runNew(made.ctx, 'clips', { timezone: 'America/Los_Angeles' });
  await fakeRender(root, 'clips', 3);
  await writeMetadata(root, 'clips', 3, (id) => TITLES[id - 1] ?? '');
  await runSchedule(made.ctx, 'clips', {});
  return made;
}

const statsFile = (): string => join(root, 'projects', 'clips', 'plan', 'stats.json');

describe('stats', () => {
  it('records one reading by title and shows it on both dashboards', async () => {
    const { ctx } = await scheduledProject();
    const outcomes = await runStats(ctx, 'clips', {
      platform: 'tiktok',
      title: 'The Final Clue Nobody Solved',
      views: 1200,
      likes: 90,
    });
    expect(outcomes).toEqual([{ row: 1, kind: 'recorded', platform: 'tiktok', itemId: 2 }]);
    const stats = statsSchema.parse(JSON.parse(await readFile(statsFile(), 'utf8')));
    expect(stats.snapshots[0]).toMatchObject({ itemId: 2, views: 1200, likes: 90, comments: 0 });
    const live = await readFile(join(root, 'projects', 'dashboard-data.js'), 'utf8');
    expect(live).toContain('"views":1200');
    expect(live).toContain('"rates":{"tiktok":0.4');
  });

  it('imports many rows and reports the ones it could not place', async () => {
    await scheduledProject();
    const { ctx, capture } = context(root, undefined, true);
    const file = join(root, 'readings.json');
    await writeFile(
      file,
      JSON.stringify([
        { platform: 'youtube', title: 'mrbeast $10 million puzzle', views: 500 },
        { platform: 'instagram', item: 3, views: 80, shares: 4 },
        { platform: 'tiktok', title: 'Cooking pasta at home tonight', views: 9 },
      ]),
    );
    const outcomes = await runStats(ctx, 'clips', { import: file });
    expect(outcomes.map((o) => o.kind)).toEqual(['recorded', 'recorded', 'unmatched']);
    const summary = JSON.parse(capture.stdout) as {
      data: { totals: { platform: string; views: number; income: number }[] };
    };
    const all = summary.data.totals.find((t) => t.platform === 'all');
    expect(all?.views).toBe(580);
    expect(all?.income).toBeCloseTo(0.5 * 0.07 + 0.08 * 0.01, 10);
  });

  it('prints totals without recording, and explains bad input', async () => {
    const { ctx } = await scheduledProject();
    expect(await runStats(ctx, 'clips', {})).toEqual([]);
    await expect(runStats(ctx, 'clips', { platform: 'tiktok' })).rejects.toMatchObject({
      code: 'E_USAGE',
    });
    const fresh = context(root);
    await runNew(fresh.ctx, 'empty', {});
    await expect(
      runStats(fresh.ctx, 'empty', { platform: 'tiktok', views: 1, title: 'x' }),
    ).rejects.toMatchObject({ code: 'E_FILE_NOT_FOUND' });
  });
});

describe('demo stats', () => {
  it('makes growing readings only for posted videos', async () => {
    const { ctx } = await scheduledProject();
    const path = join(root, 'projects', 'clips', 'plan', 'schedule.json');
    const schedule = scheduleSchema.parse(JSON.parse(await readFile(path, 'utf8')));
    expect(demoStatsRows(schedule, ctx.clock.now())).toEqual([]);
    const first = schedule.items[0];
    if (first === undefined) throw new Error('no items');
    first.platforms.tiktok.status = 'posted';
    const later = new Date(Date.parse(first.platforms.tiktok.iso) + 3 * 86_400_000);
    const rows = demoStatsRows(schedule, later);
    expect(rows.every((row) => row.platform === 'tiktok' && row.item === first.id)).toBe(true);
    const views = rows.map((row) => row.views);
    expect(views).toEqual([...views].sort((a, b) => a - b));
    expect(demoStatsRows(schedule, later)).toEqual(rows);
  });
});
