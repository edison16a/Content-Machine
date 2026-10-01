/**
 * Wall-clock time helpers built on Intl, so they follow the runtime's time
 * zone database and get daylight saving changes right without a library.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The wall clock in `timeZone` at a given instant. */
export function wallClockAt(instant: Date, timeZone: string): WallClock {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 0,
    day: parts.day ?? 0,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** Calendar date ("YYYY-MM-DD") in `timeZone` at a given instant. */
export function localDateAt(instant: Date, timeZone: string): string {
  const w = wallClockAt(instant, timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** Adds whole days to a calendar date. Works on dates only, so DST is irrelevant. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return next.toISOString().slice(0, 10);
}

/** Offset of `timeZone` from UTC at an instant, in minutes (east positive). */
export function offsetMinutesAt(instant: Date, timeZone: string): number {
  const w = wallClockAt(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/**
 * The instant when the wall clock in `timeZone` reads `date` at `time`.
 * Guesses with the offset at the naive UTC time, then corrects once, which
 * handles both DST transitions. A repeated fall-back time resolves to its
 * first occurrence; a time inside a spring-forward gap moves forward by the
 * length of the gap (02:30 becomes 03:30).
 */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const naive = Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0);
  const first = naive - offsetMinutesAt(new Date(naive), timeZone) * 60000;
  const second = naive - offsetMinutesAt(new Date(first), timeZone) * 60000;
  return new Date(Math.max(first, second));
}

/** ISO 8601 with the local offset, like "2026-10-02T12:00:00-07:00". */
export function isoWithOffset(instant: Date, timeZone: string): string {
  const w = wallClockAt(instant, timeZone);
  const offset = offsetMinutesAt(instant, timeZone);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return (
    `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Adds minutes to "HH:MM", returning the new time and how many days it rolled. */
export function addMinutesToTime(
  time: string,
  minutes: number,
): { time: string; dayOffset: number } {
  const [h, m] = time.split(':').map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const dayOffset = Math.floor(total / 1440);
  const inDay = total - dayOffset * 1440;
  return { time: `${pad(Math.floor(inDay / 60))}:${pad(inDay % 60)}`, dayOffset };
}
