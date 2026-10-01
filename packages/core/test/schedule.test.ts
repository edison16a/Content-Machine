import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMinutesToTime,
  assignSlots,
  assignmentsOf,
  buildSchedule,
  isoWithOffset,
  localDateAt,
  splitForRebuild,
  zonedInstant,
  type Assignment,
  type LedgerEntry,
  type Schedule,
} from '@content-machine/core';
import { items, project } from './schedule-fixtures.js';

const NOW = new Date('2026-10-01T19:00:00Z'); // noon on Oct 1 in Los Angeles
const config = {
  project: 'bees',
  account: 'default',
  timezone: 'America/Los_Angeles',
  slotsPerDay: 3,
};

function schedule(
  ids: number[],
  existing: Assignment[] = [],
  ledger: LedgerEntry[] = [],
  now = NOW,
) {
  return assignSlots({ itemIds: ids, existing, ledger, config, now });
}

describe('time helpers', () => {
  it('handles calendar math and minute rollover', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMinutesToTime('20:00', 30)).toEqual({ time: '20:30', dayOffset: 0 });
    expect(addMinutesToTime('23:50', 30)).toEqual({ time: '00:20', dayOffset: 1 });
    expect(localDateAt(new Date('2026-10-02T06:30:00Z'), 'America/Los_Angeles')).toBe('2026-10-01');
  });

  it.each([
    ['2026-10-31', '12:00', '2026-10-31T12:00:00-07:00'],
    ['2026-11-01', '12:00', '2026-11-01T12:00:00-08:00'],
    ['2027-03-13', '12:00', '2027-03-13T12:00:00-08:00'],
    ['2027-03-14', '12:00', '2027-03-14T12:00:00-07:00'],
    ['2026-11-01', '01:30', '2026-11-01T01:30:00-07:00'],
  ])('keeps wall-clock %s %s across DST', (date, time, iso) => {
    const zone = 'America/Los_Angeles';
    expect(isoWithOffset(zonedInstant(date, time, zone), zone)).toBe(iso);
  });

  it('moves a time inside the spring-forward gap past the gap', () => {
    const zone = 'America/New_York';
    expect(isoWithOffset(zonedInstant('2027-03-14', '02:30', zone), zone)).toBe(
      '2027-03-14T03:30:00-04:00',
    );
  });
});

describe('assignSlots', () => {
  it('starts at tomorrow first slot, three a day, ascending ids', () => {
    const result = schedule([3, 1, 2, 4]);
    expect(result.assignments).toEqual([
      { id: 1, date: '2026-10-02', slot: 0 },
      { id: 2, date: '2026-10-02', slot: 1 },
      { id: 3, date: '2026-10-02', slot: 2 },
      { id: 4, date: '2026-10-03', slot: 0 },
    ]);
  });

  it('queues a 30 video backlog across 10 days and weeks', () => {
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    const result = schedule(ids);
    const dates = new Set(result.assignments.map((a) => a.date));
    expect(dates.size).toBe(10);
    expect(result.assignments.at(-1)).toEqual({ id: 30, date: '2026-10-11', slot: 2 });
  });

  it('is idempotent: assigned items never move', () => {
    const first = schedule([1, 2]);
    const again = schedule(
      [1, 2, 3],
      first.assignments,
      first.ledger,
      new Date('2026-10-20T00:00:00Z'),
    );
    expect(again.assignments.slice(0, 2)).toEqual(first.assignments);
    expect(again.added).toEqual([{ id: 3, date: '2026-10-20', slot: 0 }]);
    const same = schedule([1, 2], first.assignments, first.ledger);
    expect(same.added).toEqual([]);
    expect(same.ledger).toEqual(first.ledger);
  });

  it('continues after the project last slot when that is later than tomorrow', () => {
    const existing = [{ id: 1, date: '2026-10-05', slot: 2 }];
    expect(schedule([1, 2], existing).added).toEqual([{ id: 2, date: '2026-10-06', slot: 0 }]);
  });

  it('skips slots another project holds on the same account', () => {
    const ledger: LedgerEntry[] = [
      { account: 'default', date: '2026-10-02', slot: 0, project: 'other', itemId: 1 },
      { account: 'default', date: '2026-10-02', slot: 2, project: 'other', itemId: 2 },
      { account: 'second', date: '2026-10-02', slot: 1, project: 'third', itemId: 1 },
    ];
    const result = schedule([1, 2], [], ledger);
    expect(result.assignments).toEqual([
      { id: 1, date: '2026-10-02', slot: 1 },
      { id: 2, date: '2026-10-03', slot: 0 },
    ]);
    expect(result.ledger.filter((e) => e.project === 'other')).toHaveLength(2);
    expect(result.ledger.filter((e) => e.project === 'bees')).toHaveLength(2);
  });

  it('two projects on one account never share a slot', () => {
    const a = assignSlots({ itemIds: [1, 2, 3, 4], existing: [], ledger: [], config, now: NOW });
    const b = assignSlots({
      itemIds: [1, 2],
      existing: [],
      ledger: a.ledger,
      config: { ...config, project: 'wasps' },
      now: NOW,
    });
    const keys = b.ledger.map((e) => `${e.date}#${e.slot}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(b.added[0]).toEqual({ id: 1, date: '2026-10-03', slot: 1 });
  });
});

describe('buildSchedule', () => {
  it('applies stagger per platform and keeps statuses from the previous run', () => {
    const p = project();
    const assignments = schedule([1, 2]).assignments;
    const built = buildSchedule({
      project: p,
      items: items(2),
      assignments,
      previous: undefined,
      updatedAt: 'now',
    });
    expect(built.items[0]?.platforms).toEqual({
      tiktok: { time: '12:00', iso: '2026-10-02T12:00:00-07:00', status: 'queued', note: '' },
      instagram: { time: '12:15', iso: '2026-10-02T12:15:00-07:00', status: 'queued', note: '' },
      youtube: { time: '12:30', iso: '2026-10-02T12:30:00-07:00', status: 'queued', note: '' },
    });
    built.items[0]!.platforms.tiktok.status = 'posted';
    built.items[0]!.platforms.tiktok.note = 'live';
    const rebuilt = buildSchedule({
      project: p,
      items: items(3),
      assignments,
      previous: built,
      updatedAt: 'later',
    });
    expect(rebuilt.items).toHaveLength(2);
    expect(rebuilt.items[0]?.platforms.tiktok).toMatchObject({ status: 'posted', note: 'live' });
    expect(assignmentsOf(rebuilt)).toEqual(assignments);
    expect(assignmentsOf(undefined)).toEqual([]);
  });

  it('rolls a late staggered time into the next day', () => {
    const p = project({ slots: ['23:45'], stagger: { tiktok: 0, instagram: 15, youtube: 30 } });
    const built = buildSchedule({
      project: p,
      items: items(1),
      assignments: [{ id: 1, date: '2026-10-02', slot: 0 }],
      previous: undefined,
      updatedAt: 'x',
    });
    expect(built.items[0]?.platforms.youtube).toMatchObject({
      time: '00:15',
      iso: '2026-10-03T00:15:00-07:00',
    });
  });
});

describe('splitForRebuild', () => {
  it('releases only items queued everywhere and warns about the rest', () => {
    const p = project();
    const built: Schedule = buildSchedule({
      project: p,
      items: items(3),
      assignments: schedule([1, 2, 3]).assignments,
      previous: undefined,
      updatedAt: 'x',
    });
    built.items[1]!.platforms.youtube.status = 'scheduled';
    const split = splitForRebuild(built);
    expect(split.released).toEqual([1, 3]);
    expect(split.kept).toEqual([{ id: 2, date: '2026-10-02', slot: 1 }]);
    expect(split.warnings[0]).toMatch(/Item 2 keeps 2026-10-02 slot 2/);
  });
});
