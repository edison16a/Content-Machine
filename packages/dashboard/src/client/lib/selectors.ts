import type { DashboardItem, DashboardPlatform, DashboardStatus } from '../../shared/types.js';
import { DASHBOARD_STATUSES } from '../../shared/types.js';
import { startOfWeek } from './dates.js';

export type Counts = Record<DashboardStatus, number> & { total: number };

/** Status counts for one platform. */
export function countsFor(items: readonly DashboardItem[], platform: DashboardPlatform): Counts {
  const counts = Object.fromEntries(DASHBOARD_STATUSES.map((s) => [s, 0])) as Record<
    DashboardStatus,
    number
  >;
  for (const item of items) counts[item.platforms[platform].status] += 1;
  return { ...counts, total: items.length };
}

/** Items in posting order. */
export function byId(items: readonly DashboardItem[]): DashboardItem[] {
  return [...items].sort((a, b) => a.id - b.id);
}

/** Lookup from "date#slot" to the item posted there. */
export function slotIndex(items: readonly DashboardItem[]): Map<string, DashboardItem> {
  return new Map(items.map((item) => [`${item.date}#${item.slot}`, item]));
}

export function firstUnposted(
  items: readonly DashboardItem[],
  platform: DashboardPlatform,
): DashboardItem | undefined {
  return byId(items).find((item) => item.platforms[platform].status !== 'posted');
}

/** The next post on this platform that has not happened yet. */
export function nextUp(
  items: readonly DashboardItem[],
  platform: DashboardPlatform,
  now: Date,
): DashboardItem | undefined {
  return items
    .filter((item) => {
      const entry = item.platforms[platform];
      return (
        (entry.status === 'queued' || entry.status === 'scheduled') &&
        Date.parse(entry.iso) >= now.getTime()
      );
    })
    .sort(
      (a, b) => Date.parse(a.platforms[platform].iso) - Date.parse(b.platforms[platform].iso),
    )[0];
}

/** A post marked scheduled whose time is behind us: worth checking if it went live. */
export function timePassed(item: DashboardItem, platform: DashboardPlatform, now: Date): boolean {
  const entry = item.platforms[platform];
  return entry.status === 'scheduled' && Date.parse(entry.iso) < now.getTime();
}

/** The item before or after this one in posting order. */
export function neighbor(
  items: readonly DashboardItem[],
  id: number,
  step: 1 | -1,
): DashboardItem | undefined {
  const sorted = byId(items);
  const index = sorted.findIndex((item) => item.id === id);
  return index < 0 ? undefined : sorted[index + step];
}

/**
 * Which week to show first: this week if anything is in it, otherwise the
 * week of the next item, otherwise the week of the first item.
 */
export function initialWeek(
  items: readonly DashboardItem[],
  today: string,
  weekStartsOn: 'monday' | 'sunday',
): string {
  const thisWeek = startOfWeek(today, weekStartsOn);
  const dates = items.map((item) => item.date).sort();
  const inWeek = dates.some((date) => startOfWeek(date, weekStartsOn) === thisWeek);
  const upcoming = dates.find((date) => date >= today) ?? dates[0];
  return inWeek || upcoming === undefined ? thisWeek : startOfWeek(upcoming, weekStartsOn);
}
