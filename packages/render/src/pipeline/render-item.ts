import { join } from 'node:path';
import {
  computeLayout,
  type Brand,
  type FileSystem,
  type ProcessRunner,
  type ResolvedText,
} from '@content-machine/core';
import { buildRenderArgs, type RenderJob, type X264Preset } from '../ffmpeg/args.js';
import { runTool } from '../ffmpeg/run.js';
import { prepareOverlays } from '../overlays/prepare.js';
import type { MediaInfo } from '../probe/ffprobe.js';
import { makeThumbnail } from './thumbnail.js';

export interface ItemRenderSpec {
  id: number;
  text: ResolvedText;
  sourcePath: string;
  source: MediaInfo;
  start: number;
  end: number;
  outputPath: string;
  thumbPath: string;
  workDir: string;
  brand: Brand;
  hw: boolean;
  preset?: X264Preset;
  iconsDir?: string;
}

/** Builds the ffmpeg job for an item: layout, overlay PNGs and timing. */
export async function prepareJob(
  fs: FileSystem,
  spec: ItemRenderSpec,
  outputPath: string,
): Promise<{ job: RenderJob; warnings: string[] }> {
  const layout = computeLayout(spec.source.width, spec.source.height);
  const overlays = await prepareOverlays(fs, {
    text: spec.text,
    brand: spec.brand,
    layout,
    cacheDir: join(spec.workDir, 'cache'),
    ...(spec.iconsDir === undefined ? {} : { iconsDir: spec.iconsDir }),
  });
  const job: RenderJob = {
    sourcePath: spec.sourcePath,
    start: spec.start,
    duration: spec.end - spec.start,
    outputPath,
    layout,
    titlePath: overlays.titlePath,
    creditPath: overlays.creditPath,
    shadowPath: overlays.shadowPath,
    titleY: overlays.titleY,
    creditY: overlays.creditY,
    fps: spec.source.fps,
    sampleRate: spec.source.sampleRate,
    hw: spec.hw,
    ...(spec.preset === undefined ? {} : { preset: spec.preset }),
  };
  return { job, warnings: overlays.warnings };
}

/**
 * Renders one item to a temp file, moves it into `videos/` only when ffmpeg
 * succeeded, then writes its thumbnail. A failed render never leaves a
 * half-written video where the dashboard would find it.
 */
export async function renderItem(
  deps: { fs: FileSystem; runner: ProcessRunner },
  spec: ItemRenderSpec,
): Promise<string[]> {
  const tmpDir = join(spec.workDir, 'tmp');
  await deps.fs.mkdirp(tmpDir);
  const tmpOutput = join(tmpDir, `render-${spec.id}.mp4`);
  const { job, warnings } = await prepareJob(deps.fs, spec, tmpOutput);
  try {
    await runTool(deps.runner, 'ffmpeg', buildRenderArgs(job));
    await deps.fs.rename(tmpOutput, spec.outputPath);
  } finally {
    await deps.fs.remove(tmpOutput);
  }
  await makeThumbnail(deps, spec.outputPath, spec.thumbPath, tmpDir);
  return warnings;
}
