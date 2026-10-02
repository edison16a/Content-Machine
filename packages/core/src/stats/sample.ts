import { PLATFORMS, type Rates, type StatsSnapshot } from '../schemas/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Views for a platform whose rate is 0 still need a number; use a typical Shorts rate. */
const FALLBACK_RATE = 0.05;

export interface SampleInput {
  items: readonly { id: number; postTitle: string }[];
  rates: Rates;
  /** The last reading's time, ISO. Readings go back one per day from here. */
  now: string;
  days: number;
  /** Estimated dollars the whole set should add up to on the last day. */
  income: number;
  /** Same seed, same numbers, so tests and screenshots stay stable. */
  seed: string;
}

/** A small seeded random number generator (mulberry32). Good enough for fake data. */
function random(seed: string): () => number {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random weights that add up to 1. `spread` makes some much bigger than others. */
function shares(count: number, rng: () => number, spread: number): number[] {
  const raw = Array.from({ length: count }, () => Math.exp(rng() * spread));
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

/**
 * Made-up readings for trying the dashboard: one per day for `days` days,
 * for every video on every platform. The income target is split randomly
 * across platforms and videos, then turned into views with each platform's
 * rate. Each video starts on a random day and its views climb fast, then
 * level off, the way short videos usually do. Likes, comments and shares
 * follow as typical shares of views.
 */
export function sampleSnapshots(input: SampleInput): StatsSnapshot[] {
  const rng = random(input.seed);
  const end = Date.parse(input.now);
  const platformShares = shares(PLATFORMS.length, rng, 1.2);
  const itemShares = shares(input.items.length, rng, 2.5);
  const snapshots: StatsSnapshot[] = [];
  for (const [i, item] of input.items.entries()) {
    const start = Math.floor(rng() * input.days * 0.6);
    const tau = 2 + rng() * 6;
    const span = input.days - 1 - start;
    const engagement = {
      likes: 0.04 + rng() * 0.06,
      comments: 0.002 + rng() * 0.006,
      shares: 0.003 + rng() * 0.012,
    };
    for (const [p, platform] of PLATFORMS.entries()) {
      const rate = input.rates[platform] > 0 ? input.rates[platform] : FALLBACK_RATE;
      const income = input.income * (platformShares[p] ?? 0) * (itemShares[i] ?? 0);
      const finalViews = (income / rate) * 1000;
      for (let day = start; day < input.days; day += 1) {
        const t = day - start;
        const grown =
          span === 0 ? 1 : (1 - Math.exp(-(t + 1) / tau)) / (1 - Math.exp(-(span + 1) / tau));
        const views = Math.round(finalViews * grown);
        snapshots.push({
          at: new Date(end - (input.days - 1 - day) * DAY_MS).toISOString(),
          platform,
          itemId: item.id,
          title: item.postTitle,
          views,
          likes: Math.round(views * engagement.likes),
          comments: Math.round(views * engagement.comments),
          shares: Math.round(views * engagement.shares),
        });
      }
    }
  }
  return snapshots.sort((a, b) => a.at.localeCompare(b.at));
}
