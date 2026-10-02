import { join } from 'node:path';
import type { Command } from 'commander';
import { Option } from 'commander';
import {
  SCHEMA_VERSION,
  SOURCE_PLATFORMS,
  UserError,
  autoplan,
  planSchema,
  splitWords,
  type Plan,
  type SourcePlatform,
} from '@content-machine/core';
import { detectSilences, locateSource, probeMedia } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { readOptional, writeJson } from '../project/files.js';
import { safeJoin } from '../project/paths.js';
import { openProject } from './shared.js';

interface AutoplanFlags {
  title: string;
  channel: string;
  platform: SourcePlatform;
  accent?: string;
}

/** Default accent: the first number in the title, otherwise its longest word. */
export function defaultAccent(title: string): string {
  const words = splitWords(title);
  return (
    words.find((w) => /\d/.test(w)) ?? [...words].sort((a, b) => b.length - a.length)[0] ?? title
  );
}

/**
 * Fallback planner for when there is no transcript: splits a whole video into
 * Sequential parts at pauses in the audio and appends them to the plan.
 */
export async function runAutoplan(
  ctx: CommandContext,
  name: string,
  video: string,
  flags: AutoplanFlags,
): Promise<Plan> {
  const { paths } = await openProject(ctx, name);
  safeJoin(paths.sourceDir, video);
  const videoPath = await locateSource(ctx.fs, paths.sourceDir, video);
  if (videoPath === undefined)
    throw new UserError('E_FILE_NOT_FOUND', `${video} is not in the source folder.`, {
      hint: 'Copy the video into source/ first, or fetch it from its link.',
    });
  const existing = await readOptional(ctx.fs, planSchema, paths.plan, 'plan/plan.json');
  if (existing !== undefined && existing.mode !== 'sequential')
    throw new UserError('E_USAGE', 'autoplan only appends to a Sequential plan.', {
      hint: 'Start a new project for this video.',
    });
  if (existing?.sources.some((s) => s.file === video) === true)
    throw new UserError('E_USAGE', `${video} is already in the plan.`, {
      hint: 'Edit plan/plan.json instead.',
    });
  const media = await probeMedia(ctx.runner, videoPath);
  ctx.out.info('Listening for pauses...');
  const silences = await detectSilences(
    { fs: ctx.fs, runner: ctx.runner },
    videoPath,
    media.duration,
    join(paths.workDir, 'cache'),
  );
  const parts = autoplan(media.duration, silences);
  const firstId = Math.max(0, ...(existing?.items.map((i) => i.id) ?? [])) + 1;
  const plan: Plan = {
    schemaVersion: SCHEMA_VERSION,
    mode: 'sequential',
    accentColor: existing?.accentColor ?? (await ctx.config()).brand.accentColor,
    sources: [
      ...(existing?.sources ?? []),
      {
        file: video,
        channel: flags.channel,
        platform: flags.platform,
        title: flags.title,
        accent: flags.accent ?? defaultAccent(flags.title),
      },
    ],
    items: [
      ...(existing?.items ?? []),
      ...parts.map((part, i) => ({
        id: firstId + i,
        source: video,
        start: Number(part.start.toFixed(3)),
        end: Number(part.end.toFixed(3)),
        note: part.hardCut ? 'hard cut: no pause found nearby' : 'split at a pause',
      })),
    ],
  };
  await writeJson(ctx.fs, paths.plan, plan);
  const hard = parts.filter((p) => p.hardCut).length;
  ctx.out.result(
    'autoplan',
    { parts: parts.length, hardCuts: hard, firstId, plan: paths.plan },
    () => [
      `Planned ${parts.length} parts (ids ${firstId} to ${firstId + parts.length - 1}) from ${video}.`,
      hard > 0
        ? `${hard} part(s) end on a hard cut because the audio never paused. Check them in the preview.`
        : 'Every cut lands on a pause.',
    ],
  );
  return plan;
}

export function registerAutoplan(program: Command, context: () => CommandContext): void {
  program
    .command('autoplan <project> <video>')
    .description('No transcript? Write a Sequential plan by splitting the video at pauses.')
    .requiredOption('--title <title>', 'the video title shown on every part')
    .requiredOption('--channel <name>', 'channel the video comes from')
    .addOption(
      new Option('--platform <platform>', 'platform the video comes from')
        .choices([...SOURCE_PLATFORMS])
        .makeOptionMandatory(),
    )
    .option(
      '--accent <words>',
      'word(s) of the title to color (default: a number or the longest word)',
    )
    .action((name: string, video: string, flags: AutoplanFlags) =>
      runAutoplan(context(), name, video, flags).then(() => undefined),
    );
}
