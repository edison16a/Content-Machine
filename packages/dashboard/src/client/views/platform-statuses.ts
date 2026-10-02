import { DASHBOARD_PLATFORMS, PLATFORM_NAMES, type DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { STATUS_LABELS } from '../lib/format.js';

/** "TikTok: Posted, Instagram: Queued, YouTube: Scheduled", for screen readers and tooltips. */
export function statusSummary(item: DashboardItem): string {
  return DASHBOARD_PLATFORMS.map(
    (platform) => `${PLATFORM_NAMES[platform]}: ${STATUS_LABELS[item.platforms[platform].status]}`,
  ).join(', ');
}

/**
 * Where one video stands on every platform: each platform's logo with a
 * status dot. The dots look like the calendar's badges, and the tooltip says
 * it in words, so status never rests on color alone.
 */
export function platformStatuses(ctx: Context, item: DashboardItem): HTMLElement {
  return h(
    'span',
    { class: 'video-platforms', title: statusSummary(item) },
    ...DASHBOARD_PLATFORMS.map((platform) => {
      const { status } = item.platforms[platform];
      const logo = ctx.data.logos.platforms[platform];
      return h(
        'span',
        { class: `video-platform status-${status}` },
        logo === null ? h('span', { text: PLATFORM_NAMES[platform] }) : img(logo, '', 'row-logo'),
        h('span', { class: 'dot', 'aria-hidden': 'true' }),
      );
    }),
  );
}
