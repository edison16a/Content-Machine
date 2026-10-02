import { basename, dirname, extname, join } from 'node:path';
import type { Command } from 'commander';
import { UserError, formatClock, parseTranscript, type Transcript } from '@content-machine/core';
import { locateSource, probeMedia } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { writeJson } from '../project/files.js';
import { safeJoin } from '../project/paths.js';
import { display, openProject } from './shared.js';

/**
 * Accepts both "video1.mp4.transcript.txt" and "video1.transcript.txt",
 * looked up next to the video (source/ or source/downloads/).
 */
async function findTranscript(ctx: CommandContext, folder: string, video: string): Promise<string> {
  const stem = basename(video, extname(video));
  for (const name of [`${video}.transcript.txt`, `${stem}.transcript.txt`]) {
    const path = safeJoin(folder, name);
    if (await ctx.fs.exists(path)) return path;
  }
  throw new UserError('E_FILE_NOT_FOUND', `No transcript found for ${video}.`, {
    hint: `Paste the transcript into source/${stem}.transcript.txt (YouTube: Show transcript, select all, copy).`,
  });
}

export async function runTranscript(
  ctx: CommandContext,
  name: string,
  video: string,
): Promise<Transcript> {
  const { paths } = await openProject(ctx, name);
  safeJoin(paths.sourceDir, video);
  const videoPath = await locateSource(ctx.fs, paths.sourceDir, video);
  if (videoPath === undefined) {
    throw new UserError(
      'E_FILE_NOT_FOUND',
      `${video} is not in ${display(ctx, paths.sourceDir)}/.`,
      { hint: 'Copy the video into the source folder, or fetch it from its link.' },
    );
  }
  const media = await probeMedia(ctx.runner, videoPath);
  const transcriptPath = await findTranscript(ctx, dirname(videoPath), video);
  const transcript = parseTranscript(await ctx.fs.readText(transcriptPath), media.duration);
  const out = join(paths.workDir, 'transcripts', `${basename(video, extname(video))}.json`);
  await writeJson(ctx.fs, out, transcript);
  for (const warning of transcript.warnings) ctx.out.warn(warning);
  const { stats } = transcript;
  ctx.out.result(
    'transcript',
    {
      ...stats,
      format: transcript.format,
      warnings: transcript.warnings,
      json: out,
      videoDuration: media.duration,
    },
    () => [
      `${transcript.format} transcript: ${stats.segments} segments from ${formatClock(stats.firstTimestamp)} to ${formatClock(stats.lastTimestamp)}`,
      `Video length: ${formatClock(media.duration)} (${media.duration.toFixed(2)}s), ${Math.round(stats.coverage * 100)}% covered`,
      `Parsed segments: ${display(ctx, out)}`,
    ],
  );
  return transcript;
}

export function registerTranscript(program: Command, context: () => CommandContext): void {
  program
    .command('transcript <project> <video>')
    .description('Parse source/<video>.transcript.txt and report its stats and warnings.')
    .action((name: string, video: string) =>
      runTranscript(context(), name, video).then(() => undefined),
    );
}
