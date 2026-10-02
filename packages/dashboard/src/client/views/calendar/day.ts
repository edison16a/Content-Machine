import type { Context } from '../../context.js';
import { longDate } from '../../lib/dates.js';
import { h } from '../../lib/dom.js';
import { slotList } from './slots.js';

/**
 * One day, large: the same slots as a week column but with big posters, for
 * looking closely at what goes out today.
 */
export function dayView(ctx: Context, today: string): HTMLElement[] {
  const date = ctx.store.get().anchor;
  const isToday = date === today;
  return [
    h(
      'section',
      { class: `day day-large${isToday ? ' is-today' : ''}`, 'aria-label': longDate(date) },
      h(
        'header',
        { class: 'day-head' },
        h('span', { class: 'day-name', text: longDate(date) }),
        isToday ? h('span', { class: 'today-pill', text: 'Today' }) : null,
      ),
      slotList(ctx, date),
    ),
  ];
}
