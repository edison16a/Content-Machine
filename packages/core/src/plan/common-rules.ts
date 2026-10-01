import type { Plan, PlanItem } from '../schemas/index.js';
import { findAccentRange } from './accent.js';
import { secs, type IssueList } from './issues.js';
import { MAX_ITEM_SECONDS, MIN_ITEM_SECONDS, SEQUENTIAL_SHORT_WARNING } from './rules.js';

/** Known source durations in seconds, keyed by file name inside `source/`. */
export type SourceDurations = Readonly<Record<string, number>>;

/** Ids must be unique and ascending because they are the posting order. */
export function checkIds(plan: Plan, issues: IssueList): void {
  const seen = new Set<number>();
  let previous = 0;
  for (const item of plan.items) {
    if (seen.has(item.id))
      issues.error('E_PLAN_INVALID', `Item id ${item.id} is used twice.`, item.id);
    else if (item.id <= previous) {
      issues.error(
        'E_PLAN_INVALID',
        `Item ${item.id} comes after item ${previous}; ids must ascend.`,
        item.id,
      );
    }
    seen.add(item.id);
    previous = Math.max(previous, item.id);
  }
}

/** Every source is listed once and exists in `source/` with a known duration. */
export function checkSources(plan: Plan, durations: SourceDurations, issues: IssueList): void {
  const seen = new Set<string>();
  for (const source of plan.sources) {
    if (seen.has(source.file))
      issues.error('E_PLAN_INVALID', `Source ${source.file} is listed twice.`);
    seen.add(source.file);
    if (durations[source.file] === undefined) {
      issues.error(
        'E_FILE_NOT_FOUND',
        `Source ${source.file} is not in the project's source/ folder.`,
      );
    }
  }
}

/** Times are in range and the length fits the mode's limits. */
export function checkTiming(
  plan: Plan,
  item: PlanItem,
  durations: SourceDurations,
  issues: IssueList,
): void {
  const sourceDuration = durations[item.source];
  if (!plan.sources.some((source) => source.file === item.source)) {
    issues.error(
      'E_PLAN_INVALID',
      `Item ${item.id} uses ${item.source}, which is not in sources[].`,
      item.id,
    );
  }
  if (item.start >= item.end) {
    issues.error('E_PLAN_DURATION', `Item ${item.id} starts at or after its end.`, item.id);
    return;
  }
  if (sourceDuration !== undefined && item.end > sourceDuration + 0.05) {
    issues.error(
      'E_PLAN_DURATION',
      `Item ${item.id} ends at ${secs(item.end)}, after the source ends at ${secs(sourceDuration)}.`,
      item.id,
    );
  }
  const length = item.end - item.start;
  if (length > MAX_ITEM_SECONDS) {
    issues.error(
      'E_PLAN_DURATION',
      `Item ${item.id} is ${secs(length)}; the limit is ${MAX_ITEM_SECONDS}s.`,
      item.id,
    );
  } else if (length < MIN_ITEM_SECONDS) {
    issues.error(
      'E_PLAN_DURATION',
      `Item ${item.id} is ${secs(length)}; the minimum is ${MIN_ITEM_SECONDS}s.`,
      item.id,
    );
  } else if (plan.mode === 'sequential' && length < SEQUENTIAL_SHORT_WARNING) {
    issues.warn(
      'E_PLAN_DURATION',
      `Item ${item.id} is only ${secs(length)}; parts under 20s feel abrupt.`,
      item.id,
    );
  }
}

/** The accent must be a word or run of words that appears in the title. */
export function checkAccent(
  label: string,
  title: string,
  accent: string,
  issues: IssueList,
  itemId?: number,
): void {
  if (findAccentRange(title, accent) === undefined) {
    issues.error(
      'E_PLAN_INVALID',
      `${label}: accent "${accent}" is not a run of words in "${title}".`,
      itemId,
    );
  }
}
