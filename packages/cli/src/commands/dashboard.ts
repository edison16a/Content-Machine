import type { Command } from 'commander';
import type { CommandContext } from '../context.js';
import { openInBrowser } from '../io/open-browser.js';
import { loadSchedule } from '../project/files.js';
import { writeDashboard } from '../project/dashboard.js';
import { display, openProject } from './shared.js';

export async function runDashboard(ctx: CommandContext, name: string): Promise<string> {
  const { paths, project } = await openProject(ctx, name);
  const path = await writeDashboard(ctx, paths, project, await loadSchedule(ctx.fs, paths));
  ctx.out.result('dashboard', { dashboard: path }, () => [`Updated ${display(ctx, path)}`]);
  return path;
}

/** Regenerates the dashboard first so what opens is never stale. */
export async function runOpen(
  ctx: CommandContext,
  name: string,
  opener = openInBrowser,
): Promise<void> {
  const { paths, project } = await openProject(ctx, name);
  const path = await writeDashboard(ctx, paths, project, await loadSchedule(ctx.fs, paths));
  const opened = await opener(path);
  const url = `file://${path}`;
  ctx.out.result('open', { dashboard: path, url, opened }, () =>
    opened ? [`Opened ${url}`] : [`Could not open a browser here. Open this file yourself: ${url}`],
  );
}

export function registerDashboard(program: Command, context: () => CommandContext): void {
  program
    .command('dashboard <project>')
    .description('Regenerate dashboard.html from the schedule.')
    .action((name: string) => runDashboard(context(), name).then(() => undefined));
  program
    .command('open <project>')
    .description('Open the dashboard in your default browser.')
    .action((name: string) => runOpen(context(), name));
}
