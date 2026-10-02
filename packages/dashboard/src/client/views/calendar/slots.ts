import type { Context } from '../../context.js';
import { h } from '../../lib/dom.js';
import { platformSlotTime, time12 } from '../../lib/format.js';
import { slotIndex } from '../../lib/selectors.js';
import { emptySlot, videoCard } from '../card.js';

/**
 * A day's slots in order, each with its time and its videos (or an empty
 * placeholder). A slot usually holds one video; on the combined calendar
 * two projects can share one, and both cards show. A platform tab shows that platform's staggered time; the All
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
      const items = index.get(`${date}#${i}`) ?? [];
      const first = items[0];
      const time =
        view === 'all'
          ? slot
          : (first?.platforms[view].time ?? platformSlotTime(slot, data.stagger[view]));
      return h(
        'li',
        { class: 'slot' },
        h('span', { class: 'slot-time', text: time12(time) }),
        ...(items.length === 0 ? [emptySlot()] : items.map((item) => videoCard(ctx, item, view))),
      );
    }),
  );
}
