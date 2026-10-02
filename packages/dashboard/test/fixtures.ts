import type { DashboardData, DashboardItem } from '../src/shared/types.js';

/**
 * Small projects for the merge, override and selection tests: two projects
 * with different slot times that both post on Oct 2 at 12:00, and reuse the
 * same item numbers.
 */
export function item(project: string, id: number, date: string, slot: number): DashboardItem {
  const entry = { time: '12:00', iso: `${date}T12:00:00Z`, status: 'queued' as const, note: '' };
  return {
    id,
    key: `${project}#${id}`,
    project,
    video: `projects/${project}/videos/00${id}.mp4`,
    thumb: `projects/${project}/thumbs/00${id}.jpg`,
    duration: 30,
    postTitle: `${project} ${id}`,
    captions: { tiktok: '', instagram: '', youtube: '' },
    source: 'a.mp4',
    sourceStart: 0,
    sourceEnd: 30,
    note: '',
    date,
    slot,
    platforms: { tiktok: entry, instagram: entry, youtube: entry },
  };
}

export function project(
  name: string,
  slots: string[],
  items: DashboardItem[],
  updatedAt: string,
  sample = false,
): DashboardData {
  return {
    project: name,
    channel: `${name} channel`,
    sourcePlatform: 'youtube',
    timezone: name === 'bees' ? 'Europe/Berlin' : 'UTC',
    weekStartsOn: 'monday',
    slots,
    stagger: { tiktok: 0, instagram: 15, youtube: 30 },
    handles: { tiktok: `@${name}` },
    updatedAt,
    items,
    logos: { brand: '', platforms: { tiktok: null, instagram: null, youtube: null }, source: null },
    repoUrl: '',
    stats: {
      rates: { tiktok: 0.4, instagram: 0.01, youtube: 0.07 },
      sample,
      snapshots: items.map((i) => ({
        at: '2026-10-02T00:00:00Z',
        platform: 'tiktok' as const,
        itemId: i.id,
        itemKey: i.key,
        views: 1000,
        likes: 10,
        comments: 1,
        shares: 1,
      })),
    },
  };
}

// Two projects with different slot times, and both posting on Oct 2 at 12:00.
export const ants = project(
  'ants',
  ['12:00', '17:00'],
  [item('ants', 1, '2026-10-02', 0), item('ants', 2, '2026-10-02', 1)],
  '2026-10-01T00:00:00Z',
);
export const bees = project(
  'bees',
  ['09:00', '12:00'],
  [item('bees', 1, '2026-10-02', 1), item('bees', 2, '2026-10-03', 0)],
  '2026-10-02T00:00:00Z',
  true,
);
