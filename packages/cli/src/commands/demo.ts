import { join } from 'node:path';
import type { Command } from 'commander';
import { Option } from 'commander';
import { PLATFORMS, addDays, type Schedule } from '@content-machine/core';
import { X264_PRESETS, type X264Preset } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { CLIP_SOURCE, SEQUENTIAL_SOURCES } from '../demo/content.js';
import {
  DEMO_PROJECTS,
  clearDemoLedger,
  ensureSources,
  prepareDemoProject,
  shiftedContext,
  todayIn,
} from '../demo/build.js';
import { clipDemo, sequentialDemo } from '../demo/plans.js';
import { Output } from '../io/output.js';
import { writeJson } from '../project/files.js';
import { projectPaths } from '../project/paths.js';
import { runCheck } from './check.js';
import { runMark } from './mark.js';
import { runRender } from './render.js';
import { runSchedule } from './schedule.js';

interface DemoFlags {
  clean?: boolean;
  preset: X264Preset;
}

/** Days of history the demo calendar shows before "today". */
const PAST_DAYS = 4;

/** Posted before today, scheduled today and tomorrow, one failure, the rest queued. */
async function markStatuses(ctx: CommandContext, schedule: Schedule): Promise<void> {
  const today = todayIn(ctx);
  const ids = (test: (date: string) => boolean): string =>
    schedule.items
      .filter((i) => test(i.date))
      .map((i) => i.id)
      .join(',');
  const past = ids((d) => d < today);
  const soon = ids((d) => d >= today && d <= addDays(today, 1));
  const platform = [...PLATFORMS];
  if (past !== '') {
    await runMark(ctx, 'demo', { item: past, platform, status: 'scheduled' });
    await runMark(ctx, 'demo', { item: past, platform, status: 'posted' });
  }
  if (soon !== '') await runMark(ctx, 'demo', { item: soon, platform, status: 'scheduled' });
  const failing = schedule.items.find((i) => i.date === addDays(today, 2));
  if (failing !== undefined) {
    await runMark(ctx, 'demo', {
      item: String(failing.id),
      platform: ['instagram'],
      status: 'failed',
      note: 'Upload stalled at 90%. Retry tomorrow.',
    });
  }
}

/**
 * Builds two mock projects from synthetic media: a 24-part Sequential project
 * with a realistic mix of statuses, and a small Clip project on the same
 * account (so you can see the scheduler keep their slots apart).
 */
export async function runDemo(ctx: CommandContext, flags: DemoFlags): Promise<void> {
  const quiet: CommandContext = {
    ...ctx,
    out: new Output({ ...ctx.out.options, json: false, quiet: true }),
  };
  const loud: CommandContext = { ...ctx, out: new Output({ ...ctx.out.options, json: false }) };
  if (flags.clean === true)
    for (const name of DEMO_PROJECTS) await ctx.fs.remove(projectPaths(ctx.root, name).root);
  await clearDemoLedger(ctx);
  const render = { concurrency: 1, snapWindow: 2, preset: flags.preset };

  const demo = await prepareDemoProject(
    ctx,
    'demo',
    SEQUENTIAL_SOURCES[0]?.channel ?? '',
    'youtube',
  );
  await ensureSources(loud, demo);
  const sequential = sequentialDemo();
  await writeJson(ctx.fs, demo.plan, sequential.plan);
  await writeJson(ctx.fs, demo.metadata, sequential.metadata);
  await runRender(loud, 'demo', render);
  await runCheck(quiet, 'demo');
  const scheduled = await runSchedule(shiftedContext(quiet, PAST_DAYS + 1), 'demo', {});
  await markStatuses(quiet, scheduled.schedule);
  // Browser tests and screenshots freeze the page clock at this moment.
  await writeJson(ctx.fs, join(demo.workDir, 'demo-clock.json'), { now: ctx.clock.now().toISOString() });

  const clips = await prepareDemoProject(
    ctx,
    'demo-clips',
    CLIP_SOURCE.channel,
    CLIP_SOURCE.platform,
  );
  await ensureSources(loud, clips);
  const clip = clipDemo();
  await writeJson(ctx.fs, clips.plan, clip.plan);
  await writeJson(ctx.fs, clips.metadata, clip.metadata);
  await runRender(loud, 'demo-clips', render);
  await runCheck(quiet, 'demo-clips');
  const clipSchedule = await runSchedule(quiet, 'demo-clips', {});

  const projects = [
    { name: 'demo', dashboard: demo.dashboard, videos: scheduled.schedule.items.length },
    { name: 'demo-clips', dashboard: clips.dashboard, videos: clipSchedule.schedule.items.length },
  ];
  ctx.out.result('demo', { projects }, () => [
    ...projects.map((p) => `${p.name}: ${p.videos} videos. Dashboard: ${p.dashboard}`),
    'Open it with: npm run cm -- open demo',
  ]);
}

export function registerDemo(program: Command, context: () => CommandContext): void {
  program
    .command('demo')
    .description('Build mock projects (projects/demo, projects/demo-clips) from synthetic video.')
    .option('--clean', 'delete the demo projects first and regenerate everything')
    .addOption(
      new Option('--preset <preset>', 'x264 preset for the demo renders')
        .choices([...X264_PRESETS])
        .default('veryfast'),
    )
    .action((flags: DemoFlags) => runDemo(context(), flags));
}
