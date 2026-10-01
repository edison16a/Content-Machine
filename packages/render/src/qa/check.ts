import { join } from 'node:path';
import {
  SCHEMA_VERSION,
  type CheckReport,
  type CheckResult,
  type Clock,
  type FileSystem,
  type PlanMode,
  type ProcessRunner,
  type RenderLog,
} from '@content-machine/core';
import { outputBase } from '../pipeline/names.js';
import { extractFrame } from '../pipeline/thumbnail.js';
import { probeMedia } from '../probe/ffprobe.js';
import { SHEET, drawContactSheet, type SheetCell } from './sheets.js';
import { verifyCoverage, verifyOutput } from './verify.js';

export interface CheckInput {
  mode: PlanMode;
  log: RenderLog;
  root: string;
  workDir: string;
  /** Source durations, for the Sequential coverage check. */
  sourceDurations: Readonly<Record<string, number>>;
}

/** Writes first-second, middle and last frames of one video for review. */
async function writeFrames(
  runner: ProcessRunner,
  video: string,
  framesDir: string,
  id: number,
  duration: number,
): Promise<void> {
  const base = outputBase(id);
  const points: Array<[string, number]> = [
    ['1s', 1],
    ['mid', duration / 2],
    ['end', Math.max(0, duration - 0.5)],
  ];
  for (const [label, at] of points)
    await extractFrame(runner, video, at, join(framesDir, `${base}_${label}.jpg`));
}

/** Contact sheets from the thumbnails, six per sheet. */
async function writeSheets(
  fs: FileSystem,
  root: string,
  qaDir: string,
  log: RenderLog,
): Promise<string[]> {
  const cells: SheetCell[] = [];
  for (const entry of log.items) {
    const thumb = join(root, entry.thumb);
    if (await fs.exists(thumb)) cells.push({ id: entry.id, image: await fs.readBytes(thumb) });
  }
  const sheets: string[] = [];
  const perSheet = SHEET.columns * SHEET.rows;
  for (let start = 0; start < cells.length; start += perSheet) {
    const name = `sheet_${String(sheets.length + 1).padStart(2, '0')}.jpg`;
    await fs.writeBytes(
      join(qaDir, name),
      await drawContactSheet(cells.slice(start, start + perSheet)),
    );
    sheets.push(`work/qa/${name}`);
  }
  return sheets;
}

/**
 * Verifies every rendered output with ffprobe, writes QA frames and contact
 * sheets to work/qa/, and saves the report to work/check.json.
 */
export async function checkProject(
  deps: { fs: FileSystem; runner: ProcessRunner; clock: Clock },
  input: CheckInput,
): Promise<CheckReport> {
  const qaDir = join(input.workDir, 'qa');
  const framesDir = join(qaDir, 'frames');
  await deps.fs.remove(qaDir);
  await deps.fs.mkdirp(framesDir);
  const results: CheckResult[] = [];
  for (const entry of input.log.items) {
    const video = join(input.root, entry.output);
    if (!(await deps.fs.exists(video))) {
      results.push({
        id: entry.id,
        ok: false,
        problems: [`Item ${entry.id} has no video at ${entry.output}.`],
      });
      continue;
    }
    const info = await probeMedia(deps.runner, video);
    results.push(verifyOutput(entry, info, await deps.fs.exists(join(input.root, entry.thumb))));
    await writeFrames(deps.runner, video, framesDir, entry.id, info.duration);
  }
  const coverage = verifyCoverage(input.mode, input.log.items, input.sourceDurations);
  const sheets = await writeSheets(deps.fs, input.root, qaDir, input.log);
  const problems = [...results.flatMap((r) => r.problems), ...coverage];
  const report: CheckReport = {
    schemaVersion: SCHEMA_VERSION,
    ok: problems.length === 0,
    checkedAt: deps.clock.now().toISOString(),
    items: results,
    problems,
    sheets,
  };
  await deps.fs.writeText(
    join(input.workDir, 'check.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}
