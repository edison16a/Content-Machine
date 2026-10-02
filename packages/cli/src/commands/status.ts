import { join } from 'node:path';
import type { Command } from 'commander';
import { PLATFORMS, summarizeSchedule, type ScheduleSummary } from '@content-machine/core';
import type { CommandContext } from '../context.js';
import { loadSchedule } from '../project/files.js';
import { projectPaths } from '../project/paths.js';
import { openProject } from './shared.js';

function describe(name: string, summary: ScheduleSummary | undefined): string[] {
  if (summary === undefined || summary.total === 0) return [`${name}: nothing scheduled yet.`];
  const lines = [
    `${name}: ${summary.total} videos, ${summary.firstDate ?? ''} to ${summary.lastDate ?? ''}`,
  ];
  for (const platform of PLATFORMS) {
    const c = summary.perPlatform[platform];
    lines.push(
      `  ${platform.padEnd(10)} queued ${c.queued}, scheduled ${c.scheduled}, posted ${c.posted}, failed ${c.failed}`,
    );
  }
  const next = summary.next
    .slice(0, 3)
    .map((n) => `${String(n.itemId).padStart(3, '0')} ${n.platform} ${n.iso}`);
  if (next.length > 0) lines.push(`  next: ${next.join('; ')}`);
  return lines;
}

export async function runStatus(
  ctx: CommandContext,
  name: string | undefined,
): Promise<Record<string, ScheduleSummary | undefined>> {
  const names = name === undefined ? await listProjects(ctx) : [name];
  const summaries: Record<string, ScheduleSummary | undefined> = {};
  for (const project of names) {
    const { paths } =
      name === undefined
        ? { paths: projectPaths(ctx.root, project) }
        : await openProject(ctx, project);
    const schedule = await loadSchedule(ctx.fs, paths);
    summaries[project] =
      schedule === undefined ? undefined : summarizeSchedule(schedule, ctx.clock.now());
  }
  ctx.out.result('status', summaries, () =>
    names.length === 0
      ? ['No projects yet. Create one with: npm run cm -- new <project>']
      : names.flatMap((n) => describe(n, summaries[n])),
  );
  return summaries;
}

async function listProjects(ctx: CommandContext): Promise<string[]> {
  const dir = join(ctx.root, 'projects');
  if (!(await ctx.fs.exists(dir))) return [];
  const names: string[] = [];
  for (const entry of await ctx.fs.list(dir)) {
    if (await ctx.fs.exists(join(dir, entry, 'project.json'))) names.push(entry);
  }
  return names;
}

export function registerStatus(program: Command, context: () => CommandContext): void {
  program
    .command('status [project]')
    .description('Queue overview: counts per status per platform, next slots, date range.')
    .action((name: string | undefined) => runStatus(context(), name).then(() => undefined));
}
