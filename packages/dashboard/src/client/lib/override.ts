import { incomeFor, statsTimeline, type StatsPoint } from '../../shared/stats.js';
import {
  DASHBOARD_PLATFORMS,
  type DashboardPlatform,
  type DashboardStats,
} from '../../shared/types.js';
import type { View } from '../state.js';
import { load, remove, save } from './storage.js';

/**
 * Numbers typed into the admin panel: a total of views and how they split
 * across platforms. They change only what this browser shows right now;
 * recorded statistics on disk are never touched.
 */
export interface Override {
  views: number;
  /** Relative weights, usually percentages. They need not add up to 100. */
  split: Record<DashboardPlatform, number>;
}

const storageKey = (scope: string): string => `override:${scope}`;

function isOverride(value: unknown): value is Override {
  if (typeof value !== 'object' || value === null) return false;
  const { views, split } = value as Partial<Override>;
  return (
    typeof views === 'number' &&
    Number.isFinite(views) &&
    views >= 0 &&
    typeof split === 'object' &&
    DASHBOARD_PLATFORMS.every((p) => typeof split[p] === 'number' && split[p] >= 0)
  );
}

/** The saved numbers for a project selection, if any. Anything malformed is ignored. */
export function loadOverride(scope: string): Override | undefined {
  try {
    const parsed: unknown = JSON.parse(load(storageKey(scope)) ?? 'null');
    return isOverride(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveOverride(scope: string, override: Override): void {
  save(storageKey(scope), JSON.stringify(override));
}

export function clearOverride(scope: string): void {
  remove(storageKey(scope));
}

/**
 * Views per platform from the total and the split, as whole numbers that
 * add up to exactly the total (the rounding leftover goes to the biggest
 * share). An all-zero split counts as an even split.
 */
export function splitViews(override: Override): Record<DashboardPlatform, number> {
  const weights = DASHBOARD_PLATFORMS.map((p) => override.split[p]);
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => (sum === 0 ? 1 / weights.length : w / sum));
  const views = shares.map((share) => Math.floor(override.views * share));
  const leftover = Math.round(override.views) - views.reduce((a, b) => a + b, 0);
  const biggest = shares.indexOf(Math.max(...shares));
  views[biggest] = (views[biggest] ?? 0) + leftover;
  return Object.fromEntries(DASHBOARD_PLATFORMS.map((p, i) => [p, views[i] ?? 0])) as Record<
    DashboardPlatform,
    number
  >;
}

/** Estimated income for the typed numbers, per platform and in total. */
export function overrideIncome(
  override: Override,
  rates: Record<DashboardPlatform, number>,
): { perPlatform: Record<DashboardPlatform, number>; total: number } {
  const views = splitViews(override);
  const perPlatform = Object.fromEntries(
    DASHBOARD_PLATFORMS.map((p) => [p, incomeFor(views[p], rates[p])]),
  ) as Record<DashboardPlatform, number>;
  return { perPlatform, total: DASHBOARD_PLATFORMS.reduce((sum, p) => sum + perPlatform[p], 0) };
}

/**
 * The timeline with the typed numbers as its newest point, "now". History
 * stays as recorded; views and income at the end become the typed ones for
 * the tab on screen, while likes, comments and shares carry on from the
 * last real reading.
 */
export function applyOverride(
  points: readonly StatsPoint[],
  override: Override,
  rates: Record<DashboardPlatform, number>,
  view: View,
  now: Date,
): StatsPoint[] {
  const views = splitViews(override);
  const income = overrideIncome(override, rates);
  const last = points.at(-1);
  const point: StatsPoint = {
    at: now.toISOString(),
    views: view === 'all' ? Math.round(override.views) : views[view],
    income: view === 'all' ? income.total : income.perPlatform[view],
    likes: last?.likes ?? 0,
    comments: last?.comments ?? 0,
    shares: last?.shares ?? 0,
  };
  const earlier =
    last !== undefined && Date.parse(last.at) >= now.getTime() ? points.slice(0, -1) : points;
  return [...earlier, point];
}

/**
 * What the admin form starts with: the saved custom numbers, or else the
 * recorded totals and how they split today, so editing starts from the real
 * picture. With nothing recorded it suggests half on TikTok.
 */
export function startingOverride(saved: Override | undefined, stats: DashboardStats): Override {
  if (saved !== undefined) return saved;
  const latest = (platform: DashboardPlatform): number =>
    statsTimeline(stats, { platform, itemKey: 'all' }).at(-1)?.views ?? 0;
  const split = Object.fromEntries(
    DASHBOARD_PLATFORMS.map((p) => [p, latest(p)]),
  ) as Override['split'];
  const views = DASHBOARD_PLATFORMS.reduce((sum, p) => sum + split[p], 0);
  return views === 0
    ? { views: 0, split: { tiktok: 50, instagram: 25, youtube: 25 } }
    : { views, split };
}

/**
 * The points the statistics section shows: the recorded timeline for the
 * selection, with custom numbers as the newest point when there are any.
 * Custom numbers are totals for every video, so they apply only when the
 * picker is on All videos. A picked video that is not on screen (it belongs
 * to another project) counts as All videos.
 */
export function shownStats(
  stats: DashboardStats,
  itemKeys: readonly string[],
  choice: { platform: View; statsItem: string },
  override: Override | undefined,
  now: Date,
): { points: StatsPoint[]; custom: boolean } {
  const itemKey = itemKeys.includes(choice.statsItem) ? choice.statsItem : 'all';
  const points = statsTimeline(stats, { platform: choice.platform, itemKey });
  if (override === undefined || itemKey !== 'all') return { points, custom: false };
  return {
    points: applyOverride(points, override, stats.rates, choice.platform, now),
    custom: true,
  };
}
