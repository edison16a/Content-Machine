import type { DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { itemLabel, STATUS_LABELS, time12 } from '../lib/format.js';
import { attachHoverPreview } from '../lib/hover-preview.js';
import { icon } from '../lib/icons.js';
import type { View } from '../state.js';
import { statusBadge } from './badge.js';
import { platformStatuses, statusSummary } from './platform-statuses.js';

/**
 * One video in a slot: its poster, title and status. On a platform tab the
 * status is that platform's; on the All tab it is all three at once.
 */
export function videoCard(ctx: Context, item: DashboardItem, view: View): HTMLButtonElement {
  const frame = h(
    'span',
    { class: 'thumb' },
    img(item.thumb, `Poster for ${item.postTitle}`),
    h('span', { class: 'play-mark' }, icon('play')),
  );
  const status =
    view === 'all'
      ? statusSummary(item)
      : `${time12(item.platforms[view].time)}, ${STATUS_LABELS[item.platforms[view].status]}`;
  const card = h(
    'button',
    {
      type: 'button',
      class: `card${view === 'all' ? '' : ` status-${item.platforms[view].status}`}`,
      'data-id': item.id,
      title: item.postTitle,
      'aria-label': `Play ${itemLabel(item.id)}, ${item.postTitle}, ${status}`,
      on: { click: () => ctx.openItem(item, card) },
    },
    frame,
    h(
      'span',
      { class: 'card-body' },
      h('span', { class: 'card-title', text: item.postTitle }),
      view === 'all' ? platformStatuses(ctx, item) : statusBadge(item.platforms[view].status),
    ),
  );
  attachHoverPreview(card, frame, item.video, ctx.playerOpen);
  return card;
}

/** A quiet placeholder for a slot with nothing in it. */
export function emptySlot(): HTMLSpanElement {
  return h('span', { class: 'slot-empty', 'aria-label': 'Open slot' });
}
