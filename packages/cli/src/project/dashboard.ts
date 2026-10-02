import type { Project, Schedule } from '@content-machine/core';
import { loadClientBundle, renderDashboardHtml } from '@content-machine/dashboard';
import type { CommandContext } from '../context.js';
import { projectDashboardData } from './dashboard-data.js';
import { writeLiveIndex } from './live-index.js';
import type { ProjectPaths } from './paths.js';

/**
 * Brings both dashboards up to date. The project's own dashboard.html is a
 * self-contained snapshot you can zip and share. The root index.html is the
 * live view; it only needs its data file rewritten. Every command that
 * changes what the dashboard shows calls this, so neither is ever stale.
 */
export async function writeDashboard(
  ctx: CommandContext,
  paths: ProjectPaths,
  project: Project,
  schedule: Schedule | undefined,
): Promise<string> {
  const data = await projectDashboardData(ctx, paths, project, schedule);
  const html = renderDashboardHtml({ data, ...(await loadClientBundle()) });
  await ctx.fs.writeText(paths.dashboard, html);
  await writeLiveIndex(ctx);
  return paths.dashboard;
}
