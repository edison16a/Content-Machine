import { MAX_ITEM_SECONDS } from '../plan/rules.js';
import { targets, type Silence } from './silence.js';

export interface AutoPart {
  start: number;
  end: number;
  /** True when no pause was found and the cut is a hard cut at 59.5s. */
  hardCut: boolean;
}

const PREFERRED_MIN = 52;
const WIDEST_MIN = 35;
const HARD_CUT = 59.5;
const SHORT_TAIL = 15;

/** Latest pause midpoint making a part between `min` and the ceiling long. */
function latestCut(midpoints: readonly number[], from: number, min: number): number | undefined {
  const fits = midpoints.filter((m) => m - from >= min && m - from <= MAX_ITEM_SECONDS);
  return fits.length === 0 ? undefined : Math.max(...fits);
}

/** Re-splits the last two parts near their shared midpoint, preferring a pause. */
function resplit(parts: AutoPart[], midpoints: readonly number[], duration: number): void {
  const previous = parts.pop();
  if (previous === undefined) return;
  const middle = (previous.start + duration) / 2;
  const valid = midpoints.filter((m) => m - previous.start <= MAX_ITEM_SECONDS && duration - m <= MAX_ITEM_SECONDS);
  const cut = valid.reduce<number | undefined>(
    (best, m) => (best === undefined || Math.abs(m - middle) < Math.abs(best - middle) ? m : best),
    undefined,
  );
  parts.push({ start: previous.start, end: cut ?? middle, hardCut: cut === undefined });
  parts.push({ start: cut ?? middle, end: duration, hardCut: cut === undefined });
}

/**
 * Splits a whole video into Sequential parts at pauses when there is no
 * transcript. Prefers 52 to 60 second parts, widens to 35, and hard cuts at
 * 59.5s only when the audio never goes quiet.
 */
export function autoplan(duration: number, silences: readonly Silence[]): AutoPart[] {
  const midpoints = silences.map(targets.shared);
  const parts: AutoPart[] = [];
  let position = 0;
  while (duration - position > MAX_ITEM_SECONDS) {
    const cut = latestCut(midpoints, position, PREFERRED_MIN) ?? latestCut(midpoints, position, WIDEST_MIN);
    const end = cut ?? position + HARD_CUT;
    parts.push({ start: position, end, hardCut: cut === undefined });
    position = end;
  }
  const tail = duration - position;
  const previous = parts[parts.length - 1];
  if (previous !== undefined && tail < SHORT_TAIL) {
    if (duration - previous.start <= MAX_ITEM_SECONDS) previous.end = duration;
    else resplit(parts, midpoints, duration);
  } else if (tail > 0) {
    parts.push({ start: position, end: duration, hardCut: false });
  }
  return parts;
}
