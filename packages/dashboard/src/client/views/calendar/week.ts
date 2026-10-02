import type { Context } from '../../context.js';
import { dayName, monthDay, startOfWeek, weekDates } from '../../lib/dates.js';
import { h } from '../../lib/dom.js';
import { slotList } from './slots.js';

/** One column of the week: weekday, date, a Today marker and the day's slots. */
export function dayColumn(ctx: Context, date: string, today: string): HTMLElement {
  const isToday = date === today;
  return h(
    'section',
    {
      class: `day${isToday ? ' is-today' : ''}`,
      'aria-label': `${dayName(date)} ${monthDay(date)}`,
    },
    h(
      'header',
      { class: 'day-head' },
      h('span', { class: 'day-name', text: dayName(date) }),
      h('span', { class: 'day-date', text: monthDay(date) }),
      isToday ? h('span', { class: 'today-pill', text: 'Today' }) : null,
    ),
    slotList(ctx, date),
  );
}

/** Seven day columns for the week holding the anchor date. */
export function weekView(ctx: Context, today: string): HTMLElement[] {
  const start = startOfWeek(ctx.store.get().anchor, ctx.data.weekStartsOn);
  return weekDates(start).map((date) => dayColumn(ctx, date, today));
}
