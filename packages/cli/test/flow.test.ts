import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scheduleSchema } from '@content-machine/core';
import { runMark } from '../src/commands/mark.js';
import { runNew } from '../src/commands/new.js';
import { runSchedule } from '../src/commands/schedule.js';
import { runStatus } from '../src/commands/status.js';
import { context, tempRoot } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

/** Fakes a finished render: plan, render log and placeholder output files. */
async function fakeRender(name: string, count: number): Promise<void> {
  const dir = join(root, 'projects', name);
  const items = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    source: 'v.mp4',
    start: i * 30,
    end: (i + 1) * 30,
  }));
  await writeFile(
    join(dir, 'plan', 'plan.json'),
    JSON.stringify({
      schemaVersion: 1,
      mode: 'sequential',
      sources: [
        {
          file: 'v.mp4',
          channel: 'Example Channel',
          platform: 'youtube',
          title: 'A Test Video',
          accent: 'Test',
        },
      ],
      items: items.map((i) => ({ ...i, note: `part ${i.id}` })),
    }),
  );
  await mkdir(join(dir, 'work'), { recursive: true });
  const log = items.map((i) => {
    const base = String(i.id).padStart(3, '0');
    return {
      ...i,
      plannedStart: i.start,
      plannedEnd: i.end,
      startSnapped: true,
      endSnapped: true,
      planKey: 'k',
      fingerprint: 'f',
      output: `videos/${base}.mp4`,
      thumb: `thumbs/${base}.jpg`,
      renderedAt: 'x',
    };
  });
  await writeFile(
    join(dir, 'work', 'render-log.json'),
    JSON.stringify({ schemaVersion: 1, items: log }),
  );
  for (const entry of log) {
    await writeFile(join(dir, entry.output), 'video');
    await writeFile(join(dir, entry.thumb), 'thumb');
  }
}

async function writeMetadata(name: string, count: number): Promise<void> {
  const items = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    postTitle: `Post ${i + 1}`,
    captions: { tiktok: 't', instagram: 'i', youtube: 'y' },
  }));
  await writeFile(
    join(root, 'projects', name, 'plan', 'metadata.json'),
    JSON.stringify({ schemaVersion: 1, items }),
  );
}

describe('project lifecycle', () => {
  it('creates, schedules, marks and reports', async () => {
    const { ctx, capture } = context(root);
    await runNew(ctx, 'bees', { channel: 'Example Channel', timezone: 'America/Los_Angeles' });
    expect(capture.stdout).toContain('Created projects/bees');
    await expect(runNew(ctx, 'bees', {})).rejects.toMatchObject({ code: 'E_PROJECT_EXISTS' });
    expect(await readFile(join(root, 'projects', 'bees', 'README.txt'), 'utf8')).toContain(
      'INPUTS',
    );
    expect(await readFile(join(root, 'projects', 'bees', 'dashboard.html'), 'utf8')).toContain(
      '"project":"bees"',
    );

    await fakeRender('bees', 4);
    await expect(runSchedule(ctx, 'bees', {})).rejects.toMatchObject({
      code: 'E_METADATA_MISSING',
      exitCode: 3,
    });
    await writeMetadata('bees', 4);
    const first = await runSchedule(ctx, 'bees', {});
    expect(first.added.map((a) => [a.id, a.date, a.slot])).toEqual([
      [1, '2026-10-02', 0],
      [2, '2026-10-02', 1],
      [3, '2026-10-02', 2],
      [4, '2026-10-03', 0],
    ]);
    const again = await runSchedule(ctx, 'bees', {});
    expect(again.added).toEqual([]);
    const saved = scheduleSchema.parse(
      JSON.parse(await readFile(join(root, 'projects', 'bees', 'plan', 'schedule.json'), 'utf8')),
    );
    expect(saved.items[0]?.platforms.instagram).toMatchObject({
      time: '12:15',
      iso: '2026-10-02T12:15:00-07:00',
    });
    expect(saved.items[0]?.note).toBe('part 1');

    const changes = await runMark(ctx, 'bees', {
      item: '1-2',
      platform: ['tiktok', 'youtube'],
      status: 'scheduled',
      note: 'in studio',
    });
    expect(changes).toHaveLength(4);
    await expect(
      runMark(ctx, 'bees', { item: '3', platform: ['tiktok'], status: 'posted' }),
    ).rejects.toMatchObject({ code: 'E_STATUS_TRANSITION' });
    const history = await readFile(
      join(root, 'projects', 'bees', 'plan', 'schedule-history.log'),
      'utf8',
    );
    expect(history.trim().split('\n')).toHaveLength(4);
    expect(
      await runMark(ctx, 'bees', { item: 'all', platform: ['tiktok'], status: 'failed' }),
    ).toHaveLength(4);

    const summary = await runStatus(ctx, 'bees');
    expect(summary.bees?.perPlatform.tiktok.failed).toBe(4);
    expect(summary.bees?.perPlatform.youtube.scheduled).toBe(2);
    const all = await runStatus(ctx, undefined);
    expect(Object.keys(all)).toEqual(['bees']);
  });

  it('keeps two projects on one account out of each other’s slots', async () => {
    const { ctx } = context(root);
    for (const name of ['alpha', 'beta']) {
      await runNew(ctx, name, { timezone: 'America/Los_Angeles' });
      await fakeRender(name, 2);
      await writeMetadata(name, 2);
    }
    await runSchedule(ctx, 'alpha', {});
    const beta = await runSchedule(ctx, 'beta', {});
    expect(beta.added.map((a) => `${a.date}#${a.slot}`)).toEqual(['2026-10-02#2', '2026-10-03#0']);
    const ledger = JSON.parse(await readFile(join(root, 'schedule-ledger.json'), 'utf8')) as {
      entries: unknown[];
    };
    expect(ledger.entries).toHaveLength(4);
  });

  it('rebuilds only items still queued everywhere', async () => {
    const { ctx } = context(root);
    await runNew(ctx, 'bees', { timezone: 'America/Los_Angeles' });
    await fakeRender('bees', 3);
    await writeMetadata('bees', 3);
    await runSchedule(ctx, 'bees', {});
    await runMark(ctx, 'bees', { item: '2', platform: ['youtube'], status: 'scheduled' });
    const later = context(root, '2026-10-10T19:00:00Z').ctx;
    const rebuilt = await runSchedule(later, 'bees', { rebuild: true });
    expect(rebuilt.added.map((a) => [a.id, a.date])).toEqual([
      [1, '2026-10-11'],
      [3, '2026-10-11'],
    ]);
    expect(rebuilt.warnings[0]).toMatch(/Item 2 keeps/);
  });
});
