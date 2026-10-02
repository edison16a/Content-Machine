import type { DashboardData, DashboardItem, DashboardSnapshot } from '../../shared/types.js';

/**
 * Data written by an older version of the CLI has no item keys. After an
 * upgrade the new page can meet such a file until some command rewrites it,
 * so missing keys are filled in here, once, where data enters the page.
 * Keys are built the same way the generator builds them.
 */
export function withKeys(data: DashboardData): DashboardData {
  // Typed loosely on purpose: these fields may be missing in old files.
  const items = data.items as (Omit<DashboardItem, 'key' | 'project'> & {
    key?: string;
    project?: string;
  })[];
  const snapshots = data.stats.snapshots as (Omit<DashboardSnapshot, 'itemKey'> & {
    itemKey?: string;
  })[];
  return {
    ...data,
    items: items.map((item) => ({
      ...item,
      project: item.project ?? data.project,
      key: item.key ?? `${data.project}#${item.id}`,
    })),
    stats: {
      ...data.stats,
      snapshots: snapshots.map((snapshot) => ({
        ...snapshot,
        itemKey: snapshot.itemKey ?? `${data.project}#${snapshot.itemId}`,
      })),
    },
  };
}
