import {
  PLATFORMS,
  STATUSES,
  type Platform,
  type Schedule,
  type Status,
} from '../schemas/index.js';

export type StatusCounts = Record<Status, number>;

export interface UpcomingPost {
  itemId: number;
  platform: Platform;
  iso: string;
  status: Status;
}

export interface ScheduleSummary {
  total: number;
  perPlatform: Record<Platform, StatusCounts>;
  firstDate: string | undefined;
  lastDate: string | undefined;
  next: UpcomingPost[];
}

function emptyCounts(): StatusCounts {
  return { queued: 0, scheduled: 0, posted: 0, failed: 0 };
}

/**
 * Queue overview for `status` and the dashboard header: counts per status per
 * platform, the date range, and the next few posts after `now`.
 */
export function summarizeSchedule(schedule: Schedule, now: Date, upcoming = 3): ScheduleSummary {
  const perPlatform = Object.fromEntries(PLATFORMS.map((p) => [p, emptyCounts()])) as Record<
    Platform,
    StatusCounts
  >;
  const next: UpcomingPost[] = [];
  for (const item of schedule.items) {
    for (const platform of PLATFORMS) {
      const entry = item.platforms[platform];
      perPlatform[platform][entry.status] += 1;
      const pending = entry.status === 'queued' || entry.status === 'scheduled';
      if (pending && Date.parse(entry.iso) >= now.getTime()) {
        next.push({ itemId: item.id, platform, iso: entry.iso, status: entry.status });
      }
    }
  }
  const dates = schedule.items.map((item) => item.date).sort();
  next.sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso) || a.itemId - b.itemId);
  return {
    total: schedule.items.length,
    perPlatform,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    next: next.slice(0, upcoming * PLATFORMS.length),
  };
}

/** Total entries in each status across all platforms. */
export function totalCounts(summary: ScheduleSummary): StatusCounts {
  const totals = emptyCounts();
  for (const platform of PLATFORMS)
    for (const status of STATUSES) totals[status] += summary.perPlatform[platform][status];
  return totals;
}
