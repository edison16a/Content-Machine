import { incomeFor, type StatsPoint, type Totals } from '../../shared/stats.js';
import { DASHBOARD_PLATFORMS, type DashboardPlatform } from '../../shared/types.js';
import type { View } from '../state.js';
import { splitViews, type Override } from './override.js';
import { seededRandom } from './random.js';

/** How many days of made-up history custom numbers get. */
export const HISTORY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Typical engagement on short videos, used when nothing is recorded to copy. */
const TYPICAL = { likes: 0.065, comments: 0.005, shares: 0.009 };

type Engagement = typeof TYPICAL;

/**
 * One platform's daily views as relative sizes. A channel grows over the
 * month, wobbles with the week, varies day to day, and now and then a video
 * takes off: a spike several times the usual day that fades over the next
 * few days. That mix is what real analytics look like, and it keeps the
 * graphs from being straight lines.
 */
function dailyShape(rng: () => number): number[] {
  const phase = rng() * 7;
  const spikes = Array.from({ length: 2 + Math.floor(rng() * 3) }, () => ({
    day: Math.floor(rng() * HISTORY_DAYS),
    height: 2.5 + rng() * 5.5,
    fade: 1.2 + rng() * 1.6,
  }));
  return Array.from({ length: HISTORY_DAYS }, (_, t) => {
    const trend = 0.35 + 0.65 * (t / (HISTORY_DAYS - 1)) ** 1.4;
    const weekly = 1 + 0.18 * Math.sin((2 * Math.PI * (t + phase)) / 7);
    const noise = 0.75 + rng() * 0.5;
    const boost = spikes
      .filter((spike) => t >= spike.day)
      .reduce(
        (sum, spike) => sum + (spike.height - 1) * Math.exp(-(t - spike.day) / spike.fade),
        0,
      );
    return trend * weekly * noise * (1 + boost);
  });
}

/** Running totals of daily amounts scaled to end exactly on `total`. */
function runningTotals(daily: readonly number[], total: number): number[] {
  const sum = daily.reduce((a, b) => a + b, 0);
  let running = 0;
  return daily.map((value) => {
    running += sum === 0 ? total / daily.length : (value / sum) * total;
    return running;
  });
}

/** Engagement to copy from recorded totals, or typical rates when there are none. */
export function engagementFrom(totals: Totals | undefined): Engagement {
  if (totals === undefined || totals.views === 0) return TYPICAL;
  return {
    likes: totals.likes / totals.views,
    comments: totals.comments / totals.views,
    shares: totals.shares / totals.views,
  };
}

/**
 * Thirty days of made-up history that end exactly on the typed numbers. Each
 * platform gets its own rhythm and spikes; the All tab is their sum.
 * Likes, comments and shares follow views at the given rates, with their own
 * day-to-day jitter. Seeded by the typed numbers, so the same numbers always
 * draw the same graph.
 */
export function customHistory(
  override: Override,
  rates: Record<DashboardPlatform, number>,
  view: View,
  now: Date,
  engagement: Engagement,
): StatsPoint[] {
  const rng = seededRandom(JSON.stringify(override));
  const views = splitViews(override);
  const series = Object.fromEntries(
    DASHBOARD_PLATFORMS.map((platform) => {
      const daily = dailyShape(rng);
      const jitter = (): number[] => daily.map((v) => v * (0.8 + rng() * 0.4));
      return [
        platform,
        {
          views: runningTotals(daily, views[platform]),
          likes: runningTotals(jitter(), views[platform] * engagement.likes),
          comments: runningTotals(jitter(), views[platform] * engagement.comments),
          shares: runningTotals(jitter(), views[platform] * engagement.shares),
        },
      ];
    }),
  ) as Record<DashboardPlatform, Record<'views' | 'likes' | 'comments' | 'shares', number[]>>;
  const shown: readonly DashboardPlatform[] = view === 'all' ? DASHBOARD_PLATFORMS : [view];
  return Array.from({ length: HISTORY_DAYS }, (_, t) => {
    const sum = (metric: 'views' | 'likes' | 'comments' | 'shares'): number =>
      Math.round(shown.reduce<number>((total, p) => total + (series[p][metric][t] ?? 0), 0));
    return {
      at: new Date(now.getTime() - (HISTORY_DAYS - 1 - t) * DAY_MS).toISOString(),
      views: sum('views'),
      income: shown.reduce<number>(
        (total, p) => total + incomeFor(series[p].views[t] ?? 0, rates[p]),
        0,
      ),
      likes: sum('likes'),
      comments: sum('comments'),
      shares: sum('shares'),
    };
  });
}
