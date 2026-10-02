import type { z } from 'zod';
import {
  SCHEMA_VERSION,
  UserError,
  ledgerSchema,
  metadataSchema,
  parseJsonText,
  planSchema,
  projectSchema,
  renderLogSchema,
  scheduleSchema,
  statsSchema,
  type FileSystem,
  type Ledger,
  type Metadata,
  type Plan,
  type Project,
  type RenderLog,
  type Schedule,
  type Stats,
} from '@content-machine/core';
import type { ProjectPaths } from './paths.js';

/** Reads and validates a JSON file, or returns undefined when it does not exist. */
export async function readOptional<S extends z.ZodType>(
  fs: FileSystem,
  schema: S,
  path: string,
  label: string,
): Promise<z.output<S> | undefined> {
  if (!(await fs.exists(path))) return undefined;
  return parseJsonText(schema, await fs.readText(path), label);
}

/** Pretty JSON with a trailing newline, written atomically. */
export async function writeJson(fs: FileSystem, path: string, value: unknown): Promise<void> {
  await fs.writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function loadProject(fs: FileSystem, paths: ProjectPaths): Promise<Project> {
  const project = await readOptional(
    fs,
    projectSchema,
    paths.projectJson,
    `projects/${paths.name}/project.json`,
  );
  if (project === undefined) {
    throw new UserError('E_PROJECT_NOT_FOUND', `There is no project called "${paths.name}".`, {
      hint: `Create it with: npm run cm -- new ${paths.name}`,
    });
  }
  return project;
}

export async function loadPlan(fs: FileSystem, paths: ProjectPaths): Promise<Plan> {
  const plan = await readOptional(fs, planSchema, paths.plan, 'plan/plan.json');
  if (plan === undefined) {
    throw new UserError(
      'E_FILE_NOT_FOUND',
      `projects/${paths.name}/plan/plan.json does not exist yet.`,
      {
        hint: 'Write the plan first (see playbook/steps/02-plan-sequential.md or 03-plan-clip.md), or run autoplan.',
      },
    );
  }
  return plan;
}

export const loadMetadata = (fs: FileSystem, paths: ProjectPaths): Promise<Metadata | undefined> =>
  readOptional(fs, metadataSchema, paths.metadata, 'plan/metadata.json');

export const loadSchedule = (fs: FileSystem, paths: ProjectPaths): Promise<Schedule | undefined> =>
  readOptional(fs, scheduleSchema, paths.schedule, 'plan/schedule.json');

export const loadStats = (fs: FileSystem, paths: ProjectPaths): Promise<Stats | undefined> =>
  readOptional(fs, statsSchema, paths.stats, 'plan/stats.json');

export const loadSampleStats = (fs: FileSystem, paths: ProjectPaths): Promise<Stats | undefined> =>
  readOptional(fs, statsSchema, paths.sampleStats, 'plan/sample-stats.json');

/**
 * The readings the dashboard should show. While test data is on it shows
 * only the test data: mixing made-up numbers into real ones for the same
 * videos would give totals that mean nothing. `sample` says which it is, so
 * the page and the CLI can label it. Real readings are never touched.
 */
export async function loadShownStats(
  fs: FileSystem,
  paths: ProjectPaths,
): Promise<{ snapshots: Stats['snapshots']; sample: boolean }> {
  const sample = await loadSampleStats(fs, paths);
  if (sample !== undefined) return { snapshots: sample.snapshots, sample: true };
  return { snapshots: (await loadStats(fs, paths))?.snapshots ?? [], sample: false };
}

export const loadRenderLog = (
  fs: FileSystem,
  paths: ProjectPaths,
): Promise<RenderLog | undefined> =>
  readOptional(fs, renderLogSchema, paths.renderLog, 'work/render-log.json');

export async function loadLedger(fs: FileSystem, path: string): Promise<Ledger> {
  return (
    (await readOptional(fs, ledgerSchema, path, 'schedule-ledger.json')) ?? {
      schemaVersion: SCHEMA_VERSION,
      entries: [],
    }
  );
}
