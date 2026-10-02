import type { Command } from 'commander';
import { Argument, InvalidArgumentError } from 'commander';
import { UserError, sampleSnapshots } from '@content-machine/core';
import { statsTotals, toDashboardSnapshots } from '@content-machine/dashboard';
import type { CommandContext } from '../context.js';
import { writeDashboard } from '../project/dashboard.js';
import { loadSchedule, writeJson } from '../project/files.js';
import { display, money, openProject, parsePositiveInt } from './shared.js';

interface TestDataFlags {
  income: number;
  views?: number;
  days: number;
}

/**
 * Switches made-up statistics on or off for a project, so the dashboard's
 * graphs can be tried before any real numbers exist. Test data lives in its
 * own file (plan/sample-stats.json): real readings are never changed, and
 * `off` deletes only the made-up ones.
 */
export async function runTestData(
  ctx: CommandContext,
  name: string,
  mode: 'on' | 'off',
  flags: TestDataFlags,
): Promise<void> {
  const { paths, project } = await openProject(ctx, name);
  const schedule = await loadSchedule(ctx.fs, paths);
  if (mode === 'off') {
    const had = await ctx.fs.exists(paths.sampleStats);
    await ctx.fs.remove(paths.sampleStats);
    await writeDashboard(ctx, paths, project, schedule);
    ctx.out.result('testdata', { mode, removed: had }, () => [
      had
        ? `Test data is off for ${name}. Real statistics are unchanged.`
        : `${name} had no test data.`,
    ]);
    return;
  }
  if (schedule === undefined || schedule.items.length === 0) {
    throw new UserError(
      'E_FILE_NOT_FOUND',
      `${name} has no scheduled videos to attach test data to.`,
      {
        hint: `Schedule videos first (npm run cm -- schedule ${name}), or try it on the demo: npm run demo`,
      },
    );
  }
  const config = await ctx.config();
  const snapshots = sampleSnapshots({
    items: schedule.items,
    rates: config.rates,
    now: ctx.clock.now().toISOString(),
    days: flags.days,
    target:
      flags.views === undefined
        ? { kind: 'income', amount: flags.income }
        : { kind: 'views', amount: flags.views },
    seed: name,
  });
  await writeJson(ctx.fs, paths.sampleStats, { schemaVersion: 1, project: name, snapshots });
  await writeDashboard(ctx, paths, project, schedule);
  const totals = statsTotals(
    { rates: { ...config.rates }, snapshots: toDashboardSnapshots(name, snapshots), sample: true },
    { platform: 'all', itemKey: 'all' },
  );
  ctx.out.result('testdata', { mode, readings: snapshots.length, totals }, () => [
    `Test data is on for ${name}: ${flags.days} days of made-up readings for ${schedule.items.length} videos.`,
    `About ${money(totals.income)} from ${totals.views.toLocaleString('en-US')} views, split across platforms.`,
    `Saved in ${display(ctx, paths.sampleStats)}. Turn it off with: npm run cm -- testdata ${name} off`,
  ]);
}

/** An amount like "30000", "30,000", "$30k" or "30k" (views or dollars). */
function parseAmount(value: string): number {
  const match = /^\$?([\d,.]+)(k)?$/i.exec(value.trim());
  const amount = match === null ? NaN : Number((match[1] ?? '').replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new InvalidArgumentError(`"${value}" is not an amount. Use 30000 or 30k.`);
  }
  return match?.[2] === undefined ? amount : amount * 1000;
}

export function registerTestData(program: Command, context: () => CommandContext): void {
  program
    .command('testdata')
    .description('Switch made-up statistics on or off, to try the dashboard graphs.')
    .argument('<project>')
    .addArgument(new Argument('<mode>', 'on or off').choices(['on', 'off']))
    .option(
      '--income <dollars>',
      'estimated income it adds up to (default 30k)',
      parseAmount,
      30000,
    )
    .option('--views <n>', 'add up to this many views instead of an income', parseAmount)
    .option('--days <n>', 'how many days of readings', parsePositiveInt, 30)
    .action((name: string, mode: 'on' | 'off', flags: TestDataFlags) =>
      runTestData(context(), name, mode, flags),
    );
}
