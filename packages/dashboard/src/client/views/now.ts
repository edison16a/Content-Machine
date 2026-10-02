import {
  DASHBOARD_PLATFORMS,
  PLATFORM_NAMES,
  type DashboardItem,
  type DashboardPlatform,
} from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, replace } from '../lib/dom.js';
import { agoText, itemLabel, time12 } from '../lib/format.js';
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
 * The "Post now" strip above the calendar: queued posts whose time has come.
 * It is redrawn every few seconds and hides itself when nothing is due. On
 * the All tab it covers every platform.
 */
export function renderNow(ctx: Context, container: HTMLElement): void {
  const view = ctx.store.get().platform;
  const { items } = ctx.data;
  const now = ctx.now();
  const platforms = view === 'all' ? DASHBOARD_PLATFORMS : [view];
  const due = platforms.flatMap((platform) =>
    dueNow(items, platform, now).map((item) => ({ item, platform })),
  );
  const heading = view === 'all' ? 'Post now' : `Post on ${PLATFORM_NAMES[view]} now`;
  container.hidden = due.length === 0;
  if (due.length === 0) return;
  replace(
    container,
    h(
      'div',
      { class: 'now-due', role: 'status' },
      h('h3', { text: heading }),
      ...due.map(({ item, platform }) =>
        itemButton(ctx, item, dueText(item, platform, now, view === 'all')),
      ),
    ),
  );
}
