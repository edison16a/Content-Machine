import type { Context } from '../../context.js';
import {
  CALENDAR_LABELS,
  CALENDAR_VIEWS,
  periodTitle,
  shiftAnchor,
  type CalendarView,
} from '../../lib/calendar.js';
import { todayIn } from '../../lib/dates.js';
import { h } from '../../lib/dom.js';
import { icon } from '../../lib/icons.js';
import { firstUnposted } from '../../lib/selectors.js';
import { focusPlatform } from '../../state.js';

const UNIT: Record<CalendarView, string> = { day: 'day', week: 'week', month: 'month' };

/** Day, Week and Month as one segmented control. */
function viewSwitch(ctx: Context): { element: HTMLElement; update: () => void } {
  const buttons = CALENDAR_VIEWS.map((view) =>
    h('button', {
      type: 'button',
      class: 'segment',
      'data-view': view,
      text: CALENDAR_LABELS[view],
      on: { click: () => ctx.store.set({ calendar: view }) },
    }),
  );
  const element = h(
    'div',
    { class: 'segments', role: 'group', 'aria-label': 'Calendar view' },
    ...buttons,
  );
  const update = (): void => {
    const current = ctx.store.get().calendar;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.view === current));
    }
  };
  return { element, update };
}

/**
 * The calendar's controls: the view switch, previous and next (a day, a week
 * or a month at a time), the period's title, Today and First unposted.
 */
export function renderCalendarNav(ctx: Context): { element: HTMLElement; update: () => void } {
  const { store } = ctx;
  const title = h('h2', { class: 'week-title', 'aria-live': 'polite' });
  const views = viewSwitch(ctx);
  const arrow = (step: 1 | -1): HTMLButtonElement =>
    h(
      'button',
      {
        type: 'button',
        class: 'icon-button',
        on: {
          click: () => {
            const { calendar, anchor } = store.get();
            store.set({ anchor: shiftAnchor(calendar, anchor, step) });
          },
        },
      },
      icon(step === 1 ? 'chevronRight' : 'chevronLeft'),
    );
  const previous = arrow(-1);
  const next = arrow(1);
  const text = (label: string, onClick: () => void): HTMLButtonElement =>
    h('button', { type: 'button', class: 'text-button', on: { click: onClick } }, label);
  const jump = (): void => {
    const item = firstUnposted(ctx.data.items, focusPlatform(store.get().platform));
    if (item !== undefined) store.set({ anchor: item.date, focusId: item.id });
  };
  const element = h(
    'div',
    { class: 'weeknav' },
    views.element,
    previous,
    title,
    next,
    text('Today', () => store.set({ anchor: todayIn(ctx.data.timezone, ctx.now()) })),
    text('First unposted', jump),
  );
  const update = (): void => {
    const { calendar, anchor } = store.get();
    views.update();
    title.textContent = periodTitle(calendar, anchor, ctx.data.weekStartsOn);
    for (const [button, word] of [
      [previous, 'Previous'],
      [next, 'Next'],
    ] as const) {
      const label = `${word} ${UNIT[calendar]}`;
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  };
  return { element, update };
}
