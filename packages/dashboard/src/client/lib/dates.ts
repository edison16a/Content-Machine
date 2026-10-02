/**
 * Calendar math on "YYYY-MM-DD" strings. Dates are anchored at UTC midnight
 * so adding days never trips over the viewer's own daylight saving changes.
 */

function toUtc(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

const iso = (value: Date): string => value.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const value = toUtc(date);
  value.setUTCDate(value.getUTCDate() + days);
  return iso(value);
}

/** 0 for Sunday through 6 for Saturday. */
export function weekday(date: string): number {
  return toUtc(date).getUTCDay();
}

export function startOfWeek(date: string, weekStartsOn: 'monday' | 'sunday'): string {
  const first = weekStartsOn === 'monday' ? 1 : 0;
  return addDays(date, -((weekday(date) - first + 7) % 7));
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Today's date in the project's time zone, so "Today" means the same thing everywhere. */
export function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function format(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(toUtc(date));
}

/** "Mon" */
export const dayName = (date: string): string => format(date, { weekday: 'short' });
/** "Sep 28" */
export const monthDay = (date: string): string => format(date, { month: 'short', day: 'numeric' });
/** "Friday, October 2" */
export const longDate = (date: string): string =>
  format(date, { weekday: 'long', month: 'long', day: 'numeric' });

/** "Sep 28 to Oct 4, 2026", with both years when the week crosses New Year. */
export function weekRange(start: string): string {
  const end = addDays(start, 6);
  const year = (date: string): string => date.slice(0, 4);
  if (year(start) !== year(end))
    return `${monthDay(start)}, ${year(start)} to ${monthDay(end)}, ${year(end)}`;
  return `${monthDay(start)} to ${monthDay(end)}, ${year(end)}`;
}
