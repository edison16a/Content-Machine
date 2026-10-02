import {
  SCHEMA_VERSION,
  UserError,
  ValidationError,
  assignSlots,
  assignmentsOf,
  buildSchedule,
  checkReportSchema,
  splitForRebuild,
  type Assignment,
  type Metadata,
  type Project,
  type RenderLogEntry,
  type SchedulableItem,
  type Schedule,
} from '@content-machine/core';
import { join } from 'node:path';
import type { CommandContext } from '../context.js';
import { withLock } from '../io/lock.js';
import {
  loadLedger,
  loadMetadata,
  loadPlan,
  loadRenderLog,
  loadSchedule,
  readOptional,
  writeJson,
} from './files.js';
import { ledgerPaths, type ProjectPaths } from './paths.js';

export interface ScheduleOutcome {
  schedule: Schedule;
  added: Assignment[];
  warnings: string[];
}

/** Rendered items that exist on disk, are still in the plan and did not fail check. */
async function candidates(
  ctx: CommandContext,
  paths: ProjectPaths,
  warnings: string[],
): Promise<RenderLogEntry[]> {
  const plan = await loadPlan(ctx.fs, paths);
  const log = await loadRenderLog(ctx.fs, paths);
  if (log === undefined)
    throw new UserError('E_FILE_NOT_FOUND', 'Nothing has been rendered yet.', {
      hint: `Run: npm run cm -- render ${paths.name}`,
    });
  const check = await readOptional(ctx.fs, checkReportSchema, paths.checkReport, 'work/check.json');
  const failing = new Set(check?.items.filter((i) => !i.ok).map((i) => i.id) ?? []);
  const result: RenderLogEntry[] = [];
  for (const entry of log.items) {
    if (!plan.items.some((item) => item.id === entry.id)) continue;
    if (failing.has(entry.id))
      warnings.push(`Item ${entry.id} failed check, so it is left out of the schedule.`);
    else if (await ctx.fs.exists(join(paths.root, entry.output))) result.push(entry);
  }
  return result;
}

/** Joins render results with titles and captions. Every item needs metadata. */
function schedulable(
  entries: readonly RenderLogEntry[],
  metadata: Metadata | undefined,
  notes: Map<number, string>,
): SchedulableItem[] {
  const byId = new Map(metadata?.items.map((m) => [m.id, m]) ?? []);
  const missing = entries.filter((e) => !byId.has(e.id)).map((e) => e.id);
  if (missing.length > 0) {
    throw new ValidationError(
      'E_METADATA_MISSING',
      `plan/metadata.json has no post title or captions for item(s) ${missing.join(', ')}.`,
      {
        hint: 'Add an entry for each id (see playbook/steps/05-captions-and-schedule.md), then run schedule again.',
        issues: missing.map((id) => ({
          code: 'E_METADATA_MISSING',
          message: `Item ${id} has no metadata.`,
          itemId: id,
        })),
      },
    );
  }
  return entries.map((entry) => {
    const meta = byId.get(entry.id);
    return {
      id: entry.id,
      video: entry.output,
      thumb: entry.thumb,
      duration: Number((entry.end - entry.start).toFixed(3)),
      postTitle: meta?.postTitle ?? '',
      captions: meta?.captions ?? { tiktok: '', instagram: '', youtube: '' },
      source: entry.source,
      sourceStart: entry.start,
      sourceEnd: entry.end,
      note: notes.get(entry.id) ?? '',
    };
  });
}

/**
 * Gives every rendered, unscheduled item a fixed slot and writes
 * schedule.json and the shared ledger. Both are locked for the duration.
 */
export async function scheduleProject(
  ctx: CommandContext,
  paths: ProjectPaths,
  project: Project,
  rebuild: boolean,
): Promise<ScheduleOutcome> {
  const warnings: string[] = [];
  const entries = await candidates(ctx, paths, warnings);
  const plan = await loadPlan(ctx.fs, paths);
  const notes = new Map(plan.items.map((item) => [item.id, item.note ?? '']));
  const items = schedulable(entries, await loadMetadata(ctx.fs, paths), notes);
  const ids = new Set(items.map((i) => i.id));
  const ledgerFiles = ledgerPaths(ctx.root);
  return withLock(ledgerFiles.lock, () =>
    withLock(paths.scheduleLock, async () => {
      const previous = await loadSchedule(ctx.fs, paths);
      let existing = assignmentsOf(previous).filter((a) => ids.has(a.id));
      if (rebuild && previous !== undefined) {
        const split = splitForRebuild(previous);
        existing = split.kept.filter((a) => ids.has(a.id));
        warnings.push(...split.warnings);
      }
      const ledger = await loadLedger(ctx.fs, ledgerFiles.ledger);
      const result = assignSlots({
        itemIds: [...ids],
        existing,
        ledger: ledger.entries,
        config: {
          project: project.name,
          account: project.account,
          timezone: project.timezone,
          slotsPerDay: project.slots.length,
        },
        now: ctx.clock.now(),
      });
      const schedule = buildSchedule({
        project,
        items,
        assignments: result.assignments,
        previous,
        updatedAt: ctx.clock.now().toISOString(),
      });
      await writeJson(ctx.fs, paths.schedule, schedule);
      await writeJson(ctx.fs, ledgerFiles.ledger, {
        schemaVersion: SCHEMA_VERSION,
        entries: result.ledger,
      });
      return { schedule, added: result.added, warnings };
    }),
  );
}
