import { STAT_METRICS, type StatMetric } from '../../../shared/types.js';
import type { Context } from '../../context.js';
import { h } from '../../lib/dom.js';
import { itemLabel } from '../../lib/format.js';
import { byId } from '../../lib/selectors.js';
import { METRICS } from './metrics.js';

/** A toggle per metric. The short colored line matches that metric's graph. */
function metricChips(ctx: Context): HTMLElement {
  const chosen = ctx.store.get().metrics;
  const toggle = (metric: StatMetric): void => {
    const next = chosen.includes(metric)
      ? chosen.filter((m) => m !== metric)
      : STAT_METRICS.filter((m) => m === metric || chosen.includes(m));
    ctx.store.set({ metrics: next });
  };
  return h(
    'div',
    { class: 'chips', role: 'group', 'aria-label': 'Graphs to show' },
    ...STAT_METRICS.map((metric) =>
      h(
        'button',
        {
          type: 'button',
          class: `chip metric-${metric}`,
          'aria-pressed': String(chosen.includes(metric)),
          on: { click: () => toggle(metric) },
        },
        h('span', { class: 'line-key', 'aria-hidden': 'true' }),
        METRICS[metric].label,
      ),
    ),
  );
}

/** Narrows every number below it to one video, or shows them all. */
function videoSelect(ctx: Context): HTMLSelectElement {
  const current = ctx.store.get().statsItem;
  const select = h(
    'select',
    {
      class: 'stats-video',
      'aria-label': 'Video',
      on: {
        change: () =>
          ctx.store.set({ statsItem: select.value === 'all' ? 'all' : Number(select.value) }),
      },
    },
    h('option', { value: 'all', text: 'All videos' }),
    ...byId(ctx.data.items).map((item) =>
      h('option', { value: item.id, text: `${itemLabel(item.id)} ${item.postTitle}` }),
    ),
  );
  select.value = String(current);
  return select;
}

/**
 * The one row of filters above the numbers: which graphs, which video, and
 * whether to read it as a table. They scope everything below them.
 */
export function statsControls(
  ctx: Context,
  table: boolean,
  onTable: (table: boolean) => void,
): HTMLElement {
  return h(
    'div',
    { class: 'stats-controls' },
    metricChips(ctx),
    h(
      'div',
      { class: 'stats-controls-end' },
      videoSelect(ctx),
      h('button', {
        type: 'button',
        class: 'text-button',
        'aria-pressed': String(table),
        text: table ? 'Show graphs' : 'Show table',
        on: { click: () => onTable(!table) },
      }),
    ),
  );
}
