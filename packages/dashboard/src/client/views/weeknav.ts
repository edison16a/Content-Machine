import type { Context } from '../context.js';
import { focusPlatform } from '../state.js';
import { addDays, startOfWeek, todayIn, weekRange } from '../lib/dates.js';
import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { firstUnposted } from '../lib/selectors.js';

/** Previous and next week, the week's dates, Today and First unposted. */
export function renderWeekNav(ctx: Context): { element: HTMLElement; update: () => void } {
  const { store } = ctx;
  const title = h('h2', { class: 'week-title', 'aria-live': 'polite' });
  const shift = (days: number): void =>
    store.set({ weekStart: addDays(store.get().weekStart, days) });
  const arrow = (
    label: string,
    name: 'chevronLeft' | 'chevronRight',
    days: number,
  ): HTMLButtonElement =>
    h(
      'button',
      {
        type: 'button',
        class: 'icon-button',
        'aria-label': label,
        title: label,
        on: { click: () => shift(days) },
      },
      icon(name),
    );
  const text = (label: string, onClick: () => void): HTMLButtonElement =>
    h('button', { type: 'button', class: 'text-button', on: { click: onClick } }, label);
  const jump = (): void => {
    const item = firstUnposted(ctx.data.items, focusPlatform(store.get().platform));
    if (item !== undefined)
      store.set({ weekStart: startOfWeek(item.date, ctx.data.weekStartsOn), focusId: item.id });
  };
  const element = h(
    'div',
    { class: 'weeknav' },
    arrow('Previous week', 'chevronLeft', -7),
    title,
    arrow('Next week', 'chevronRight', 7),
    text('Today', () =>
      store.set({
        weekStart: startOfWeek(todayIn(ctx.data.timezone, ctx.now()), ctx.data.weekStartsOn),
      }),
    ),
    text('First unposted', jump),
  );
  const update = (): void => {
    title.textContent = weekRange(store.get().weekStart);
  };
  return { element, update };
}
