import type { DashboardItem, DashboardPlatform } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { itemLabel, STATUS_LABELS, time12 } from '../lib/format.js';
import { attachHoverPreview } from '../lib/hover-preview.js';
import { icon } from '../lib/icons.js';
import { statusBadge } from './badge.js';

/** One video in a slot: its poster, title and status. Nothing more. */
export function videoCard(
  ctx: Context,
  item: DashboardItem,
  platform: DashboardPlatform,
): HTMLButtonElement {
  const entry = item.platforms[platform];
  const frame = h(
    'span',
    { class: 'thumb' },
    img(item.thumb, `Poster for ${item.postTitle}`),
    h('span', { class: 'play-mark' }, icon('play')),
  );
  const card = h(
    'button',
    {
      type: 'button',
      class: `card status-${entry.status}`,
      'data-id': item.id,
      title: item.postTitle,
      'aria-label': `Play ${itemLabel(item.id)}, ${item.postTitle}, ${time12(entry.time)}, ${STATUS_LABELS[entry.status]}`,
      on: { click: () => ctx.openItem(item, card) },
    },
    frame,
    h(
      'span',
      { class: 'card-body' },
      h('span', { class: 'card-title', text: item.postTitle }),
      statusBadge(entry.status),
    ),
  );
  attachHoverPreview(card, frame, item.video, ctx.playerOpen);
  return card;
}

/** A quiet placeholder for a slot with nothing in it. */
export function emptySlot(): HTMLSpanElement {
  return h('span', { class: 'slot-empty', 'aria-label': 'Open slot' });
}
