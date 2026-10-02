import type { Command } from 'commander';
import {
  UserError,
  applyStatus,
  formatHistoryLine,
  type Platform,
  type Status,
  type StatusChange,
} from '@content-machine/core';
import type { CommandContext } from '../context.js';
import { withLock } from '../io/lock.js';
import { writeDashboard } from '../project/dashboard.js';
import { loadSchedule, writeJson } from '../project/files.js';
import { openProject, parseIds, parsePlatforms, parseStatus } from './shared.js';

interface MarkFlags {
  item: string;
  platform: Platform[];
  status: Status;
  note?: string;
}

export async function runMark(
  ctx: CommandContext,
  name: string,
  flags: MarkFlags,
): Promise<StatusChange[]> {
  const { paths, project } = await openProject(ctx, name);
  const schedule = await withLock(paths.scheduleLock, async () => {
    const current = await loadSchedule(ctx.fs, paths);
    if (current === undefined)
      throw new UserError('E_FILE_NOT_FOUND', 'Nothing is scheduled yet.', {
        hint: `Run: npm run cm -- schedule ${name}`,
      });
    const itemIds = flags.item === 'all' ? current.items.map((i) => i.id) : parseIds(flags.item);
    const result = applyStatus(current, {
      itemIds,
      platforms: flags.platform,
      status: flags.status,
      note: flags.note ?? '',
      at: ctx.clock.now().toISOString(),
    });
    const updated = { ...result.schedule, updatedAt: ctx.clock.now().toISOString() };
    await writeJson(ctx.fs, paths.schedule, updated);
    if (result.changes.length > 0)
      await ctx.fs.appendText(
        paths.history,
        `${result.changes.map(formatHistoryLine).join('\n')}\n`,
      );
    return { updated, changes: result.changes };
  });
  await writeDashboard(ctx, paths, project, schedule.updated);
  ctx.out.result('mark', { changes: schedule.changes }, () =>
    schedule.changes.length === 0
      ? ['Nothing changed: those entries already had that status.']
      : schedule.changes.map(
          (c) => `  ${String(c.itemId).padStart(3, '0')} ${c.platform}: ${c.from} to ${c.to}`,
        ),
  );
  return schedule.changes;
}

export function registerMark(program: Command, context: () => CommandContext): void {
  program
    .command('mark <project>')
    .description('Record posting progress for items and platforms, then refresh the dashboard.')
    .requiredOption('--item <ids>', 'item id(s): 3, 1,4,7, 2-5 or all')
    .requiredOption('--platform <platform>', 'tiktok, instagram, youtube or all', parsePlatforms)
    .requiredOption('--status <status>', 'queued, scheduled, posted or failed', parseStatus)
    .option('--note <text>', 'a short note, e.g. why a post failed')
    .action((name: string, flags: MarkFlags) =>
      runMark(context(), name, flags).then(() => undefined),
    );
}
