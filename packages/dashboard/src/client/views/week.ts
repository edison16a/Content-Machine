import type { Context } from '../context.js';
import { dayName, monthDay, todayIn, weekDates } from '../lib/dates.js';
import { h, replace } from '../lib/dom.js';
import { platformSlotTime, time12 } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { slotIndex } from '../lib/selectors.js';
import { emptySlot, videoCard } from './card.js';

function dayColumn(ctx: Context, date: string, today: string): HTMLElement {
  const { data } = ctx;
  const { platform } = ctx.store.get();
  const index = slotIndex(data.items);
  const isToday = date === today;
  const slots = data.slots.map((slot, i) => {
    const item = index.get(`${date}#${i}`);
    const time = item?.platforms[platform].time ?? platformSlotTime(slot, data.stagger[platform]);
    return h(
      'li',
      { class: 'slot' },
      h('span', { class: 'slot-time', text: time12(time) }),
      item === undefined ? emptySlot() : videoCard(ctx, item, platform),
    );
  });
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
    h('ol', { class: 'slots' }, ...slots),
  );
}

/** Shown instead of the grid when nothing has been scheduled. */
function emptyState(project: string): HTMLElement {
  return h(
    'div',
    { class: 'empty' },
    icon('film', 'icon icon-xl'),
    h('h2', { text: 'Nothing scheduled yet' }),
    h('p', {
      text: `Render and schedule videos, then this calendar fills in: npm run cm -- schedule ${project}`,
    }),
  );
}

/** Renders the seven day columns for the visible week. */
export function renderWeek(ctx: Context, container: HTMLElement): void {
  if (ctx.data.items.length === 0) {
    replace(container, emptyState(ctx.data.project));
    return;
  }
  const today = todayIn(ctx.data.timezone, ctx.now());
  replace(
    container,
    ...weekDates(ctx.store.get().weekStart).map((date) => dayColumn(ctx, date, today)),
  );
}
