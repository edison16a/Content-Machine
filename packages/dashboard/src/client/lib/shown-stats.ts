import { statsTimeline, statsTotals, type StatsPoint } from '../../shared/stats.js';
import type { DashboardStats } from '../../shared/types.js';
import type { View } from '../state.js';
import { customHistory, engagementFrom } from './history.js';
import type { Override } from './override.js';

/**
 * The points the statistics section shows. Normally the recorded timeline
 * for the selection. With custom numbers from the admin panel it is thirty
 * days of made-up history ending on them instead, shaped like real growth
 * and copying the recorded engagement where there is any. Custom numbers
 * are totals for every video, so they apply only when the picker is on All
 * videos. A picked video that is not on screen counts as All videos.
 */
export function shownStats(
  stats: DashboardStats,
  itemKeys: readonly string[],
  choice: { platform: View; statsItem: string },
  override: Override | undefined,
  now: Date,
): { points: StatsPoint[]; custom: boolean } {
  const itemKey = itemKeys.includes(choice.statsItem) ? choice.statsItem : 'all';
  if (override === undefined || itemKey !== 'all') {
    return { points: statsTimeline(stats, { platform: choice.platform, itemKey }), custom: false };
  }
  const recorded = statsTotals(stats, { platform: 'all', itemKey: 'all' });
  return {
    points: customHistory(override, stats.rates, choice.platform, now, engagementFrom(recorded)),
    custom: true,
  };
}
