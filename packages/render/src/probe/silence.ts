import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import {
  mergeSilences,
  type FileSystem,
  type ProcessRunner,
  type Silence,
} from '@content-machine/core';
import { runTool } from '../ffmpeg/run.js';

/** Two passes: long pauses, and the short breaths between sentences. */
export const SILENCE_PASSES = ['noise=-35dB:d=0.3', 'noise=-30dB:d=0.18'] as const;

/**
 * Reads silencedetect's log lines into intervals. A silence still open at
 * the end of the file closes at `duration`.
 */
export function parseSilenceLog(log: string, duration: number): Silence[] {
  const silences: Silence[] = [];
  let open: number | undefined;
  for (const line of log.split('\n')) {
    const start = /silence_start:\s*(-?[\d.]+)/.exec(line);
    if (start?.[1] !== undefined) open = Math.max(0, Number(start[1]));
    const end = /silence_end:\s*([\d.]+)/.exec(line);
    if (end?.[1] !== undefined && open !== undefined) {
      silences.push({ start: open, end: Number(end[1]) });
      open = undefined;
    }
  }
  if (open !== undefined && duration > open) silences.push({ start: open, end: duration });
  return silences;
}

const cacheSchema = z.object({
  key: z.string(),
  silences: z.array(z.object({ start: z.number(), end: z.number() })),
});

/**
 * Detects pauses in a source's audio. Analysis only: nothing here touches the
 * output audio. Results are cached by file size and modification time.
 */
export async function detectSilences(
  deps: { runner: ProcessRunner; fs: FileSystem },
  sourcePath: string,
  duration: number,
  cacheDir: string,
): Promise<Silence[]> {
  const info = await deps.fs.stat(sourcePath);
  const key = createHash('sha256')
    .update(`${sourcePath}|${info.size}|${info.mtimeMs}|${SILENCE_PASSES.join(';')}`)
    .digest('hex');
  const cachePath = join(cacheDir, `silence-${key.slice(0, 16)}.json`);
  if (await deps.fs.exists(cachePath)) {
    const cached = cacheSchema.safeParse(JSON.parse(await deps.fs.readText(cachePath)));
    if (cached.success && cached.data.key === key) return cached.data.silences;
  }
  const passes: Silence[][] = [];
  for (const settings of SILENCE_PASSES) {
    const args = [
      '-hide_banner',
      '-nostats',
      '-i',
      sourcePath,
      '-vn',
      '-af',
      `silencedetect=${settings}`,
      '-f',
      'null',
      '-',
    ];
    const result = await runTool(deps.runner, 'ffmpeg', args);
    passes.push(parseSilenceLog(result.stderr, duration));
  }
  const silences = mergeSilences(...passes);
  await deps.fs.writeText(cachePath, JSON.stringify({ key, silences }));
  return silences;
}
