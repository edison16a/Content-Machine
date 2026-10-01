import { describe, expect, it } from 'vitest';
import {
  applyStatus,
  buildSchedule,
  canTransition,
  formatHistoryLine,
  summarizeSchedule,
  totalCounts,
  type Schedule,
} from '@content-machine/core';
import { items, project } from './schedule-fixtures.js';

function makeSchedule(): Schedule {
  return buildSchedule({
    project: project(),
    items: items(3),
    assignments: [
      { id: 1, date: '2026-10-02', slot: 0 },
      { id: 2, date: '2026-10-02', slot: 1 },
      { id: 3, date: '2026-10-03', slot: 0 },
    ],
    previous: undefined,
    updatedAt: 'x',
  });
}

describe('status machine', () => {
  it('allows only the documented transitions', () => {
    expect(canTransition('queued', 'scheduled')).toBe(true);
    expect(canTransition('scheduled', 'posted')).toBe(true);
    expect(canTransition('posted', 'failed')).toBe(true);
    expect(canTransition('failed', 'queued')).toBe(true);
    expect(canTransition('queued', 'posted')).toBe(false);
    expect(canTransition('posted', 'queued')).toBe(false);
    expect(canTransition('failed', 'scheduled')).toBe(false);
  });

  it('applies changes to many items and records each one', () => {
    const { schedule, changes } = applyStatus(makeSchedule(), {
      itemIds: [1, 2],
      platforms: ['tiktok', 'youtube'],
      status: 'scheduled',
      note: 'in studio',
      at: '2026-10-01T20:00:00Z',
    });
    expect(changes).toHaveLength(4);
    expect(schedule.items[0]?.platforms.tiktok).toMatchObject({
      status: 'scheduled',
      note: 'in studio',
    });
    expect(schedule.items[0]?.platforms.instagram.status).toBe('queued');
    expect(formatHistoryLine(changes[0]!)).toBe(
      '2026-10-01T20:00:00Z\titem=1\tplatform=tiktok\tfrom=queued\tto=scheduled\tnote=in studio',
    );
  });

  it('is all or nothing and treats repeats as no-ops', () => {
    const start = makeSchedule();
    const once = applyStatus(start, {
      itemIds: [1],
      platforms: ['tiktok'],
      status: 'scheduled',
      note: '',
      at: 'x',
    });
    const again = applyStatus(once.schedule, {
      itemIds: [1],
      platforms: ['tiktok'],
      status: 'scheduled',
      note: '',
      at: 'x',
    });
    expect(again.changes).toEqual([]);
    expect(() =>
      applyStatus(once.schedule, {
        itemIds: [1, 2],
        platforms: ['tiktok'],
        status: 'posted',
        note: '',
        at: 'x',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'E_STATUS_TRANSITION',
        issues: [expect.objectContaining({ itemId: 2 })],
      }),
    );
    expect(once.schedule.items[0]?.platforms.tiktok.status).toBe('scheduled');
    expect(() =>
      applyStatus(start, {
        itemIds: [9],
        platforms: ['tiktok'],
        status: 'failed',
        note: '',
        at: 'x',
      }),
    ).toThrow(expect.objectContaining({ code: 'E_ITEM_NOT_FOUND' }));
  });
});

describe('summarizeSchedule', () => {
  it('counts statuses and lists upcoming posts in time order', () => {
    const marked = applyStatus(makeSchedule(), {
      itemIds: [1],
      platforms: ['tiktok'],
      status: 'scheduled',
      note: '',
      at: 'x',
    });
    const summary = summarizeSchedule(marked.schedule, new Date('2026-10-02T19:10:00Z'), 1);
    expect(summary.total).toBe(3);
    expect(summary.perPlatform.tiktok).toEqual({ queued: 2, scheduled: 1, posted: 0, failed: 0 });
    expect(summary.firstDate).toBe('2026-10-02');
    expect(summary.lastDate).toBe('2026-10-03');
    expect(summary.next.map((n) => `${n.itemId}:${n.platform}`)).toEqual([
      '1:instagram',
      '1:youtube',
      '2:tiktok',
    ]);
    expect(totalCounts(summary)).toEqual({ queued: 8, scheduled: 1, posted: 0, failed: 0 });
  });
});
