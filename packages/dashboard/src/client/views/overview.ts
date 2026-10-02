import { PLATFORM_NAMES } from '../../shared/types.js';
import type { Context } from '../context.js';
import { longDate } from '../lib/dates.js';
import { h, replace } from '../lib/dom.js';
import { itemLabel, stamp, time12 } from '../lib/format.js';
import { countsFor, nextUp } from '../lib/selectors.js';

function chip(label: string, value: number, kind: string): HTMLElement {
  return h(
    'div',
    { class: `chip chip-${kind}` },
    h('span', { class: 'chip-value', text: String(value) }),
    h('span', { class: 'chip-label', text: label }),
  );
}

/** Summary chips for the selected platform, plus what posts next and when the data was made. */
export function renderOverview(ctx: Context, container: HTMLElement): void {
  const { data } = ctx;
  const { platform } = ctx.store.get();
  const counts = countsFor(data.items, platform);
  const next = nextUp(data.items, platform, ctx.now());
  const nextText =
    next === undefined
      ? 'Nothing waiting'
      : `${itemLabel(next.id)} on ${longDate(next.date)} at ${time12(next.platforms[platform].time)}`;
  replace(
    container,
    h(
      'div',
      { class: 'chips', 'aria-label': `${PLATFORM_NAMES[platform]} summary` },
      chip('Total', counts.total, 'total'),
      chip('Queued', counts.queued, 'queued'),
      chip('Scheduled', counts.scheduled, 'scheduled'),
      chip('Posted', counts.posted, 'posted'),
      chip('Failed', counts.failed, 'failed'),
    ),
    h(
      'dl',
      { class: 'meta' },
      h('div', {}, h('dt', { text: 'Next up' }), h('dd', { text: nextText })),
      h(
        'div',
        {},
        h('dt', { text: 'Updated' }),
        h('dd', { text: stamp(data.updatedAt, data.timezone) }),
      ),
    ),
  );
}
