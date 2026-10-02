import { join } from 'node:path';
import {
  SCHEMA_VERSION,
  assertNoLockedChanges,
  assertValidPlan,
  isContentMachineError,
  planKeyFor,
  resolveItemText,
  type Brand,
  type Clock,
  type FileSystem,
  type Plan,
  type ProcessRunner,
  type RenderLog,
  type RenderLogEntry,
  type SnappedItem,
} from '@content-machine/core';
import type { X264Preset } from '../ffmpeg/args.js';
import { analyzeSources, snapToAudio, type SourceAnalysis } from './analyze.js';
import { fingerprint } from './fingerprint.js';
import { pool } from './pool.js';
import { outputBase, relativeOutputs, type ProjectDirs } from './names.js';
import { renderItem } from './render-item.js';

export interface RenderOptions {
  only: readonly number[] | undefined;
  force: boolean;
  dryRun: boolean;
  hw: boolean;
  concurrency: number;
  snapWindow: number;
  preset: X264Preset;
}

export interface RenderDeps {
  fs: FileSystem;
  runner: ProcessRunner;
  clock: Clock;
  log: (message: string) => void;
}

export type ItemStatus = 'rendered' | 'skipped' | 'planned' | 'failed';

export interface ItemOutcome {
  id: number;
  status: ItemStatus;
  item: SnappedItem;
  error?: string;
}

export interface RenderResult {
  items: ItemOutcome[];
  warnings: string[];
  log: RenderLog;
}

interface Context {
  deps: RenderDeps;
  plan: Plan;
  dirs: ProjectDirs;
  brand: Brand;
  options: RenderOptions;
  analysis: SourceAnalysis;
  previous: Map<number, RenderLogEntry>;
  warnings: string[];
  iconsDir: string | undefined;
}

/** Renders one snapped item unless an identical output already exists. */
async function processItem(
  ctx: Context,
  item: SnappedItem,
): Promise<{ outcome: ItemOutcome; entry?: RenderLogEntry }> {
  const planItem = ctx.plan.items.find((p) => p.id === item.id);
  const text = planItem === undefined ? undefined : resolveItemText(ctx.plan, planItem);
  const info = ctx.analysis.media[item.source];
  const sourcePath = ctx.analysis.paths[item.source];
  if (
    planItem === undefined ||
    text === undefined ||
    info === undefined ||
    sourcePath === undefined
  ) {
    return {
      outcome: { id: item.id, status: 'failed', item, error: 'Item text or source is missing.' },
    };
  }
  const stat = await ctx.deps.fs.stat(sourcePath);
  const planKey = planKeyFor(ctx.plan, planItem);
  const print = fingerprint({
    planKey,
    start: item.start,
    end: item.end,
    brand: ctx.brand,
    hw: ctx.options.hw,
    sourceSize: stat.size,
    sourceMtimeMs: stat.mtimeMs,
  });
  const outputs = relativeOutputs(item.id);
  const outputPath = join(ctx.dirs.root, outputs.video);
  const thumbPath = join(ctx.dirs.root, outputs.thumb);
  const old = ctx.previous.get(item.id);
  const upToDate =
    old?.fingerprint === print &&
    (await ctx.deps.fs.exists(outputPath)) &&
    (await ctx.deps.fs.exists(thumbPath));
  if (upToDate && !ctx.options.force)
    return { outcome: { id: item.id, status: 'skipped', item }, entry: old };
  if (ctx.options.dryRun) return { outcome: { id: item.id, status: 'planned', item } };
  ctx.deps.log(`Rendering ${outputBase(item.id)}.mp4 (${(item.end - item.start).toFixed(1)}s)`);
  try {
    const warnings = await renderItem(ctx.deps, {
      id: item.id,
      text,
      sourcePath,
      source: info,
      start: item.start,
      end: item.end,
      outputPath,
      thumbPath,
      workDir: ctx.dirs.workDir,
      brand: ctx.brand,
      hw: ctx.options.hw,
      preset: ctx.options.preset,
      ...(ctx.iconsDir === undefined ? {} : { iconsDir: ctx.iconsDir }),
    });
    for (const w of warnings) if (!ctx.warnings.includes(w)) ctx.warnings.push(w);
  } catch (error) {
    if (!isContentMachineError(error)) throw error;
    return { outcome: { id: item.id, status: 'failed', item, error: error.message } };
  }
  const entry: RenderLogEntry = {
    id: item.id,
    source: item.source,
    plannedStart: item.plannedStart,
    plannedEnd: item.plannedEnd,
    start: item.start,
    end: item.end,
    startSnapped: item.startSnapped,
    endSnapped: item.endSnapped,
    planKey,
    fingerprint: print,
    output: outputs.video,
    thumb: outputs.thumb,
    renderedAt: ctx.deps.clock.now().toISOString(),
  };
  return { outcome: { id: item.id, status: 'rendered', item }, entry };
}

/**
 * Validates the plan, snaps cuts to the audio, renders what changed and
 * records the result in work/render-log.json. Resumable: finished items
 * with a matching fingerprint are skipped.
 */
export async function renderProject(
  deps: RenderDeps,
  input: {
    plan: Plan;
    dirs: ProjectDirs;
    brand: Brand;
    options: RenderOptions;
    previousLog: RenderLog | undefined;
    iconsDir?: string;
  },
): Promise<RenderResult> {
  const { plan, dirs, options } = input;
  const analysis = await analyzeSources(deps, plan, dirs.sourceDir);
  const report = assertValidPlan(plan, analysis.durations);
  const previousEntries = input.previousLog?.items ?? [];
  assertNoLockedChanges(plan, previousEntries, options.force);
  const snapped = await snapToAudio(deps, plan, analysis, dirs, options.snapWindow);
  const selected =
    options.only === undefined
      ? snapped
      : snapped.filter((item) => options.only?.includes(item.id));
  const ctx: Context = {
    deps,
    plan,
    dirs,
    brand: input.brand,
    options,
    analysis,
    previous: new Map(previousEntries.map((entry) => [entry.id, entry])),
    warnings: [...analysis.warnings, ...report.warnings.map((w) => w.message)],
    iconsDir: input.iconsDir,
  };
  const results = await pool(selected, options.concurrency, (item) => processItem(ctx, item));
  const updated = new Map(ctx.previous);
  for (const result of results)
    if (result.entry !== undefined) updated.set(result.entry.id, result.entry);
  const log: RenderLog = {
    schemaVersion: SCHEMA_VERSION,
    items: [...updated.values()].sort((a, b) => a.id - b.id),
  };
  if (!options.dryRun)
    await deps.fs.writeText(
      join(dirs.workDir, 'render-log.json'),
      `${JSON.stringify(log, null, 2)}\n`,
    );
  return { items: results.map((r) => r.outcome), warnings: ctx.warnings, log };
}
