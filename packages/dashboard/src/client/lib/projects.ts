import type { DashboardData } from '../../shared/types.js';
import { ALL_PROJECTS, mergeProjects } from './merge.js';

/** "#project=tiny-house" in the address picks a project, so links can point at one. */
export function projectFromHash(hash: string): string | undefined {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('project');
  return value === null || value === '' ? undefined : value;
}

/**
 * The selection that is really on screen. A remembered or linked project
 * that no longer exists means every project, and saying so here keeps the
 * Settings dropdown, the custom numbers and the calendar in agreement. With
 * no projects at all the selection is kept, so a remembered pick survives a
 * moment when the data file is empty.
 */
export function resolveSelection(projects: readonly DashboardData[], selection: string): string {
  if (projects.length === 0 || selection === ALL_PROJECTS) return selection;
  return projects.some((p) => p.project === selection) ? selection : ALL_PROJECTS;
}

/**
 * What the dashboard shows for a selection: one named project, or every
 * project on one calendar (the default, and the fallback when a remembered
 * project no longer exists). With no projects at all it is the empty
 * placeholder, so the page still looks like itself.
 */
export function dataFor(projects: readonly DashboardData[], selection: string): DashboardData {
  if (projects.length === 0) return placeholderProject();
  const named =
    selection === ALL_PROJECTS ? undefined : projects.find((p) => p.project === selection);
  return named ?? mergeProjects(projects);
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
    stats: { rates: { tiktok: 0, instagram: 0, youtube: 0 }, snapshots: [], sample: false },
  };
}
