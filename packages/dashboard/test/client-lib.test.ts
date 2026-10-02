import { describe, expect, it } from 'vitest';
import type { DashboardItem } from '../src/shared/types.js';
import {
  addDays,
  dayName,
  longDate,
  monthDay,
  startOfWeek,
  todayIn,
  weekDates,
  weekRange,
  weekday,
} from '../src/client/lib/dates.js';
import {
  absolutePath,
  clock,
  duration,
  itemLabel,
  platformSlotTime,
  stamp,
  time12,
} from '../src/client/lib/format.js';
import {
  inPostingOrder,
  countsFor,
  firstUnposted,
  initialWeek,
  nextUp,
  slotIndex,
  timePassed,
} from '../src/client/lib/selectors.js';

function item(
  id: number,
  date: string,
  slot: number,
  status: DashboardItem['platforms']['tiktok']['status'] = 'queued',
): DashboardItem {
  const entry = { time: '12:00', iso: `${date}T12:00:00-07:00`, status, note: '' };
  return {
    id,
    key: `demo#${id}`,
    project: 'demo',
    video: `videos/${id}.mp4`,
    thumb: `thumbs/${id}.jpg`,
    duration: 30,
    postTitle: `Post ${id}`,
    captions: { tiktok: '', instagram: '', youtube: '' },
    source: 'a.mp4',
    sourceStart: 0,
    sourceEnd: 30,
    note: '',
    date,
    slot,
    platforms: {
      tiktok: entry,
      instagram: { ...entry, status: 'queued' },
      youtube: { ...entry, status: 'queued' },
    },
  };
}

describe('dates', () => {
  it('does calendar math on plain dates', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(weekday('2026-10-01')).toBe(4);
    expect(startOfWeek('2026-10-01', 'monday')).toBe('2026-09-28');
    expect(startOfWeek('2026-10-01', 'sunday')).toBe('2026-09-27');
    expect(startOfWeek('2026-09-27', 'monday')).toBe('2026-09-21');
    expect(weekDates('2026-09-28')).toHaveLength(7);
  });

  it('formats names and ranges', () => {
    expect(dayName('2026-10-01')).toBe('Thu');
    expect(monthDay('2026-10-01')).toBe('Oct 1');
    expect(longDate('2026-10-02')).toBe('Friday, October 2');
    expect(weekRange('2026-09-28')).toBe('Sep 28 to Oct 4, 2026');
    expect(weekRange('2026-12-28')).toBe('Dec 28, 2026 to Jan 3, 2027');
  });

  it('knows today in the project time zone', () => {
    expect(todayIn('America/Los_Angeles', new Date('2026-10-02T03:00:00Z'))).toBe('2026-10-01');
    expect(todayIn('Asia/Tokyo', new Date('2026-10-02T03:00:00Z'))).toBe('2026-10-02');
  });
});

describe('format', () => {
  it('formats times and lengths', () => {
    expect(time12('00:05')).toBe('12:05 AM');
    expect(time12('12:15')).toBe('12:15 PM');
    expect(time12('20:00')).toBe('8:00 PM');
    expect(clock(3765)).toBe('1:02:45');
    expect(clock(47.9)).toBe('0:47');
    expect(duration(47.6)).toBe('0:48');
    expect(itemLabel(7)).toBe('#007');
    expect(stamp('2026-10-01T23:20:00Z', 'America/Los_Angeles')).toBe('Oct 1, 4:20 PM');
    expect(stamp('nope', 'UTC')).toBe('nope');
  });

  it('turns relative paths into absolute ones', () => {
    expect(
      absolutePath('videos/001.mp4', 'file:///Users/me/My%20Projects/demo/dashboard.html'),
    ).toBe('/Users/me/My Projects/demo/videos/001.mp4');
    expect(absolutePath('videos/001.mp4', 'file:///C:/work/demo/dashboard.html')).toBe(
      'C:/work/demo/videos/001.mp4',
    );
    expect(absolutePath('videos/001.mp4', 'http://localhost:8080/demo/dashboard.html')).toBe(
      'http://localhost:8080/demo/videos/001.mp4',
    );
  });

  it('staggers slot times per platform, wrapping at midnight', () => {
    expect(platformSlotTime('12:00', 15)).toBe('12:15');
    expect(platformSlotTime('23:50', 30)).toBe('00:20');
  });
});

describe('selectors', () => {
  const items = [
    item(2, '2026-10-02', 1, 'scheduled'),
    item(1, '2026-10-02', 0, 'posted'),
    item(3, '2026-10-09', 0),
  ];

  it('counts, sorts and indexes', () => {
    expect(countsFor(items, 'tiktok')).toEqual({
      queued: 1,
      scheduled: 1,
      posted: 1,
      failed: 0,
      total: 3,
    });
    expect(inPostingOrder(items).map((i) => i.id)).toEqual([1, 2, 3]);
    expect(
      slotIndex(items)
        .get('2026-10-02#1')
        ?.map((i) => i.id),
    ).toEqual([2]);
  });

  it('finds the first unposted and the next post', () => {
    expect(firstUnposted(items, 'tiktok')?.id).toBe(2);
    expect(nextUp(items, 'tiktok', new Date('2026-10-02T18:30:00Z'))?.id).toBe(2);
    expect(nextUp(items, 'tiktok', new Date('2026-10-02T19:30:00Z'))?.id).toBe(3);
    expect(nextUp(items, 'tiktok', new Date('2026-10-20T00:00:00Z'))).toBeUndefined();
    expect(timePassed(items[0]!, 'tiktok', new Date('2026-10-03T00:00:00Z'))).toBe(true);
    expect(timePassed(items[2]!, 'tiktok', new Date('2026-10-30T00:00:00Z'))).toBe(false);
  });

  it('opens on this week, the next item week, or the first item week', () => {
    expect(initialWeek(items, '2026-10-01', 'monday')).toBe('2026-09-28');
    expect(initialWeek(items, '2026-09-01', 'monday')).toBe('2026-09-28');
    expect(initialWeek(items, '2026-12-01', 'monday')).toBe('2026-09-28');
    expect(initialWeek([], '2026-12-02', 'monday')).toBe('2026-11-30');
  });
});
