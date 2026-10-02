import type { Command } from 'commander';
import { Option } from 'commander';
import { SOURCE_PLATFORMS, type SourcePlatform } from '@content-machine/core';
import type { CommandContext } from '../context.js';
import { createProject } from '../project/scaffold.js';
import { display } from './shared.js';

interface NewOptions {
  channel?: string;
  platform?: SourcePlatform;
  timezone?: string;
  account?: string;
}

export async function runNew(
  ctx: CommandContext,
  name: string,
  options: NewOptions,
): Promise<void> {
  const { paths, project } = await createProject(ctx, name, options);
  ctx.out.result('new', { project, path: paths.root, dashboard: paths.dashboard }, () => [
    `Created ${display(ctx, paths.root)}`,
    `Put the long video and its transcript in ${display(ctx, paths.sourceDir)}/`,
    `Dashboard: ${display(ctx, paths.dashboard)}`,
  ]);
}

export function registerNew(program: Command, context: () => CommandContext): void {
  program
    .command('new <project>')
    .description('Create a project folder with the standard structure and an empty dashboard.')
    .option('--channel <name>', 'channel the long videos come from')
    .addOption(
      new Option('--platform <platform>', 'platform the long videos come from').choices([
        ...SOURCE_PLATFORMS,
      ]),
    )
    .option('--timezone <iana>', 'time zone for posting times, e.g. America/New_York')
    .option('--account <name>', 'which set of social accounts this project posts to')
    .action((name: string, options: NewOptions) => runNew(context(), name, options));
}
