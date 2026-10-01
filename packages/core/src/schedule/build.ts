import type { Captions, PlatformEntry, Project, Schedule, ScheduleItem } from '../schemas/index.js';
import { PLATFORMS, SCHEMA_VERSION } from '../schemas/index.js';
import type { Assignment } from './scheduler.js';
import { addDays, addMinutesToTime, isoWithOffset, zonedInstant } from './time.js';

/** What the tool knows about a rendered item before it gets a slot. */
export interface SchedulableItem {
  id: number;
  video: string;
  thumb: string;
  duration: number;
  postTitle: string;
  captions: Captions;
  source: string;
  sourceStart: number;
  sourceEnd: number;
  note: string;
}

export interface BuildScheduleInput {
  project: Project;
  items: readonly SchedulableItem[];
  assignments: readonly Assignment[];
  previous: Schedule | undefined;
  updatedAt: string;
}

/** Time and ISO stamp for one platform: the slot time plus its stagger. */
export function platformTime(project: Project, date: string, slot: number, minutes: number) {
  const base = project.slots[slot] ?? project.slots[0] ?? '12:00';
  const shifted = addMinutesToTime(base, minutes);
  const day = addDays(date, shifted.dayOffset);
  return {
    time: shifted.time,
    iso: isoWithOffset(zonedInstant(day, shifted.time, project.timezone), project.timezone),
  };
}

function entriesFor(project: Project, assignment: Assignment, previous: ScheduleItem | undefined) {
  const platforms = {} as Record<(typeof PLATFORMS)[number], PlatformEntry>;
  for (const platform of PLATFORMS) {
    const at = platformTime(project, assignment.date, assignment.slot, project.stagger[platform]);
    const old = previous?.platforms[platform];
    platforms[platform] = { ...at, status: old?.status ?? 'queued', note: old?.note ?? '' };
  }
  return platforms;
}

/**
 * Builds schedule.json from items and their slots. Statuses and notes carry
 * over from the previous schedule so re-running never loses progress.
 */
export function buildSchedule(input: BuildScheduleInput): Schedule {
  const { project } = input;
  const byId = new Map(input.assignments.map((a) => [a.id, a]));
  const previousById = new Map(input.previous?.items.map((item) => [item.id, item]) ?? []);
  const items: ScheduleItem[] = [];
  for (const item of [...input.items].sort((a, b) => a.id - b.id)) {
    const assignment = byId.get(item.id);
    if (assignment === undefined) continue;
    const previous = previousById.get(item.id);
    items.push({
      ...item,
      date: assignment.date,
      slot: assignment.slot,
      platforms: entriesFor(project, assignment, previous),
    });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    project: project.name,
    channel: project.channel,
    timezone: project.timezone,
    weekStartsOn: project.weekStartsOn,
    slots: project.slots,
    stagger: project.stagger,
    handles: project.handles,
    updatedAt: input.updatedAt,
    items,
  };
}

/** Existing slots from a schedule, as scheduler assignments. */
export function assignmentsOf(schedule: Schedule | undefined): Assignment[] {
  return schedule?.items.map((item) => ({ id: item.id, date: item.date, slot: item.slot })) ?? [];
}

export interface RebuildSplit {
  /** Items that keep their slot because they already reached a platform. */
  kept: Assignment[];
  /** Items queued everywhere, free to move. */
  released: number[];
  warnings: string[];
}

/**
 * Splits a schedule for `--rebuild`: only items still queued on every
 * platform may move. Everything else stays put, with a warning per item.
 */
export function splitForRebuild(schedule: Schedule): RebuildSplit {
  const kept: Assignment[] = [];
  const released: number[] = [];
  const warnings: string[] = [];
  for (const item of schedule.items) {
    const allQueued = PLATFORMS.every((p) => item.platforms[p].status === 'queued');
    if (allQueued) {
      released.push(item.id);
    } else {
      kept.push({ id: item.id, date: item.date, slot: item.slot });
      const states = PLATFORMS.map((p) => `${p} ${item.platforms[p].status}`).join(', ');
      warnings.push(
        `Item ${item.id} keeps ${item.date} slot ${item.slot + 1} because it is not queued everywhere (${states}).`,
      );
    }
  }
  return { kept, released, warnings };
}
