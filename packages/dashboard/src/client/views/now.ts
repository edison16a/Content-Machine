import { PLATFORM_NAMES, type DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { longDate, todayIn } from '../lib/dates.js';
import { h, replace } from '../lib/dom.js';
import { agoText, clockIn, itemLabel, time12, untilText } from '../lib/format.js';
import { dueNow, nextUp } from '../lib/selectors.js';

/** A row you can click to open that video in the player. */
function itemButton(ctx: Context, item: DashboardItem, when: string): HTMLButtonElement {
  return h(
    'button',
    { type: 'button', class: 'now-item', on: { click: () => ctx.openItem(item) } },
    h('span', { class: 'now-id', text: itemLabel(item.id) }),
    h('span', { class: 'now-title', text: item.postTitle }),
    h('span', { class: 'now-when', text: when }),
  );
}

/**
 * The live strip above the calendar: the time where the project posts, what
 * to post right now if anything is overdue, and a countdown to the next
 * slot. It is redrawn every few seconds, so it is always current.
 */
export function renderNow(ctx: Context, container: HTMLElement): void {
  const { platform } = ctx.store.get();
  const { items, timezone } = ctx.data;
  const now = ctx.now();
  const name = PLATFORM_NAMES[platform];
  const due = dueNow(items, platform, now);
  const next = nextUp(items, platform, now);
  const zone = timezone.replace(/_/g, ' ');

  const clock = h(
    'div',
    { class: 'now-clock' },
    h('span', { class: 'now-time', text: clockIn(timezone, now) }),
    h('span', { class: 'now-date', text: `${longDate(todayIn(timezone, now))}, ${zone}` }),
    ctx.live ? h('span', { class: 'now-live', text: 'Live' }) : null,
  );

  const duePanel =
    due.length === 0
      ? null
      : h(
          'div',
          { class: 'now-due', role: 'status' },
          h('h3', { text: `Post on ${name} now` }),
          ...due.map((item) =>
            itemButton(
              ctx,
              item,
              `due ${time12(item.platforms[platform].time)}, ${agoText(now.getTime() - Date.parse(item.platforms[platform].iso))}`,
            ),
          ),
        );

  const nextPanel = h(
    'div',
    { class: 'now-next' },
    h('h3', { text: `Next on ${name}` }),
    next === undefined
      ? h('p', { class: 'now-none', text: 'Nothing waiting.' })
      : itemButton(
          ctx,
          next,
          `${time12(next.platforms[platform].time)}, ${untilText(Date.parse(next.platforms[platform].iso) - now.getTime())}`,
        ),
  );

  replace(container, clock, duePanel, nextPanel);
}
