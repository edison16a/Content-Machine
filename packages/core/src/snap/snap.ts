import { ValidationError, type Issue } from '../errors/index.js';
import { MAX_ITEM_SECONDS, MIN_ITEM_SECONDS } from '../plan/rules.js';
import type { Plan, PlanItem } from '../schemas/index.js';
import { candidatesNear, nearest, type Silence } from './silence.js';
import type { SnapOptions, SnappedItem } from './types.js';

export type SilenceMap = Readonly<Record<string, readonly Silence[]>>;
export type DurationMap = Readonly<Record<string, number>>;

/** Snaps one boundary, reporting whether a pause was found. */
function snapPoint(silences: readonly Silence[], kind: 'start' | 'end' | 'shared', time: number, window: number) {
  const hit = nearest(candidatesNear(silences, kind, time, window), time);
  return hit === undefined ? { time, snapped: false } : { time: hit, snapped: true };
}

function blank(item: PlanItem): SnappedItem {
  return {
    id: item.id,
    source: item.source,
    plannedStart: item.start,
    plannedEnd: item.end,
    start: item.start,
    end: item.end,
    startSnapped: false,
    endSnapped: false,
  };
}

/**
 * Sequential: the first part starts at 0, the last ends at the true end of the
 * source, and each shared boundary moves to a pause midpoint so one part ends
 * exactly where the next begins.
 */
function snapSequential(items: PlanItem[], silences: readonly Silence[], duration: number, window: number) {
  const out = items.map(blank);
  out.forEach((item, index) => {
    if (index === 0) Object.assign(item, { start: 0, startSnapped: true });
    const next = out[index + 1];
    if (next === undefined) {
      Object.assign(item, { end: duration, endSnapped: true });
      return;
    }
    const point = snapPoint(silences, 'shared', item.plannedEnd, window);
    Object.assign(item, { end: point.time, endSnapped: point.snapped });
    Object.assign(next, { start: point.time, startSnapped: point.snapped });
  });
  return out;
}

/** Clip: start just before speech resumes, end just after it stops. */
function snapClip(item: PlanItem, silences: readonly Silence[], duration: number, window: number) {
  const out = blank(item);
  const start = snapPoint(silences, 'start', item.start, window);
  const end = snapPoint(silences, 'end', item.end, window);
  if (start.time < end.time) {
    Object.assign(out, { start: start.time, startSnapped: start.snapped });
    Object.assign(out, { end: Math.min(end.time, duration), endSnapped: end.snapped });
  }
  return out;
}

/**
 * Pulls an over-long item's end back to an earlier pause inside the window.
 * In Sequential mode the next part's start moves with it to stay contiguous.
 */
function shorten(item: SnappedItem, next: SnappedItem | undefined, silences: readonly Silence[], window: number, kind: 'end' | 'shared') {
  const options = candidatesNear(silences, kind, item.plannedEnd, window)
    .filter((t) => t < item.end && t - item.start <= MAX_ITEM_SECONDS && t - item.start >= MIN_ITEM_SECONDS)
    .sort((a, b) => b - a);
  const best = options[0];
  if (best === undefined) return false;
  item.end = best;
  if (next !== undefined) next.start = best;
  return true;
}

function lengthIssue(item: SnappedItem): Issue | undefined {
  const length = item.end - item.start;
  if (length <= MAX_ITEM_SECONDS && length >= MIN_ITEM_SECONDS) return undefined;
  return {
    code: 'E_SNAP_FAILED',
    message: `Item ${item.id} would be ${length.toFixed(2)}s after snapping and no pause nearby fixes it.`,
    itemId: item.id,
  };
}

/**
 * Moves every cut in the plan onto the nearest pause within the window, then
 * re-checks lengths. Throws E_SNAP_FAILED naming each item that cannot fit.
 */
export function snapPlan(plan: Plan, silences: SilenceMap, durations: DurationMap, options: SnapOptions): SnappedItem[] {
  const result: SnappedItem[] = [];
  const issues: Issue[] = [];
  for (const source of plan.sources) {
    const items = plan.items.filter((item) => item.source === source.file);
    const quiet = silences[source.file] ?? [];
    const duration = durations[source.file] ?? Math.max(0, ...items.map((i) => i.end));
    const snapped = plan.mode === 'sequential'
      ? snapSequential(items, quiet, duration, options.window)
      : items.map((item) => snapClip(item, quiet, duration, options.window));
    snapped.forEach((item, index) => {
      if (item.end - item.start > MAX_ITEM_SECONDS) {
        const next = plan.mode === 'sequential' ? snapped[index + 1] : undefined;
        shorten(item, next, quiet, options.window, plan.mode === 'sequential' ? 'shared' : 'end');
      }
      const issue = lengthIssue(item);
      if (issue !== undefined) issues.push(issue);
    });
    result.push(...snapped);
  }
  if (issues.length > 0) {
    throw new ValidationError('E_SNAP_FAILED', `${issues.length} item(s) do not fit after snapping.`, {
      hint: 'Move the listed cut points a few seconds earlier in plan/plan.json, or widen --snap-window.',
      issues,
    });
  }
  return result.sort((a, b) => a.id - b.id);
}
