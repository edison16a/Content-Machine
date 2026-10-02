import {
  SCHEMA_VERSION,
  UserError,
  type Project,
  type SourcePlatform,
} from '@content-machine/core';
import type { CommandContext } from '../context.js';
import { writeDashboard } from './dashboard.js';
import { writeJson } from './files.js';
import { projectPaths, type ProjectPaths } from './paths.js';
import { projectReadme } from './readme.js';

export interface NewProjectOptions {
  channel?: string;
  platform?: SourcePlatform;
  timezone?: string;
  account?: string;
}

/**
 * Creates the standard project folder: four kinds of folders, project.json
 * from the config defaults, a README and an empty dashboard.
 */
export async function createProject(
  ctx: CommandContext,
  name: string,
  options: NewProjectOptions = {},
): Promise<{ paths: ProjectPaths; project: Project }> {
  const paths = projectPaths(ctx.root, name);
  if (await ctx.fs.exists(paths.root)) {
    throw new UserError('E_PROJECT_EXISTS', `A project called "${name}" already exists.`, {
      hint: 'Pick another name, or keep working in the existing project.',
    });
  }
  const config = await ctx.config();
  const project: Project = {
    schemaVersion: SCHEMA_VERSION,
    name: paths.name,
    channel: options.channel ?? '',
    sourcePlatform: options.platform ?? 'youtube',
    account: options.account ?? config.account,
    timezone: options.timezone ?? config.timezone,
    weekStartsOn: config.weekStartsOn,
    slots: config.slots,
    stagger: config.stagger,
    handles: config.handles,
  };
  for (const dir of [
    paths.sourceDir,
    paths.downloadsDir,
    paths.planDir,
    paths.videosDir,
    paths.thumbsDir,
    paths.workDir,
  ])
    await ctx.fs.mkdirp(dir);
  await writeJson(ctx.fs, paths.projectJson, project);
  await ctx.fs.writeText(paths.readme, projectReadme(name));
  await writeDashboard(ctx, paths, project, undefined);
  return { paths, project };
}
