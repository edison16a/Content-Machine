import { join } from 'node:path';
import { PROJECT_NAME_PATTERN } from '@content-machine/core';
import {
  LIVE_DATA_FILE,
  clientBuildId,
  loadClientBundle,
  renderLiveData,
  withMediaBase,
  type DashboardData,
} from '@content-machine/dashboard';
import type { CommandContext } from '../context.js';
import { projectDashboardData } from './dashboard-data.js';
import { loadProject, loadSchedule } from './files.js';
import { projectPaths } from './paths.js';

/** The page you keep open, and the data file it rereads. */
export function liveIndexPaths(root: string): { page: string; data: string } {
  return { page: join(root, 'index.html'), data: join(root, LIVE_DATA_FILE) };
}

/** Every project folder with a project.json, in name order. */
async function projectNames(ctx: CommandContext): Promise<string[]> {
  const dir = join(ctx.root, 'projects');
  if (!(await ctx.fs.exists(dir))) return [];
  const names: string[] = [];
  for (const name of await ctx.fs.list(dir)) {
    if (!PROJECT_NAME_PATTERN.test(name)) continue;
    if (await ctx.fs.exists(projectPaths(ctx.root, name).projectJson)) names.push(name);
  }
  return names;
}

/**
 * Rewrites projects/dashboard-data.js from every project's schedule. The
 * open index.html notices the change within a few seconds and redraws. A
 * project with a broken file is skipped with a warning rather than taking
 * the whole dashboard down.
 */
export async function writeLiveIndex(ctx: CommandContext): Promise<string> {
  const projects: DashboardData[] = [];
  for (const name of await projectNames(ctx)) {
    const paths = projectPaths(ctx.root, name);
    try {
      const project = await loadProject(ctx.fs, paths);
      const data = await projectDashboardData(ctx, project, await loadSchedule(ctx.fs, paths));
      projects.push(withMediaBase(data, `projects/${name}/`));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      ctx.out.warn(`Left ${name} off the live dashboard: ${reason}`);
    }
  }
  const { data } = liveIndexPaths(ctx.root);
  const bundle = await loadClientBundle();
  await ctx.fs.writeText(
    data,
    renderLiveData({
      build: clientBuildId(bundle),
      updatedAt: ctx.clock.now().toISOString(),
      projects,
    }),
  );
  return data;
}
