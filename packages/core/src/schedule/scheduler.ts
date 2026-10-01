import type { LedgerEntry } from '../schemas/index.js';
import { addDays, localDateAt } from './time.js';

/** A posting slot: a calendar date and an index into the daily slot times. */
export interface SlotPosition {
  date: string;
  slot: number;
}

export interface Assignment extends SlotPosition {
  id: number;
}

export interface SchedulerConfig {
  project: string;
  account: string;
  timezone: string;
  slotsPerDay: number;
}

export interface SchedulerInput {
  /** Every item id that should end up scheduled. */
  itemIds: readonly number[];
  /** Assignments this project already has and keeps. Never moved. */
  existing: readonly Assignment[];
  ledger: readonly LedgerEntry[];
  config: SchedulerConfig;
  now: Date;
}

export interface SchedulerResult {
  assignments: Assignment[];
  /** The full new ledger: other projects untouched, this project's slots replaced. */
  ledger: LedgerEntry[];
  added: Assignment[];
}

const key = (p: SlotPosition): string => `${p.date}#${p.slot}`;

function compare(a: SlotPosition, b: SlotPosition): number {
  return a.date === b.date ? a.slot - b.slot : a.date < b.date ? -1 : 1;
}

function advance(p: SlotPosition, slotsPerDay: number): SlotPosition {
  return p.slot + 1 < slotsPerDay
    ? { date: p.date, slot: p.slot + 1 }
    : { date: addDays(p.date, 1), slot: 0 };
}

/** First slot to consider: tomorrow's first slot, or right after the project's last one. */
function startPosition(input: SchedulerInput): SlotPosition {
  const tomorrow = { date: addDays(localDateAt(input.now, input.config.timezone), 1), slot: 0 };
  const last = [...input.existing].sort(compare).pop();
  if (last === undefined) return tomorrow;
  const after = advance(last, input.config.slotsPerDay);
  return compare(after, tomorrow) > 0 ? after : tomorrow;
}

/**
 * Gives each unscheduled item, in ascending id order, the next free slot.
 * Pure and deterministic: same inputs, same calendar. Slots held by other
 * projects on the same account are skipped; overflow rolls into later days
 * with no limit.
 */
export function assignSlots(input: SchedulerInput): SchedulerResult {
  const { config } = input;
  const others = input.ledger.filter((entry) => entry.project !== config.project);
  const taken = new Set(others.filter((e) => e.account === config.account).map(key));
  for (const a of input.existing) taken.add(key(a));
  const assigned = new Set(input.existing.map((a) => a.id));
  const added: Assignment[] = [];
  let cursor = startPosition(input);
  for (const id of [...input.itemIds].sort((a, b) => a - b)) {
    if (assigned.has(id)) continue;
    while (taken.has(key(cursor))) cursor = advance(cursor, config.slotsPerDay);
    added.push({ id, ...cursor });
    taken.add(key(cursor));
    cursor = advance(cursor, config.slotsPerDay);
  }
  const assignments = [...input.existing, ...added].sort((a, b) => a.id - b.id);
  const mine = assignments.map((a) => ({
    account: config.account,
    date: a.date,
    slot: a.slot,
    project: config.project,
    itemId: a.id,
  }));
  return { assignments, ledger: [...others, ...mine], added };
}
