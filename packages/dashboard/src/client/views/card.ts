import type { DashboardItem, DashboardPlatform } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { duration, itemLabel, STATUS_LABELS, time12 } from '../lib/format.js';
import { attachHoverPreview } from '../lib/hover-preview.js';
import { icon } from '../lib/icons.js';
import { timePassed } from '../lib/selectors.js';
import { statusBadge } from './badge.js';

/** One video in a slot: poster with a play mark, id, title, length and status. */
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
  const late = timePassed(item, platform, ctx.now());
  const card = h(
    'button',
    {
      type: 'button',
      class: `card status-${entry.status}`,
      'data-id': item.id,
      'aria-label': `Play ${itemLabel(item.id)}, ${item.postTitle}, ${time12(entry.time)}, ${STATUS_LABELS[entry.status]}`,
      on: { click: () => ctx.openItem(item, card) },
    },
    frame,
    h(
      'span',
      { class: 'card-body' },
      h(
        'span',
        { class: 'card-meta' },
        h('span', { class: 'card-id', text: itemLabel(item.id) }),
        h('span', { text: duration(item.duration) }),
      ),
      h('span', { class: 'card-title', text: item.postTitle }),
      h(
        'span',
        { class: 'card-foot' },
        statusBadge(entry.status),
        late ? h('span', { class: 'passed', text: 'Time passed' }) : null,
      ),
    ),
  );
  attachHoverPreview(card, frame, item.video, ctx.playerOpen);
  return card;
}

/** A quiet dashed placeholder for a slot with nothing in it. */
export function emptySlot(): HTMLSpanElement {
  return h('span', { class: 'slot-empty', text: 'Open slot' });
}
