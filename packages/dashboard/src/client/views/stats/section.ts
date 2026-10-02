import { statsTimeline, statsTotals, type StatsFilter } from '../../../shared/stats.js';
import type { Context } from '../../context.js';
import { h, replace } from '../../lib/dom.js';
import { clockIn } from '../../lib/format.js';
import { icon } from '../../lib/icons.js';
import { lineChart } from './chart.js';
import { statsControls } from './controls.js';
import { METRICS } from './metrics.js';
import { statsTable } from './table.js';
import { statTiles } from './tiles.js';

export interface StatsSection {
  element: HTMLElement;
  /** Redraws from the current data and choices. */
  update: () => void;
}

/** One card per chosen metric: its name, its latest total and its graph. */
function chartCards(ctx: Context, filter: StatsFilter): HTMLElement {
  const points = statsTimeline(ctx.data.stats, filter);
  const totals = statsTotals(ctx.data.stats, filter);
  return h(
    'div',
    { class: 'chart-grid-cards' },
    ...ctx.store
      .get()
      .metrics.map((metric) =>
        h(
          'figure',
          { class: `chart-card metric-${metric}` },
          h(
            'figcaption',
            { class: 'chart-head' },
            h('span', { class: 'line-key', 'aria-hidden': 'true' }),
            h('span', { class: 'chart-title', text: `${METRICS[metric].label} over time` }),
            h('span', { class: 'chart-value', text: METRICS[metric].format(totals[metric]) }),
          ),
          lineChart(points, metric, ctx.data.timezone),
        ),
      ),
  );
}

/**
 * Statistics under the calendar: totals for the selected tab, then a graph
 * per metric over time. Numbers come from plan/stats.json, which the stats
 * command fills in. The Refresh button rereads it right away; the page also
 * rereads it every minute and whenever you switch tabs.
 */
export function renderStatsSection(ctx: Context): StatsSection {
  const meta = h('span', { class: 'section-meta' });
  const refresh = h(
    'button',
    { type: 'button', class: 'button button-sm' },
    icon('refresh'),
    h('span', { class: 'label', text: 'Refresh' }),
  );
  const body = h('div', { class: 'stats-body' });
  const element = h(
    'section',
    { class: 'stats-section', 'aria-label': 'Statistics' },
    h(
      'div',
      { class: 'section-head' },
      h('h2', { class: 'section-title', text: 'Statistics' }),
      meta,
      h('span', { class: 'section-spacer' }),
      refresh,
    ),
    body,
  );
  let table = false;

  const update = (): void => {
    const { platform, statsItem, metrics } = ctx.store.get();
    const exists = statsItem === 'all' || ctx.data.items.some((item) => item.id === statsItem);
    const filter: StatsFilter = { platform, itemId: exists ? statsItem : 'all' };
    const points = statsTimeline(ctx.data.stats, filter);
    const recorded = ctx.data.stats.snapshots.length > 0;
    meta.textContent = `Updated ${clockIn(ctx.data.timezone, ctx.now())}`;
    replace(
      body,
      statsControls(ctx, table, (next) => {
        table = next;
        update();
      }),
      statTiles(statsTotals(ctx.data.stats, filter)),
      !recorded
        ? h('p', {
            class: 'section-empty',
            text: 'No numbers recorded yet. Ask Claude to update your stats, and they show up here.',
          })
        : metrics.length === 0
          ? h('p', { class: 'section-empty', text: 'Pick a metric above to see its graph.' })
          : table
            ? statsTable(points, metrics, ctx.data.timezone)
            : chartCards(ctx, filter),
    );
  };

  refresh.addEventListener('click', () => {
    refresh.disabled = true;
    void ctx.refresh().finally(() => {
      refresh.disabled = false;
      update();
    });
  });
  return { element, update };
}
