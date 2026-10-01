import type { Layout } from '@content-machine/core';
import { MAX_FPS, buildFilterGraph } from './graph.js';

/** Everything one ffmpeg run needs to turn a cut of a source into a finished short. */
export interface RenderJob {
  sourcePath: string;
  start: number;
  duration: number;
  outputPath: string;
  layout: Layout;
  titlePath: string;
  creditPath: string;
  shadowPath: string | undefined;
  titleY: number;
  creditY: number;
  /** Source frame rate; output keeps it, capped at 60. */
  fps: number;
  /** Source audio sample rate, or undefined when the source has no audio. */
  sampleRate: number | undefined;
  hw: boolean;
  /** x264 preset. Medium by default; faster presets trade size for speed, not looks. */
  preset?: X264Preset;
}

export const X264_PRESETS = [
  'ultrafast',
  'superfast',
  'veryfast',
  'faster',
  'fast',
  'medium',
  'slow',
  'slower',
  'veryslow',
] as const;
export type X264Preset = (typeof X264_PRESETS)[number];

/** Encoder settings. Audio is encoded with no filters of any kind. */
export const ENCODE = {
  crf: '18',
  preset: 'medium',
  audioBitrate: '256k',
  hwBitrate: '12M',
  silentRate: 48000,
} as const;

const seconds = (value: number): string => value.toFixed(3);

function videoCodecArgs(hw: boolean, preset: X264Preset): string[] {
  return hw
    ? ['-c:v', 'h264_videotoolbox', '-profile:v', 'high', '-b:v', ENCODE.hwBitrate]
    : ['-c:v', 'libx264', '-profile:v', 'high', '-crf', ENCODE.crf, '-preset', preset];
}

/** AAC-LC at the source's own sample rate. No -af, no loudnorm, no volume. */
export function audioCodecArgs(sampleRate: number): string[] {
  return [
    '-c:a',
    'aac',
    '-profile:a',
    'aac_low',
    '-b:a',
    ENCODE.audioBitrate,
    '-ar',
    String(sampleRate),
  ];
}

function loopedImage(path: string, fps: string): string[] {
  return ['-loop', '1', '-framerate', fps, '-i', path];
}

/**
 * Builds the ffmpeg argument array for one item. Seeking with -ss before -i
 * is frame accurate because we re-encode. A source without audio gets a
 * silent track so the output still has one, as browsers expect.
 */
export function buildRenderArgs(job: RenderJob): string[] {
  const fps = seconds(Math.min(job.fps > 0 ? job.fps : 30, MAX_FPS));
  const inputs = [
    '-ss',
    seconds(job.start),
    '-i',
    job.sourcePath,
    ...loopedImage(job.titlePath, fps),
    ...loopedImage(job.creditPath, fps),
  ];
  let next = 3;
  const shadow = job.shadowPath === undefined ? undefined : next++;
  if (job.shadowPath !== undefined) inputs.push(...loopedImage(job.shadowPath, fps));
  const silent = job.sampleRate === undefined ? next : undefined;
  if (silent !== undefined)
    inputs.push('-f', 'lavfi', '-i', `anullsrc=r=${ENCODE.silentRate}:cl=stereo`);
  const graph = buildFilterGraph({
    layout: job.layout,
    titleY: job.titleY,
    creditY: job.creditY,
    inputs: { title: 1, credit: 2, shadow },
    capFps: job.fps > MAX_FPS,
  });
  return [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-loglevel',
    'error',
    ...inputs,
    '-filter_complex',
    graph,
    '-map',
    '[vout]',
    '-map',
    silent === undefined ? '0:a:0' : `${silent}:a:0`,
    '-t',
    seconds(job.duration),
    ...videoCodecArgs(job.hw, job.preset ?? ENCODE.preset),
    '-pix_fmt',
    'yuv420p',
    ...audioCodecArgs(job.sampleRate ?? ENCODE.silentRate),
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-movflags',
    '+faststart',
    job.outputPath,
  ];
}

/**
 * Same graph as the real render, but writes one PNG frame `at` seconds into
 * the clip. Used by `preview` so titles can be checked without encoding video.
 */
export function buildPreviewArgs(job: RenderJob, at: number, outputPath: string): string[] {
  const full = buildRenderArgs({ ...job, sampleRate: job.sampleRate ?? ENCODE.silentRate });
  const graphIndex = full.indexOf('-filter_complex');
  const head = full.slice(0, graphIndex + 2);
  return [
    ...head,
    '-map',
    '[vout]',
    '-ss',
    seconds(at),
    '-frames:v',
    '1',
    '-update',
    '1',
    outputPath,
  ];
}
