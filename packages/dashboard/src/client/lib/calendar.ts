import { addDays, addMonths, longDate, monthTitle, startOfWeek, weekRange } from './dates.js';

/** How much of the calendar is on screen at once. */
export const CALENDAR_VIEWS = ['day', 'week', 'month'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const CALENDAR_LABELS: Record<CalendarView, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

/** The date one step before or after, by the size of the view. */
export function shiftAnchor(view: CalendarView, anchor: string, step: 1 | -1): string {
  if (view === 'day') return addDays(anchor, step);
  if (view === 'week') return addDays(anchor, step * 7);
  return addMonths(anchor, step);
}

/** "Friday, October 2, 2026", "Sep 28 to Oct 4, 2026" or "October 2026". */
export function periodTitle(
  view: CalendarView,
  anchor: string,
  weekStartsOn: 'monday' | 'sunday',
): string {
  if (view === 'day') return `${longDate(anchor)}, ${anchor.slice(0, 4)}`;
  if (view === 'week') return weekRange(startOfWeek(anchor, weekStartsOn));
  return monthTitle(anchor);
}
