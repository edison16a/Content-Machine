/** A stretch of quiet audio, in seconds from the start of the source. */
export interface Silence {
  start: number;
  end: number;
}

/** Start an item just before speech resumes. */
export const START_LEAD = 0.1;
/** End an item just after speech stops. */
export const END_TAIL = 0.2;

/**
 * Unions silence lists from several detection passes into sorted,
 * non-overlapping intervals. Two sensitivities catch both long pauses and
 * the short breaths between sentences.
 */
export function mergeSilences(...lists: ReadonlyArray<readonly Silence[]>): Silence[] {
  const all = lists
    .flat()
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const merged: Silence[] = [];
  for (const silence of all) {
    const last = merged[merged.length - 1];
    if (last !== undefined && silence.start <= last.end) {
      last.end = Math.max(last.end, silence.end);
    } else {
      merged.push({ start: silence.start, end: silence.end });
    }
  }
  return merged;
}

/** Where a cut lands for each kind of boundary, given one silence. */
export const targets = {
  start: (s: Silence): number => Math.max(0, s.end - START_LEAD),
  end: (s: Silence): number => s.start + END_TAIL,
  shared: (s: Silence): number => (s.start + s.end) / 2,
} as const;

export type BoundaryKind = keyof typeof targets;

/** All candidate cut times of one kind within `window` seconds of `time`. */
export function candidatesNear(
  silences: readonly Silence[],
  kind: BoundaryKind,
  time: number,
  window: number,
): number[] {
  return silences.map(targets[kind]).filter((t) => Math.abs(t - time) <= window);
}

/** The candidate closest to `time`, or undefined when there is none. */
export function nearest(candidates: readonly number[], time: number): number | undefined {
  let best: number | undefined;
  for (const candidate of candidates) {
    if (best === undefined || Math.abs(candidate - time) < Math.abs(best - time)) best = candidate;
  }
  return best;
}
