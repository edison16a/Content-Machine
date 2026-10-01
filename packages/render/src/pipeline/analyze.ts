import { join } from 'node:path';
import {
  UserError,
  snapPlan,
  type FileSystem,
  type Plan,
  type ProcessRunner,
  type Silence,
  type SnappedItem,
} from '@content-machine/core';
import { probeMedia, type MediaInfo } from '../probe/ffprobe.js';
import { detectSilences } from '../probe/silence.js';

export interface SourceAnalysis {
  media: Record<string, MediaInfo>;
  durations: Record<string, number>;
  warnings: string[];
}

/** Probes every source the plan lists. Missing files are left for validation to report. */
export async function analyzeSources(
  deps: { fs: FileSystem; runner: ProcessRunner },
  plan: Plan,
  sourceDir: string,
): Promise<SourceAnalysis> {
  const media: Record<string, MediaInfo> = {};
  const durations: Record<string, number> = {};
  const warnings: string[] = [];
  for (const source of plan.sources) {
    const path = join(sourceDir, source.file);
    if (!(await deps.fs.exists(path))) continue;
    const info = await probeMedia(deps.runner, path);
    if (info.videoStreams === 0) {
      throw new UserError('E_PLAN_INVALID', `${source.file} has no video stream.`, {
        hint: 'Use the original video file.',
      });
    }
    if (info.audioStreams === 0)
      warnings.push(`${source.file} has no audio; its videos get a silent track.`);
    media[source.file] = info;
    durations[source.file] = info.duration;
  }
  return { media, durations, warnings };
}

/** Detects pauses in each source (cached) and snaps every cut onto them. */
export async function snapToAudio(
  deps: { fs: FileSystem; runner: ProcessRunner },
  plan: Plan,
  analysis: SourceAnalysis,
  dirs: { sourceDir: string; workDir: string },
  window: number,
): Promise<SnappedItem[]> {
  const silences: Record<string, Silence[]> = {};
  for (const source of plan.sources) {
    const info = analysis.media[source.file];
    if (info === undefined || info.audioStreams === 0) continue;
    silences[source.file] = await detectSilences(
      deps,
      join(dirs.sourceDir, source.file),
      info.duration,
      join(dirs.workDir, 'cache'),
    );
  }
  return snapPlan(plan, silences, analysis.durations, { window });
}
