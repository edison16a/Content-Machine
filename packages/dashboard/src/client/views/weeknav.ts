import type { Context } from '../context.js';
import { addDays, startOfWeek, todayIn, weekRange } from '../lib/dates.js';
import { h } from '../lib/dom.js';
import { icon, type IconName } from '../lib/icons.js';
import { firstUnposted } from '../lib/selectors.js';

function navButton(
  label: string,
  name: IconName,
  onClick: () => void,
  withText = false,
): HTMLButtonElement {
  return h(
    'button',
    {
      type: 'button',
      class: withText ? 'button button-ghost' : 'icon-button',
      'aria-label': label,
      title: label,
      on: { click: onClick },
    },
    icon(name),
    withText ? h('span', { class: 'label', text: label }) : null,
  );
}

/** Previous and next week, Today, Jump to first unposted, and the week's dates. */
export function renderWeekNav(ctx: Context): { element: HTMLElement; update: () => void } {
  const { data, store } = ctx;
  const title = h('h2', { class: 'week-title', 'aria-live': 'polite' });
  const shift = (days: number): void =>
    store.set({ weekStart: addDays(store.get().weekStart, days) });
  const jump = (): void => {
    const item = firstUnposted(data.items, store.get().platform);
    if (item !== undefined)
      store.set({ weekStart: startOfWeek(item.date, data.weekStartsOn), focusId: item.id });
  };
  const element = h(
    'div',
    { class: 'weeknav' },
    navButton('Previous week', 'chevronLeft', () => shift(-7)),
    title,
    navButton('Next week', 'chevronRight', () => shift(7)),
    h('span', { class: 'divider', 'aria-hidden': 'true' }),
    navButton(
      'Today',
      'today',
      () =>
        store.set({ weekStart: startOfWeek(todayIn(data.timezone, ctx.now()), data.weekStartsOn) }),
      true,
    ),
    navButton('First unposted', 'target', jump, true),
  );
  const update = (): void => {
    title.textContent = weekRange(store.get().weekStart);
  };
  return { element, update };
}
