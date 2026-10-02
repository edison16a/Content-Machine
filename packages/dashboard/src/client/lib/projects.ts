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
