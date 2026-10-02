import { join } from 'node:path';
import { SCHEMA_VERSION, fixedClock, localDateAt, type Project } from '@content-machine/core';
import { generateSyntheticSource, pausesEvery } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { withLock } from '../io/lock.js';
import { loadLedger, writeJson } from '../project/files.js';
import { ledgerPaths, projectPaths, type ProjectPaths } from '../project/paths.js';
import { createProject } from '../project/scaffold.js';
import {
  CLIP_SOURCE,
  DEMO_ACCOUNT,
  DEMO_HANDLES,
  DEMO_TIMEZONE,
  SEQUENTIAL_SOURCES,
} from './content.js';

export const DEMO_PROJECTS = ['demo', 'demo-clips'] as const;

/** Creates (or reuses) a demo project with fixed, reproducible settings. */
export async function prepareDemoProject(
  ctx: CommandContext,
  name: string,
  channel: string,
  platform: Project['sourcePlatform'],
): Promise<ProjectPaths> {
  const paths = projectPaths(ctx.root, name);
  if (!(await ctx.fs.exists(paths.projectJson)))
    await createProject(ctx, name, {
      channel,
      platform,
      timezone: DEMO_TIMEZONE,
      account: DEMO_ACCOUNT,
    });
  const config = await ctx.config();
  const project: Project = {
    schemaVersion: SCHEMA_VERSION,
    name,
    channel,
    sourcePlatform: platform,
    account: DEMO_ACCOUNT,
    timezone: DEMO_TIMEZONE,
    weekStartsOn: 'monday',
    slots: config.slots,
    stagger: config.stagger,
    handles: DEMO_HANDLES,
  };
  await writeJson(ctx.fs, paths.projectJson, project);
  for (const file of [paths.schedule, paths.history, paths.metadata, paths.plan])
    await ctx.fs.remove(file);
  return paths;
}

/** Pauses at every planned cut (so snapping has something to find) plus filler pauses. */
function pausesFor(cuts: readonly number[], duration: number, seed: number): number[] {
  const atCuts = cuts.slice(0, -1).map((cut) => cut - 0.3);
  const filler = pausesEvery(duration, 7, seed).filter((p) =>
    atCuts.every((c) => Math.abs(p - c) > 2),
  );
  return [...atCuts, ...filler].sort((a, b) => a - b);
}

/** Writes a synthetic source unless it is already there (re-running the demo is cheap). */
export async function ensureSources(ctx: CommandContext, paths: ProjectPaths): Promise<void> {
  const specs =
    paths.name === 'demo'
      ? SEQUENTIAL_SOURCES.map((s, i) => ({
          file: s.file,
          duration: s.cuts.at(-1) ?? 0,
          colors: s.colors,
          toneHz: s.toneHz,
          pauses: pausesFor(s.cuts, s.cuts.at(-1) ?? 0, i + 1),
        }))
      : [
          {
            file: CLIP_SOURCE.file,
            duration: CLIP_SOURCE.duration,
            colors: CLIP_SOURCE.colors,
            toneHz: CLIP_SOURCE.toneHz,
            pauses: pausesEvery(CLIP_SOURCE.duration, 6, 9),
          },
        ];
  for (const spec of specs) {
    const path = join(paths.sourceDir, spec.file);
    if (await ctx.fs.exists(path)) continue;
    ctx.out.info(`Generating synthetic source ${spec.file} (${spec.duration}s)...`);
    await generateSyntheticSource(ctx.runner, path, {
      ...spec,
      width: 1280,
      height: 720,
      fps: 30,
      pauseLength: 0.6,
    });
  }
}

/** Drops the demo projects' slots from the shared ledger so a re-run starts clean. */
export async function clearDemoLedger(ctx: CommandContext): Promise<void> {
  const files = ledgerPaths(ctx.root);
  await withLock(files.lock, async () => {
    const ledger = await loadLedger(ctx.fs, files.ledger);
    const entries = ledger.entries.filter(
      (e) => !(DEMO_PROJECTS as readonly string[]).includes(e.project),
    );
    await writeJson(ctx.fs, files.ledger, { schemaVersion: SCHEMA_VERSION, entries });
  });
}

/** A clock `days` before now, so the demo calendar has a past as well as a future. */
export function shiftedContext(ctx: CommandContext, days: number): CommandContext {
  const now = ctx.clock.now();
  return { ...ctx, clock: fixedClock(new Date(now.getTime() - days * 86_400_000).toISOString()) };
}

export function todayIn(ctx: CommandContext): string {
  return localDateAt(ctx.clock.now(), DEMO_TIMEZONE);
}
