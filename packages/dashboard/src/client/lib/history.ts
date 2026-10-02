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
type Metric = 'views' | 'likes' | 'comments' | 'shares';

/**
 * How each kind of engagement moves on its own, beyond following views.
 * `drift` is how far its rate per view wanders from day to day; `spikes`
 * and `height` are its own bursts. Likes track views closely, comments swing
 * more (a video that starts an argument), shares burst hardest (the days a
 * video gets passed around). That is why their graphs differ.
 */
const BEHAVIOUR: Record<
  Exclude<Metric, 'views'>,
  { drift: number; spikes: number; height: number }
> = {
  likes: { drift: 0.18, spikes: 2, height: 2.2 },
  comments: { drift: 0.3, spikes: 2, height: 3.5 },
  shares: { drift: 0.22, spikes: 3, height: 5 },
};

/** A roughly normal random number with mean 0 and spread 1. */
function gaussian(rng: () => number): number {
  return (rng() + rng() + rng() + rng() - 2) / 0.577;
}

/** Bursts on random days that fade over the next few days, as a boost per day. */
function bursts(rng: () => number, count: number, height: number): number[] {
  const spikes = Array.from({ length: count }, () => ({
    day: Math.floor(rng() * HISTORY_DAYS),
    height: 0.8 + rng() * height,
    fade: 0.8 + rng() * 2,
  }));
  return Array.from({ length: HISTORY_DAYS }, (_, t) =>
    spikes
      .filter((spike) => t >= spike.day)
      .reduce((sum, spike) => sum + spike.height * Math.exp(-(t - spike.day) / spike.fade), 0),
  );
}

/**
 * One engagement metric's daily amounts: views times a rate that wanders
 * from day to day (pulled back towards normal, so it never runs away), plus
 * the metric's own bursts.
 */
function engagementDaily(
  views: readonly number[],
  rng: () => number,
  behaviour: { drift: number; spikes: number; height: number },
): number[] {
  const own = bursts(rng, behaviour.spikes, behaviour.height);
  let wander = 0;
  return views.map((v, t) => {
    wander = 0.75 * wander + gaussian(rng) * behaviour.drift;
    return v * Math.exp(wander) * (1 + (own[t] ?? 0));
  });
}

/**
 * One platform's daily views as relative sizes. A channel grows over the
 * month, wobbles with the week, varies day to day, and now and then a video
 * takes off: a spike several times the usual day that fades over the next
 * few days. That mix is what real analytics look like, and it keeps the
 * graphs from being straight lines.
 */
function dailyShape(rng: () => number): number[] {
  const phase = rng() * 7;
  const growth = 0.8 + rng() * 1.4;
  const boost = bursts(rng, 2 + Math.floor(rng() * 3), 6);
  return Array.from({ length: HISTORY_DAYS }, (_, t) => {
    const trend = 0.3 + 0.7 * (t / (HISTORY_DAYS - 1)) ** growth;
    const weekly = 1 + 0.18 * Math.sin((2 * Math.PI * (t + phase)) / 7);
    const noise = 0.75 + rng() * 0.5;
    return trend * weekly * noise * (1 + (boost[t] ?? 0));
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
 * Likes, comments and shares add up to the given rates of views but move
 * in their own ways (see BEHAVIOUR). The randomness comes from the seed
 * saved with the numbers, so a refresh redraws the same month and a new
 * Apply draws a new one.
 */
export function customHistory(
  override: Override,
  rates: Record<DashboardPlatform, number>,
  view: View,
  now: Date,
  engagement: Engagement,
): StatsPoint[] {
  const rng = seededRandom(override.seed ?? JSON.stringify(override));
  const views = splitViews(override);
  const series = Object.fromEntries(
    DASHBOARD_PLATFORMS.map((platform) => {
      const daily = dailyShape(rng);
      const metric = (name: Exclude<Metric, 'views'>): number[] =>
        runningTotals(
          engagementDaily(daily, rng, BEHAVIOUR[name]),
          views[platform] * engagement[name],
        );
      return [
        platform,
        {
          views: runningTotals(daily, views[platform]),
          likes: metric('likes'),
          comments: metric('comments'),
          shares: metric('shares'),
        },
      ];
    }),
  ) as Record<DashboardPlatform, Record<Metric, number[]>>;
  const shown: readonly DashboardPlatform[] = view === 'all' ? DASHBOARD_PLATFORMS : [view];
  return Array.from({ length: HISTORY_DAYS }, (_, t) => {
    const sum = (metric: Metric): number =>
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
