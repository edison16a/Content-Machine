import { join } from 'node:path';
import type { Command } from 'commander';
import { ToolError, UserError, type CheckReport } from '@content-machine/core';
import { analyzeSources, checkProject } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { loadPlan, loadRenderLog } from '../project/files.js';
import { display, openProject } from './shared.js';

export async function runCheck(ctx: CommandContext, name: string): Promise<CheckReport> {
  const { paths } = await openProject(ctx, name);
  const plan = await loadPlan(ctx.fs, paths);
  const log = await loadRenderLog(ctx.fs, paths);
  if (log === undefined || log.items.length === 0) {
    throw new UserError('E_FILE_NOT_FOUND', 'Nothing has been rendered yet.', {
      hint: `Run: npm run cm -- render ${name}`,
    });
  }
  const sources = await analyzeSources({ fs: ctx.fs, runner: ctx.runner }, plan, paths.sourceDir);
  ctx.out.info(`Checking ${log.items.length} videos...`);
  const report = await checkProject(
    { fs: ctx.fs, runner: ctx.runner, clock: ctx.clock },
    {
      mode: plan.mode,
      log,
      root: paths.root,
      workDir: paths.workDir,
      sourceDurations: sources.durations,
    },
  );
  ctx.out.result('check', report, () => [
    report.ok ? `All ${report.items.length} videos pass.` : `${report.problems.length} problem(s):`,
    ...report.problems.map((p) => `  - ${p}`),
    `Contact sheets: ${report.sheets.join(', ')}`,
    `Frames: ${display(ctx, join(paths.workDir, 'qa', 'frames'))}/`,
  ]);
  if (!report.ok) {
    throw new ToolError(
      'E_CHECK_FAILED',
      `${report.problems.length} problem(s) found in the rendered videos.`,
      {
        hint: 'Re-render the listed items with: npm run cm -- render <project> --only <ids> --force',
        issues: report.problems.map((message) => ({ code: 'E_CHECK_FAILED', message })),
      },
    );
  }
  return report;
}

export function registerCheck(program: Command, context: () => CommandContext): void {
  program
    .command('check <project>')
    .description('Verify every output and write QA frames and contact sheets to work/qa/.')
    .action((name: string) => runCheck(context(), name).then(() => undefined));
}
