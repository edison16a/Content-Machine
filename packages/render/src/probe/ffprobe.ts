import { z } from 'zod';
import type { ProcessRunner } from '@content-machine/core';
import { runTool } from '../ffmpeg/run.js';

/** The facts about a media file the renderer and checker rely on. */
export interface MediaInfo {
  duration: number;
  /** Display size: storage size corrected for pixel aspect and rotation. */
  width: number;
  height: number;
  fps: number;
  videoCodec: string | undefined;
  audioCodec: string | undefined;
  sampleRate: number | undefined;
  videoStreams: number;
  audioStreams: number;
}

const streamSchema = z.object({
  codec_type: z.string().optional(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  sample_aspect_ratio: z.string().optional(),
  avg_frame_rate: z.string().optional(),
  r_frame_rate: z.string().optional(),
  sample_rate: z.string().optional(),
  duration: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  side_data_list: z.array(z.object({ rotation: z.number().optional() }).loose()).optional(),
  disposition: z.object({ attached_pic: z.number().optional() }).loose().optional(),
});
const probeSchema = z.object({
  streams: z.array(streamSchema.loose()).default([]),
  format: z.object({ duration: z.string().optional() }).loose().default({}),
});
type Stream = z.infer<typeof streamSchema>;

/** Parses "30000/1001" or "30" into a number; 0 when unknown. */
export function parseRate(rate: string | undefined): number {
  if (rate === undefined) return 0;
  const [num, den] = rate.split('/').map(Number);
  if (num === undefined || !Number.isFinite(num)) return 0;
  return den === undefined ? num : den > 0 ? num / den : 0;
}

function displaySize(stream: Stream): { width: number; height: number } {
  const width = stream.width ?? 0;
  const height = stream.height ?? 0;
  const sar = parseRate(stream.sample_aspect_ratio?.replace(':', '/'));
  const scaledWidth = sar > 0 ? Math.round(width * sar) : width;
  const rotation =
    stream.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ??
    Number(stream.tags?.rotate ?? 0);
  return Math.abs(rotation) % 180 === 90
    ? { width: height, height: scaledWidth }
    : { width: scaledWidth, height };
}

/** Turns ffprobe's JSON into MediaInfo. Cover art streams are ignored. */
export function parseProbe(json: string): MediaInfo {
  const data = probeSchema.parse(JSON.parse(json));
  const videos = data.streams.filter(
    (s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1,
  );
  const audios = data.streams.filter((s) => s.codec_type === 'audio');
  const video = videos[0];
  const audio = audios[0];
  const size = video === undefined ? { width: 0, height: 0 } : displaySize(video);
  return {
    duration: Number(data.format.duration ?? video?.duration ?? 0),
    ...size,
    fps: parseRate(video?.avg_frame_rate) || parseRate(video?.r_frame_rate),
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
    sampleRate: audio?.sample_rate === undefined ? undefined : Number(audio.sample_rate),
    videoStreams: videos.length,
    audioStreams: audios.length,
  };
}

/** Probes a media file with ffprobe. */
export async function probeMedia(runner: ProcessRunner, path: string): Promise<MediaInfo> {
  const result = await runTool(runner, 'ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    path,
  ]);
  return parseProbe(result.stdout);
}
