import {
  PLATFORMS,
  type Platform,
  type Schedule,
  type StatsImportRow,
} from '@content-machine/core';

/** Days of readings the demo records, one per day, ending now. */
const READING_DAYS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rough reach of each platform relative to TikTok, so the tabs differ. */
const REACH: Record<Platform, number> = { tiktok: 1, instagram: 0.45, youtube: 0.7 };

/**
 * A stable pseudo-random number in [0, 1) from an item id, so every demo run
 * produces the same numbers and the screenshots never drift.
 */
function seeded(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Made-up readings for the demo's posted videos. Views climb fast in the
 * first day and level off, the way short videos usually do; likes, comments
 * and shares follow as typical shares of views.
 */
export function demoStatsRows(schedule: Schedule, now: Date): StatsImportRow[] {
  const rows: StatsImportRow[] = [];
  for (let day = READING_DAYS - 1; day >= 0; day -= 1) {
    const at = new Date(now.getTime() - day * DAY_MS);
    for (const item of schedule.items) {
      for (const platform of PLATFORMS) {
        const posted = Date.parse(item.platforms[platform].iso);
        if (item.platforms[platform].status !== 'posted' || posted > at.getTime()) continue;
        const ageDays = (at.getTime() - posted) / DAY_MS;
        const peak = (2_000 + seeded(item.id) * 18_000) * REACH[platform];
        const views = Math.round(peak * (1 - Math.exp(-ageDays / 1.2)));
        rows.push({
          platform,
          item: item.id,
          views,
          likes: Math.round(views * (0.05 + seeded(item.id + 7) * 0.04)),
          comments: Math.round(views * 0.004),
          shares: Math.round(views * 0.009),
          at: at.toISOString(),
        });
      }
    }
  }
  return rows;
}
