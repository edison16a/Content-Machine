import type { DashboardData } from '../../shared/types.js';

/** "#project=tiny-house" in the address picks a project, so links can point at one. */
export function projectFromHash(hash: string): string | undefined {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('project');
  return value === null || value === '' ? undefined : value;
}

/**
 * Which project to show. The one asked for wins; otherwise the one that
 * changed most recently, because that is almost always what you are
 * working on right now.
 */
export function chooseProject(
  projects: readonly DashboardData[],
  wanted: string | undefined,
): DashboardData | undefined {
  const named = projects.find((project) => project.project === wanted);
  if (named !== undefined) return named;
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/**
 * What the live index shows before any project exists: the full dashboard
 * with an empty calendar and zeroed statistics, so the page looks like
 * itself from the first minute. Logos load by relative path from the repo,
 * which is where index.html lives.
 */
export function placeholderProject(): DashboardData {
  return {
    project: '',
    channel: '',
    sourcePlatform: 'other',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekStartsOn: 'monday',
    slots: ['12:00', '17:00', '20:00'],
    stagger: { tiktok: 0, instagram: 15, youtube: 30 },
    handles: {},
    updatedAt: '',
    items: [],
    logos: {
      brand: 'assets/brand/content-machine.svg',
      platforms: {
        tiktok: 'assets/icons/tiktok.png',
        instagram: 'assets/icons/instagram.png',
        youtube: 'assets/icons/youtube.png',
      },
      source: null,
    },
    repoUrl: 'https://github.com/edison16a/Content-Machine',
    stats: { rates: { tiktok: 0, instagram: 0, youtube: 0 }, snapshots: [] },
  };
}
