import { join } from 'node:path';
import type { Command } from 'commander';
import {
  STEM_PATTERN,
  UserError,
  channelOf,
  chooseSubtitles,
  downloadStem,
  formatClock,
  parseVideoUrl,
  platformOf,
  type Project,
  type SourcePlatform,
} from '@content-machine/core';
import { locateSource } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { adoptCaptions, type CaptionOutcome } from '../download/captions.js';
import { downloadVideo, readVideoInfo, requireYtDlp } from '../download/ytdlp.js';
import { writeJson } from '../project/files.js';
import type { ProjectPaths } from '../project/paths.js';
import { display, openProject } from './shared.js';

interface FetchOptions {
  name?: string;
  captions: boolean;
}

/** What Claude needs to carry on with intake without asking the user again. */
export interface FetchResult {
  url: string;
  video: string;
  path: string;
  title: string;
  channel: string;
  platform: SourcePlatform;
  duration: number | null;
  transcript: string | null;
  alreadyDownloaded: boolean;
}

function stemFrom(options: FetchOptions, title: string | null | undefined, id: string): string {
  if (options.name === undefined) return downloadStem(title, id);
  if (!STEM_PATTERN.test(options.name)) {
    throw new UserError('E_USAGE', `"${options.name}" is not a usable file name.`, {
      hint: 'Use lowercase letters, digits and hyphens, like "tiny-house-tour".',
    });
  }
  return options.name;
}

/**
 * Fills in the channel and platform the first time a project gets a video,
 * so the credit line is right without anyone typing it. A channel you set
 * yourself is left alone.
 */
async function rememberSource(
  ctx: CommandContext,
  paths: ProjectPaths,
  project: Project,
  channel: string,
  platform: SourcePlatform,
): Promise<void> {
  if (project.channel !== '' || channel === '') return;
  await writeJson(ctx.fs, paths.projectJson, { ...project, channel, sourcePlatform: platform });
}

function captionLine(ctx: CommandContext, outcome: CaptionOutcome): string {
  switch (outcome.kind) {
    case 'saved':
      return `Transcript: ${display(ctx, outcome.path)}`;
    case 'kept-existing':
      return `Transcript: kept your own ${display(ctx, outcome.path)}`;
    case 'unreadable':
      return `Transcript: captions came as ${outcome.file}, which cannot be read. Paste the transcript instead.`;
    case 'none':
      return 'Transcript: this video has no captions. Paste one, or use autoplan for Sequential.';
  }
}

/** Downloads a video from a link into the project's source/downloads folder. */
export async function runFetch(
  ctx: CommandContext,
  name: string,
  link: string,
  options: FetchOptions,
): Promise<FetchResult> {
  const url = parseVideoUrl(link);
  const { paths, project } = await openProject(ctx, name);
  const version = await requireYtDlp(ctx.runner);
  ctx.out.info('Reading the link…');
  const info = await readVideoInfo(ctx.runner, url, version);
  const stem = stemFrom(options, info.title, info.id);
  const video = `${stem}.mp4`;
  const existing = await locateSource(ctx.fs, paths.sourceDir, video);
  let captions: CaptionOutcome = { kind: 'none' };
  if (existing === undefined) {
    const subtitles = options.captions ? chooseSubtitles(info) : undefined;
    await ctx.fs.mkdirp(paths.downloadsDir);
    ctx.out.info(`Downloading "${info.title ?? info.id}"…`);
    await downloadVideo(ctx.runner, { url, version, folder: paths.downloadsDir, stem, subtitles });
    if (!(await ctx.fs.exists(join(paths.downloadsDir, video)))) {
      throw new UserError('E_FILE_NOT_FOUND', `yt-dlp finished but ${video} is missing.`, {
        hint: 'Run the command again. If it keeps happening, check that ffmpeg is installed.',
      });
    }
    captions = await adoptCaptions(ctx.fs, paths.downloadsDir, stem, subtitles);
  }
  const path = existing ?? join(paths.downloadsDir, video);
  const transcript =
    captions.kind === 'saved' || captions.kind === 'kept-existing' ? captions.path : null;
  const channel = channelOf(info);
  const platform = platformOf(info);
  await rememberSource(ctx, paths, project, channel, platform);
  const result: FetchResult = {
    url,
    video,
    path,
    title: info.title ?? '',
    channel,
    platform,
    duration: info.duration ?? null,
    transcript,
    alreadyDownloaded: existing !== undefined,
  };
  ctx.out.result('fetch', result, () => [
    `${existing === undefined ? 'Saved' : 'Already downloaded'}: ${display(ctx, path)}`,
    `"${result.title}" from ${channel === '' ? 'an unknown channel' : channel} on ${platform}` +
      (result.duration === null ? '' : `, ${formatClock(result.duration)} long`),
    existing === undefined ? captionLine(ctx, captions) : 'Transcript: unchanged',
    `Next: npm run cm -- transcript ${name} ${video}`,
  ]);
  return result;
}

export function registerFetch(program: Command, context: () => CommandContext): void {
  program
    .command('fetch <project> <url>')
    .description('Download a video and its captions from a link into source/downloads (yt-dlp).')
    .option('--name <file>', 'file name to save as, without .mp4 (default: from the title)')
    .option('--no-captions', 'skip downloading captions')
    .action((name: string, url: string, options: FetchOptions) =>
      runFetch(context(), name, url, options).then(() => undefined),
    );
}
