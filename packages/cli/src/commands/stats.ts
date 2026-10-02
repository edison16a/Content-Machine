import type { Command } from 'commander';
import { InvalidArgumentError, Option } from 'commander';
import {
  PLATFORMS,
  UserError,
  recordStats,
  type Platform,
  type RowOutcome,
} from '@content-machine/core';
import { statsTotals, type DashboardStats, type Totals } from '@content-machine/dashboard';
import type { CommandContext } from '../context.js';
import { withLock } from '../io/lock.js';
import { writeDashboard } from '../project/dashboard.js';
import { loadSchedule, loadStats, writeJson } from '../project/files.js';
import { candidatesFrom, rowsFrom, type StatsFlags } from '../project/stats-input.js';
import { openProject, parsePositiveInt } from './shared.js';

/** Plenty of decimals: the estimate is tiny per view and people like watching it move. */
const money = (value: number): string => `$${value.toFixed(6)}`;

function describe(outcome: RowOutcome): string {
  const where = `row ${outcome.row} (${outcome.platform})`;
  switch (outcome.kind) {
    case 'recorded':
      return `  ${where}: recorded for #${String(outcome.itemId).padStart(3, '0')}`;
    case 'unknown-item':
      return `  ${where}: there is no item ${outcome.itemId}`;
    case 'unmatched':
      return `  ${where}: no video matches "${outcome.title}"`;
    case 'ambiguous':
      return `  ${where}: "${outcome.title}" fits items ${outcome.itemIds.join(', ')}; add --item or --posted-on`;
  }
}

function totalsLine(label: string, totals: Totals): string {
  return `${label.padEnd(10)} ${totals.views.toLocaleString('en-US')} views, ${totals.likes.toLocaleString('en-US')} likes, ${totals.comments.toLocaleString('en-US')} comments, ${totals.shares.toLocaleString('en-US')} shares, about ${money(totals.income)}`;
}

/**
 * Records views, likes, comments and shares for videos, matched by title,
 * then refreshes the dashboards. With no reading given it prints the totals.
 */
export async function runStats(
  ctx: CommandContext,
  name: string,
  flags: StatsFlags,
): Promise<RowOutcome[]> {
  const { paths, project } = await openProject(ctx, name);
  const schedule = await loadSchedule(ctx.fs, paths);
  const config = await ctx.config();
  const recording = flags.import !== undefined || flags.views !== undefined;
  let outcomes: RowOutcome[] = [];
  if (recording) {
    if (schedule === undefined) {
      throw new UserError(
        'E_FILE_NOT_FOUND',
        'Nothing is scheduled yet, so there is nothing to match.',
        {
          hint: `Run: npm run cm -- schedule ${name}`,
        },
      );
    }
    const rows = await rowsFrom(ctx, flags);
    outcomes = await withLock(`${paths.stats}.lock`, async () => {
      const result = recordStats({
        project: name,
        existing: await loadStats(ctx.fs, paths),
        rows,
        candidates: candidatesFrom(schedule),
        now: ctx.clock.now().toISOString(),
      });
      await writeJson(ctx.fs, paths.stats, result.stats);
      return result.outcomes;
    });
    await writeDashboard(ctx, paths, project, schedule);
  }
  const stats: DashboardStats = {
    rates: { ...config.rates },
    snapshots: (await loadStats(ctx.fs, paths))?.snapshots ?? [],
  };
  const slices: ('all' | Platform)[] = ['all', ...PLATFORMS];
  const totals = slices.map((platform) => ({
    platform,
    ...statsTotals(stats, { platform, itemId: 'all' }),
  }));
  const missed = outcomes.filter((o) => o.kind !== 'recorded').length;
  ctx.out.result('stats', { outcomes, totals, rates: config.rates }, () => [
    ...(recording ? [`Recorded ${outcomes.length - missed} of ${outcomes.length} readings.`] : []),
    ...outcomes.filter((o) => o.kind !== 'recorded').map(describe),
    ...totals.map((slice) => totalsLine(slice.platform, slice)),
    'Income is an estimate from the rates in config (US dollars per 1,000 views).',
  ]);
  return outcomes;
}

export function registerStats(program: Command, context: () => CommandContext): void {
  program
    .command('stats <project>')
    .description(
      'Record views, likes, comments and shares (matched by title), or print the totals.',
    )
    .addOption(
      new Option('--platform <platform>', 'where the numbers are from').choices([...PLATFORMS]),
    )
    .option('--title <text>', 'the post title or caption as the platform shows it')
    .option('--item <id>', 'the item id, instead of matching by title', parsePositiveInt)
    .option(
      '--posted-on <date>',
      'the day it went up (YYYY-MM-DD), to tell apart parts with one title',
    )
    .option('--views <n>', 'total views so far', parseCount)
    .option('--likes <n>', 'total likes so far', parseCount)
    .option('--comments <n>', 'total comments so far', parseCount)
    .option('--shares <n>', 'total shares so far', parseCount)
    .option(
      '--import <file>',
      'a JSON file of readings (see docs/schemas/stats-import.schema.json)',
    )
    .action((name: string, flags: StatsFlags) =>
      runStats(context(), name, flags).then(() => undefined),
    );
}

/** Whole numbers of zero or more. Platforms show "1.2K", so say what we need. */
function parseCount(value: string): number {
  const number = Number(value.replace(/,/g, ''));
  if (!Number.isInteger(number) || number < 0) {
    throw new InvalidArgumentError(`"${value}" is not a whole number. Write 1200, not 1.2K.`);
  }
  return number;
}
