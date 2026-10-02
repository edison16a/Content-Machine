import type { Command } from 'commander';
import type { CommandContext } from '../context.js';
import { openInBrowser } from '../io/open-browser.js';
import { writeDashboard } from '../project/dashboard.js';
import { loadSchedule } from '../project/files.js';
import { liveIndexPaths, writeLiveIndex } from '../project/live-index.js';
import { display, openProject } from './shared.js';

export async function runDashboard(ctx: CommandContext, name: string): Promise<string> {
  const { paths, project } = await openProject(ctx, name);
  const path = await writeDashboard(ctx, paths, project, await loadSchedule(ctx.fs, paths));
  const live = liveIndexPaths(ctx.root);
  ctx.out.result('dashboard', { dashboard: path, index: live.page, data: live.data }, () => [
    `Updated ${display(ctx, path)} and ${display(ctx, live.data)}`,
    `Live dashboard: ${display(ctx, live.page)} (keep it open; it updates itself)`,
  ]);
  return path;
}

/**
 * Opens the live index.html at the repo root. It shows every project, so
 * there is one page to keep open. The data is refreshed first so what opens
 * is never stale.
 */
export async function runOpen(
  ctx: CommandContext,
  name: string | undefined,
  opener = openInBrowser,
): Promise<void> {
  if (name === undefined) await writeLiveIndex(ctx);
  else {
    const { paths, project } = await openProject(ctx, name);
    await writeDashboard(ctx, paths, project, await loadSchedule(ctx.fs, paths));
  }
  const { page } = liveIndexPaths(ctx.root);
  const opened = await opener(page);
  const url = `file://${page}`;
  ctx.out.result('open', { index: page, url, opened }, () =>
    opened ? [`Opened ${url}`] : [`Could not open a browser here. Open this file yourself: ${url}`],
  );
}

export function registerDashboard(program: Command, context: () => CommandContext): void {
  program
    .command('dashboard <project>')
    .description("Regenerate the project's dashboard.html and the live index data.")
    .action((name: string) => runDashboard(context(), name).then(() => undefined));
  program
    .command('open [project]')
    .description('Open the live dashboard (index.html) in your default browser.')
    .action((name: string | undefined) => runOpen(context(), name));
}
