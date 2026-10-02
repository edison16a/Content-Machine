import { join } from 'node:path';
import {
  UserError,
  resolveItemText,
  type Brand,
  type FileSystem,
  type Plan,
  type ProcessRunner,
} from '@content-machine/core';
import { buildPreviewArgs } from '../ffmpeg/args.js';
import { runTool } from '../ffmpeg/run.js';
import { probeMedia } from '../probe/ffprobe.js';
import type { ProjectDirs } from './names.js';
import { prepareJob } from './render-item.js';
import { locateSource } from './sources.js';

/**
 * Renders a single frame of one item, with its overlays, to work/preview.png.
 * No video is encoded, so it takes a second or two.
 */
export async function previewItem(
  deps: { fs: FileSystem; runner: ProcessRunner },
  input: {
    plan: Plan;
    itemId: number;
    at: number;
    dirs: ProjectDirs;
    brand: Brand;
    iconsDir?: string;
  },
): Promise<string> {
  const item = input.plan.items.find((candidate) => candidate.id === input.itemId);
  const text = item === undefined ? undefined : resolveItemText(input.plan, item);
  if (item === undefined || text === undefined) {
    throw new UserError(
      'E_ITEM_NOT_FOUND',
      `Item ${input.itemId} is not in the plan or has no title.`,
    );
  }
  const sourcePath = await locateSource(deps.fs, input.dirs.sourceDir, item.source);
  if (sourcePath === undefined) {
    throw new UserError('E_FILE_NOT_FOUND', `${item.source} is not in the source folder.`, {
      hint: 'Copy the video into source/, or fetch it again from its link.',
    });
  }
  const source = await probeMedia(deps.runner, sourcePath);
  const outPath = join(input.dirs.workDir, 'preview.png');
  await deps.fs.mkdirp(input.dirs.workDir);
  const { job } = await prepareJob(
    deps.fs,
    {
      id: item.id,
      text,
      sourcePath,
      source,
      start: item.start,
      end: item.end,
      outputPath: outPath,
      thumbPath: '',
      workDir: input.dirs.workDir,
      brand: input.brand,
      hw: false,
      ...(input.iconsDir === undefined ? {} : { iconsDir: input.iconsDir }),
    },
    outPath,
  );
  const at = Math.min(Math.max(0, input.at), Math.max(0, item.end - item.start - 0.1));
  await runTool(deps.runner, 'ffmpeg', buildPreviewArgs(job, at, outPath));
  return outPath;
}
