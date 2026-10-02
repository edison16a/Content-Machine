import type { Context } from '../../context.js';
import { itemLabel } from '../../lib/format.js';
import { ALL_PROJECTS } from '../../lib/merge.js';
import { inPostingOrder } from '../../lib/selectors.js';
import { dropdown } from '../common/dropdown.js';

/**
 * Narrows the statistics to one video, with search. On the combined
 * calendar each video also names its project, since numbers repeat.
 */
export function videoPicker(ctx: Context): { element: HTMLElement; update: () => void } {
  return dropdown({
    name: 'Video',
    searchable: true,
    selected: () => ctx.store.get().statsItem,
    onPick: (value) => ctx.store.set({ statsItem: value }),
    options: () => [
      { value: 'all', label: 'All videos', mark: 'grid' },
      ...inPostingOrder(ctx.data.items).map((item) => ({
        value: item.key,
        label: `${itemLabel(item.id)} ${item.postTitle}`,
        thumb: item.thumb,
        ...(ctx.data.project === ALL_PROJECTS ? { detail: item.project } : {}),
      })),
    ],
  });
}
