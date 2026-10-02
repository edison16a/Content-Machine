import {
  DASHBOARD_PLATFORMS,
  PLATFORM_NAMES,
  type DashboardItem,
  type DashboardPlatform,
} from '../../shared/types.js';
import type { Context } from '../context.js';
import { longDate, todayIn } from '../lib/dates.js';
import { h, replace } from '../lib/dom.js';
import { agoText, clockIn, itemLabel, time12 } from '../lib/format.js';
import { dueNow } from '../lib/selectors.js';

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

/** "due 12:00 PM, 3 h ago", with the platform named on the All tab. */
function dueText(item: DashboardItem, platform: DashboardPlatform, now: Date, named: boolean) {
  const entry = item.platforms[platform];
  const prefix = named ? `${PLATFORM_NAMES[platform]}, ` : '';
  return `${prefix}due ${time12(entry.time)}, ${agoText(now.getTime() - Date.parse(entry.iso))}`;
}

/**
 * The live strip above the calendar: the time where the project posts and
 * what to post right now if anything is overdue. It is redrawn every few
 * seconds, so it is always current. On the All tab the due list covers every
 * platform.
 */
export function renderNow(ctx: Context, container: HTMLElement): void {
  const view = ctx.store.get().platform;
  const { items, timezone } = ctx.data;
  const now = ctx.now();
  const platforms = view === 'all' ? DASHBOARD_PLATFORMS : [view];
  const due = platforms.flatMap((platform) =>
    dueNow(items, platform, now).map((item) => ({ item, platform })),
  );
  const zone = timezone.replace(/_/g, ' ');

  const clock = h(
    'div',
    { class: 'now-clock' },
    h('span', { class: 'now-time', text: clockIn(timezone, now) }),
    h('span', { class: 'now-date', text: `${longDate(todayIn(timezone, now))}, ${zone}` }),
  );

  const heading = view === 'all' ? 'Post now' : `Post on ${PLATFORM_NAMES[view]} now`;
  const duePanel =
    due.length === 0
      ? null
      : h(
          'div',
          { class: 'now-due', role: 'status' },
          h('h3', { text: heading }),
          ...due.map(({ item, platform }) =>
            itemButton(ctx, item, dueText(item, platform, now, view === 'all')),
          ),
        );

  replace(container, clock, duePanel);
}
