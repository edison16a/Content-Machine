import type { Command } from 'commander';
import { Option } from 'commander';
import { ToolError } from '@content-machine/core';
import {
  X264_PRESETS,
  renderProject,
  type ItemOutcome,
  type RenderOptions,
  type X264Preset,
} from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { writeDashboard } from '../project/dashboard.js';
import { loadPlan, loadRenderLog, loadSchedule } from '../project/files.js';
import { openProject, parseIds, parsePositiveInt, parseSeconds } from './shared.js';

interface RenderFlags {
  only?: number[];
  dryRun?: boolean;
  force?: boolean;
  hw?: boolean;
  concurrency: number;
  snapWindow: number;
  preset: X264Preset;
}

function describeItem(outcome: ItemOutcome): string {
  const { item } = outcome;
  const cut = `${item.start.toFixed(2)}s to ${item.end.toFixed(2)}s`;
  const snapped =
    item.startSnapped && item.endSnapped ? '' : ' (no pause found near a cut, kept as planned)';
  return `  ${String(outcome.id).padStart(3, '0')} ${outcome.status.padEnd(8)} ${cut}${snapped}${outcome.error === undefined ? '' : `: ${outcome.error}`}`;
}

export async function runRender(
  ctx: CommandContext,
  name: string,
  flags: RenderFlags,
): Promise<ItemOutcome[]> {
  const { paths, project } = await openProject(ctx, name);
  const config = await ctx.config();
  const plan = await loadPlan(ctx.fs, paths);
  const options: RenderOptions = {
    only: flags.only,
    force: flags.force ?? false,
    dryRun: flags.dryRun ?? false,
    hw: flags.hw ?? false,
    concurrency: flags.concurrency,
    snapWindow: flags.snapWindow,
    preset: flags.preset,
  };
  ctx.out.info(
    options.dryRun
      ? 'Checking the plan and cut points...'
      : `Rendering ${plan.items.length} planned videos...`,
  );
  const result = await renderProject(
    { fs: ctx.fs, runner: ctx.runner, clock: ctx.clock, log: (m) => ctx.out.info(m) },
    {
      plan,
      dirs: paths,
      brand: config.brand,
      options,
      previousLog: await loadRenderLog(ctx.fs, paths),
    },
  );
  for (const warning of result.warnings) ctx.out.warn(warning);
  if (!options.dryRun) await writeDashboard(ctx, paths, project, await loadSchedule(ctx.fs, paths));
  const failed = result.items.filter((i) => i.status === 'failed');
  const unsnapped = result.items
    .filter((i) => !i.item.startSnapped || !i.item.endSnapped)
    .map((i) => i.id);
  ctx.out.result(
    'render',
    { items: result.items, warnings: result.warnings, unsnapped, failed: failed.map((f) => f.id) },
    () => [
      ...result.items.map(describeItem),
      `${result.items.filter((i) => i.status === 'rendered').length} rendered, ${result.items.filter((i) => i.status === 'skipped').length} up to date, ${failed.length} failed.`,
    ],
  );
  if (failed.length > 0) {
    throw new ToolError('E_RENDER_FAILED', `${failed.length} item(s) failed to render.`, {
      hint: 'Fix the plan for the listed items, then run render again with --only <ids>.',
      issues: failed.map((f) => ({
        code: 'E_RENDER_FAILED',
        message: `Item ${f.id}: ${f.error ?? 'failed'}`,
        itemId: f.id,
      })),
    });
  }
  return result.items;
}

export function registerRender(program: Command, context: () => CommandContext): void {
  program
    .command('render <project>')
    .description('Validate the plan, snap cuts to pauses, render videos/ and thumbs/. Resumable.')
    .option('--only <ids>', 'render only these item ids, e.g. 3 or 1,4,7 or 2-5', parseIds)
    .option('--dry-run', 'validate and snap without rendering')
    .option('--force', 'render again even if up to date, and allow changing rendered items')
    .option('--hw', 'use the macOS hardware encoder (h264_videotoolbox)')
    .option('--concurrency <n>', 'items to render at once', parsePositiveInt, 1)
    .option('--snap-window <seconds>', 'how far a cut may move to reach a pause', parseSeconds, 2)
    .addOption(
      new Option('--preset <preset>', 'x264 speed preset (medium is the quality default)')
        .choices([...X264_PRESETS])
        .default('medium'),
    )
    .action((name: string, flags: RenderFlags) =>
      runRender(context(), name, flags).then(() => undefined),
    );
}
