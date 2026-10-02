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

/**
 * Items in posting order: by date, then slot. Ties only happen when several
 * projects share a slot, and are broken by project and number so the order
 * never shuffles between refreshes.
 */
export function inPostingOrder(items: readonly DashboardItem[]): DashboardItem[] {
  return [...items].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.slot - b.slot ||
      a.project.localeCompare(b.project) ||
      a.id - b.id,
  );
}

/**
 * Lookup from "date#slot" to the videos posted there. Usually one, but on
 * the combined calendar two projects can post in the same slot.
 */
export function slotIndex(items: readonly DashboardItem[]): Map<string, DashboardItem[]> {
  const index = new Map<string, DashboardItem[]>();
  for (const item of inPostingOrder(items)) {
    const key = `${item.date}#${item.slot}`;
    index.set(key, [...(index.get(key) ?? []), item]);
  }
  return index;
}

export function firstUnposted(
  items: readonly DashboardItem[],
  platform: DashboardPlatform,
): DashboardItem | undefined {
  return inPostingOrder(items).find((item) => item.platforms[platform].status !== 'posted');
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

/**
 * Posts whose time has come but that nobody has scheduled or posted yet.
 * These are the ones to post by hand right now, oldest first.
 */
export function dueNow(
  items: readonly DashboardItem[],
  platform: DashboardPlatform,
  now: Date,
): DashboardItem[] {
  return items
    .filter((item) => {
      const entry = item.platforms[platform];
      return entry.status === 'queued' && Date.parse(entry.iso) <= now.getTime();
    })
    .sort((a, b) => Date.parse(a.platforms[platform].iso) - Date.parse(b.platforms[platform].iso));
}

/** A post marked scheduled whose time is behind us: worth checking if it went live. */
export function timePassed(item: DashboardItem, platform: DashboardPlatform, now: Date): boolean {
  const entry = item.platforms[platform];
  return entry.status === 'scheduled' && Date.parse(entry.iso) < now.getTime();
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

/**
 * The date the calendar opens on: today when today's week is the one worth
 * showing, otherwise the first day of the week that is. Day, week and month
 * views all start from it.
 */
export function initialAnchor(
  items: readonly DashboardItem[],
  today: string,
  weekStartsOn: 'monday' | 'sunday',
): string {
  const week = initialWeek(items, today, weekStartsOn);
  return startOfWeek(today, weekStartsOn) === week ? today : week;
}
