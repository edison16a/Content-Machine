import type { Context } from '../../context.js';
import { h } from '../../lib/dom.js';
import { platformSlotTime, time12 } from '../../lib/format.js';
import { slotIndex } from '../../lib/selectors.js';
import { emptySlot, videoCard } from '../card.js';

/**
 * A day's slots in order, each with its time and its video (or an empty
 * placeholder). A platform tab shows that platform's staggered time; the All
 * tab shows the base slot time, since the three platforms post minutes apart.
 */
export function slotList(ctx: Context, date: string): HTMLOListElement {
  const { data } = ctx;
  const view = ctx.store.get().platform;
  const index = slotIndex(data.items);
  return h(
    'ol',
    { class: 'slots' },
    ...data.slots.map((slot, i) => {
      const item = index.get(`${date}#${i}`);
      const time =
        view === 'all'
          ? slot
          : (item?.platforms[view].time ?? platformSlotTime(slot, data.stagger[view]));
      return h(
        'li',
        { class: 'slot' },
        h('span', { class: 'slot-time', text: time12(time) }),
        item === undefined ? emptySlot() : videoCard(ctx, item, view),
      );
    }),
  );
}
