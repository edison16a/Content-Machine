/**
 * Statistics math shared by the CLI summary and the browser. Plain functions
 * over plain data, with no imports beyond types, so the client bundle stays
 * small and both sides always agree on the numbers.
 */
import type { DashboardPlatform, DashboardSnapshot, DashboardStats, StatMetric } from './types.js';

export type Totals = Record<StatMetric, number>;

export interface StatsPoint extends Totals {
  at: string;
}

/** Which slice of the numbers to show: one platform or all, one video or all. */
export interface StatsFilter {
  platform: DashboardPlatform | 'all';
  itemId: number | 'all';
}

export const ZERO_TOTALS: Totals = { views: 0, income: 0, likes: 0, comments: 0, shares: 0 };

/** Estimated dollars for some views at a rate per 1,000 views. */
export function incomeFor(views: number, ratePerThousand: number): number {
  return (views / 1000) * ratePerThousand;
}

function included(snapshot: DashboardSnapshot, filter: StatsFilter): boolean {
  return (
    (filter.platform === 'all' || snapshot.platform === filter.platform) &&
    (filter.itemId === 'all' || snapshot.itemId === filter.itemId)
  );
}

/**
 * Totals over time. Each reading replaces the previous reading for the same
 * video on the same platform (numbers on a platform only ever describe the
 * total so far), so a point is the sum of the latest reading of every video
 * at that moment. Readings taken at the same moment form one point.
 */
export function statsTimeline(stats: DashboardStats, filter: StatsFilter): StatsPoint[] {
  const sorted = stats.snapshots
    .filter((snapshot) => included(snapshot, filter))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const latest = new Map<string, DashboardSnapshot>();
  const points: StatsPoint[] = [];
  for (const [index, snapshot] of sorted.entries()) {
    latest.set(`${snapshot.platform}#${snapshot.itemId}`, snapshot);
    if (sorted[index + 1]?.at === snapshot.at) continue;
    const point: StatsPoint = { at: snapshot.at, ...ZERO_TOTALS };
    for (const reading of latest.values()) {
      point.views += reading.views;
      point.likes += reading.likes;
      point.comments += reading.comments;
      point.shares += reading.shares;
      point.income += incomeFor(reading.views, stats.rates[reading.platform]);
    }
    points.push(point);
  }
  return points;
}

/** The latest totals for a slice, or zeros when nothing has been recorded. */
export function statsTotals(stats: DashboardStats, filter: StatsFilter): Totals {
  const last = statsTimeline(stats, filter).at(-1);
  if (last === undefined) return { ...ZERO_TOTALS };
  return {
    views: last.views,
    income: last.income,
    likes: last.likes,
    comments: last.comments,
    shares: last.shares,
  };
}
