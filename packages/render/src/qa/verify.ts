import {
  CONTIGUITY_TOLERANCE,
  MAX_ITEM_SECONDS,
  type CheckResult,
  type PlanMode,
  type RenderLogEntry,
} from '@content-machine/core';
import type { MediaInfo } from '../probe/ffprobe.js';

/** One frame at 60 fps plus AAC padding: how far an output may drift from its cut. */
export const DURATION_TOLERANCE = 0.1;

/** Problems with a single output's container, streams and length. */
export function verifyOutput(
  entry: RenderLogEntry,
  info: MediaInfo,
  thumbExists: boolean,
): CheckResult {
  const problems: string[] = [];
  if (info.width !== 1080 || info.height !== 1920)
    problems.push(`is ${info.width}x${info.height}, not 1080x1920`);
  if (info.videoCodec !== 'h264')
    problems.push(`video codec is ${info.videoCodec ?? 'missing'}, not H.264`);
  if (info.audioCodec !== 'aac')
    problems.push(`audio codec is ${info.audioCodec ?? 'missing'}, not AAC`);
  if (info.videoStreams !== 1) problems.push(`has ${info.videoStreams} video streams, expected 1`);
  if (info.audioStreams !== 1) problems.push(`has ${info.audioStreams} audio streams, expected 1`);
  if (info.duration > MAX_ITEM_SECONDS)
    problems.push(`runs ${info.duration.toFixed(2)}s, over ${MAX_ITEM_SECONDS}s`);
  const cut = entry.end - entry.start;
  if (Math.abs(info.duration - cut) > DURATION_TOLERANCE) {
    problems.push(`runs ${info.duration.toFixed(2)}s but its cut is ${cut.toFixed(2)}s`);
  }
  if (!thumbExists) problems.push('has no thumbnail');
  return {
    id: entry.id,
    ok: problems.length === 0,
    problems: problems.map((p) => `Item ${entry.id} ${p}.`),
    width: info.width,
    height: info.height,
    duration: info.duration,
    ...(info.videoCodec === undefined ? {} : { videoCodec: info.videoCodec }),
    ...(info.audioCodec === undefined ? {} : { audioCodec: info.audioCodec }),
  };
}

/**
 * Sequential coverage, checked on the exact cut times: per source, parts
 * start at 0, touch end to start, and end at the source's end within 0.1s.
 */
export function verifyCoverage(
  mode: PlanMode,
  entries: readonly RenderLogEntry[],
  durations: Readonly<Record<string, number>>,
): string[] {
  if (mode !== 'sequential') return [];
  const problems: string[] = [];
  const bySource = new Map<string, RenderLogEntry[]>();
  for (const entry of entries)
    bySource.set(entry.source, [...(bySource.get(entry.source) ?? []), entry]);
  for (const [source, parts] of bySource) {
    const sorted = [...parts].sort((a, b) => a.start - b.start);
    if ((sorted[0]?.start ?? 0) > CONTIGUITY_TOLERANCE)
      problems.push(`${source}: the first part does not start at 0.`);
    sorted.forEach((part, index) => {
      const previous = sorted[index - 1];
      if (previous !== undefined && Math.abs(part.start - previous.end) > CONTIGUITY_TOLERANCE) {
        problems.push(`${source}: items ${previous.id} and ${part.id} are not contiguous.`);
      }
    });
    const total = sorted.reduce((sum, part) => sum + (part.end - part.start), 0);
    const duration = durations[source];
    if (duration !== undefined && Math.abs(total - duration) > DURATION_TOLERANCE) {
      problems.push(
        `${source}: parts add up to ${total.toFixed(2)}s but the source runs ${duration.toFixed(2)}s.`,
      );
    }
  }
  return problems;
}
