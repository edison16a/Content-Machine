import type { Command } from 'commander';
import { summarizeSchedule } from '@content-machine/core';
import type { CommandContext } from '../context.js';
import { writeDashboard } from '../project/dashboard.js';
import { scheduleProject, type ScheduleOutcome } from '../project/scheduling.js';
import { openProject } from './shared.js';

export async function runSchedule(
  ctx: CommandContext,
  name: string,
  flags: { rebuild?: boolean },
): Promise<ScheduleOutcome> {
  const { paths, project } = await openProject(ctx, name);
  const outcome = await scheduleProject(ctx, paths, project, flags.rebuild ?? false);
  for (const warning of outcome.warnings) ctx.out.warn(warning);
  await writeDashboard(ctx, paths, project, outcome.schedule);
  const summary = summarizeSchedule(outcome.schedule, ctx.clock.now());
  ctx.out.result(
    'schedule',
    {
      added: outcome.added,
      total: summary.total,
      firstDate: summary.firstDate,
      lastDate: summary.lastDate,
      warnings: outcome.warnings,
    },
    () => [
      `Scheduled ${outcome.added.length} new video(s); ${summary.total} in the calendar.`,
      ...outcome.added.map(
        (a) => `  ${String(a.id).padStart(3, '0')}  ${a.date}  ${project.slots[a.slot] ?? ''}`,
      ),
      summary.firstDate === undefined
        ? 'Nothing scheduled.'
        : `Runs from ${summary.firstDate} to ${summary.lastDate}, ${project.slots.length} a day per platform.`,
    ],
  );
  return outcome;
}

export function registerSchedule(program: Command, context: () => CommandContext): void {
  program
    .command('schedule <project>')
    .description(
      'Give each rendered, unscheduled item a fixed posting slot (3 a day per platform).',
    )
    .option('--rebuild', 're-assign items still queued on every platform; others keep their slot')
    .action((name: string, flags: { rebuild?: boolean }) =>
      runSchedule(context(), name, flags).then(() => undefined),
    );
}
