import type { DashboardItem } from '../../../shared/types.js';
import type { Context } from '../../context.js';
import { dayName, longDate, monthWeeks } from '../../lib/dates.js';
import { h, img } from '../../lib/dom.js';
import { itemLabel } from '../../lib/format.js';
import { slotIndex } from '../../lib/selectors.js';
import { statusSummary } from '../platform-statuses.js';

/**
 * A small poster for one video in a month cell. Its dot shows the selected
 * platform's status; on the All tab, three dots show all of them.
 */
function miniPoster(ctx: Context, item: DashboardItem): HTMLButtonElement {
  const view = ctx.store.get().platform;
  const dots =
    view === 'all'
      ? (['tiktok', 'instagram', 'youtube'] as const).map((p) => item.platforms[p].status)
      : [item.platforms[view].status];
  const label = view === 'all' ? statusSummary(item) : dots[0];
  const button = h(
    'button',
    {
      type: 'button',
      class: 'mini-poster',
      title: item.postTitle,
      'aria-label': `Play ${itemLabel(item.id)}, ${item.postTitle}, ${label ?? ''}`,
      on: { click: () => ctx.openItem(item, button) },
    },
    img(item.thumb, ''),
    h(
      'span',
      { class: 'mini-dots', 'aria-hidden': 'true' },
      ...dots.map((status) => h('span', { class: `dot status-${status}` })),
    ),
  );
  return button;
}

/**
 * Every day of the month in a grid of whole weeks. Each day shows its videos
 * as small posters; days from the neighbouring months are dimmed. Clicking
 * a date opens that day in the day view.
 */
export function monthView(ctx: Context, today: string): HTMLElement[] {
  const { anchor } = ctx.store.get();
  const month = anchor.slice(0, 7);
  const weeks = monthWeeks(anchor, ctx.data.weekStartsOn);
  const index = slotIndex(ctx.data.items);
  const heads = (weeks[0] ?? []).map((date) =>
    h('span', { class: 'month-weekday', text: dayName(date) }),
  );
  const cells = weeks.flat().map((date) => {
    const items = ctx.data.slots.flatMap((_, i) => index.get(`${date}#${i}`) ?? []);
    const classes = ['month-cell'];
    if (date.slice(0, 7) !== month) classes.push('is-other');
    if (date === today) classes.push('is-today');
    return h(
      'div',
      { class: classes.join(' ') },
      h('button', {
        type: 'button',
        class: 'month-date',
        text: String(Number(date.slice(8))),
        'aria-label': `Open ${longDate(date)}`,
        on: { click: () => ctx.store.set({ calendar: 'day', anchor: date }) },
      }),
      h('div', { class: 'month-items' }, ...items.map((item) => miniPoster(ctx, item))),
    );
  });
  return [h('div', { class: 'month-head' }, ...heads), h('div', { class: 'month-grid' }, ...cells)];
}
