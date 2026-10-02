import { DASHBOARD_PLATFORMS, PLATFORM_NAMES, type DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { dayName, monthDay } from '../lib/dates.js';
import { h, img, replace } from '../lib/dom.js';
import { itemLabel, STATUS_LABELS } from '../lib/format.js';
import { attachHoverPreview } from '../lib/hover-preview.js';
import { icon } from '../lib/icons.js';
import { byId } from '../lib/selectors.js';

/**
 * Where one video stands on each platform: the platform's logo with a status
 * dot. The dot uses the same look as the calendar's badges, and the label
 * says it in words, so status never rests on color alone.
 */
function platformStatuses(ctx: Context, item: DashboardItem): HTMLElement {
  return h(
    'span',
    { class: 'video-platforms' },
    ...DASHBOARD_PLATFORMS.map((platform) => {
      const { status } = item.platforms[platform];
      const logo = ctx.data.logos.platforms[platform];
      return h(
        'span',
        {
          class: `video-platform status-${status}`,
          title: `${PLATFORM_NAMES[platform]}: ${STATUS_LABELS[status]}`,
          'aria-label': `${PLATFORM_NAMES[platform]}: ${STATUS_LABELS[status]}`,
        },
        logo === null ? h('span', { text: PLATFORM_NAMES[platform] }) : img(logo, '', 'row-logo'),
        h('span', { class: 'dot', 'aria-hidden': 'true' }),
      );
    }),
  );
}

function videoTile(ctx: Context, item: DashboardItem): HTMLButtonElement {
  const frame = h(
    'span',
    { class: 'thumb' },
    img(item.thumb, `Poster for ${item.postTitle}`),
    h('span', { class: 'play-mark' }, icon('play')),
  );
  const tile = h(
    'button',
    {
      type: 'button',
      class: 'card video-tile',
      'data-id': item.id,
      title: item.postTitle,
      'aria-label': `Play ${itemLabel(item.id)}, ${item.postTitle}`,
      on: { click: () => ctx.openItem(item, tile) },
    },
    frame,
    h(
      'span',
      { class: 'card-body' },
      h('span', { class: 'card-title', text: item.postTitle }),
      h('span', {
        class: 'video-date',
        text: `${itemLabel(item.id)}, ${dayName(item.date)} ${monthDay(item.date)}`,
      }),
      platformStatuses(ctx, item),
    ),
  );
  attachHoverPreview(tile, frame, item.video, ctx.playerOpen);
  return tile;
}

/**
 * The All tab's main view: every video in posting order, each showing its
 * status on all three platforms at once.
 */
export function renderVideos(ctx: Context, container: HTMLElement): void {
  const items = byId(ctx.data.items);
  replace(
    container,
    h(
      'div',
      { class: 'section-head' },
      h('h2', { class: 'section-title', text: 'Videos' }),
      h('span', { class: 'section-meta', text: `${items.length} in posting order` }),
    ),
    items.length === 0
      ? h('p', { class: 'section-empty', text: 'No videos yet. Rendered videos appear here.' })
      : h('div', { class: 'video-grid' }, ...items.map((item) => videoTile(ctx, item))),
  );
}
