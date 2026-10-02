import { ZERO_TOTALS, statsTimeline, type StatsPoint, type Totals } from '../../../shared/stats.js';
import type { Context } from '../../context.js';
import { h, replace } from '../../lib/dom.js';
import { clockIn } from '../../lib/format.js';
import { icon } from '../../lib/icons.js';
import { applyOverride, loadOverride } from '../../lib/override.js';
import { lineChart } from './chart.js';
import { emptyChart } from './empty-chart.js';
import { statsControls } from './controls.js';
import { METRICS } from './metrics.js';
import { statsTable } from './table.js';
import { statTiles } from './tiles.js';

/** Shortest time the Refresh spinner shows, so a quick reread is still visible. */
const MIN_SPIN_MS = 700;

export interface StatsSection {
  element: HTMLElement;
  /** Redraws from the current data and choices. */
  update: () => void;
}

/** The totals at the newest point, or zeros before any reading. */
function totalsOf(points: readonly StatsPoint[]): Totals {
  const last = points.at(-1);
  if (last === undefined) return { ...ZERO_TOTALS };
  const { views, income, likes, comments, shares } = last;
  return { views, income, likes, comments, shares };
}

/**
 * The points the section shows: the recorded timeline for the selection,
 * with any custom numbers from the admin panel as the newest point. Custom
 * numbers are totals for the whole selection, so they only apply when
 * looking at all videos, not one. `custom` says whether they were used.
 */
function shownPoints(ctx: Context): { points: StatsPoint[]; custom: boolean } {
  const { platform, statsItem, project } = ctx.store.get();
  const exists = statsItem === 'all' || ctx.data.items.some((item) => item.key === statsItem);
  const itemKey = exists ? statsItem : 'all';
  const points = statsTimeline(ctx.data.stats, { platform, itemKey });
  const override = itemKey === 'all' ? loadOverride(project) : undefined;
  if (override === undefined) return { points, custom: false };
  return {
    points: applyOverride(points, override, ctx.data.stats.rates, platform, ctx.now()),
    custom: true,
  };
}

/** One card per chosen metric: its name, its latest total and its graph. */
function chartCards(ctx: Context, points: readonly StatsPoint[]): HTMLElement {
  const totals = totalsOf(points);
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
          points.length === 0
            ? emptyChart(metric, ctx.data.timezone, ctx.now())
            : lineChart(points, metric, ctx.data.timezone),
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
  const customBadge = h('span', {
    class: 'sample-badge',
    text: 'Custom numbers',
    title: 'Set in the admin panel. Clear them there to see the recorded numbers.',
    hidden: true,
  });
  const sampleBadge = h('span', {
    class: 'sample-badge',
    text: 'Test data',
    title:
      'Made-up numbers, shown instead of your real ones. Turn off with: npm run cm -- testdata <project> off',
    hidden: true,
  });
  const refresh = h(
    'button',
    { type: 'button', class: 'button button-sm' },
    icon('refresh'),
    h('span', { class: 'label', text: 'Refresh' }),
  );
  const body = h('div', { class: 'stats-results' });
  let table = false;
  const controls = statsControls(ctx, () => {
    table = !table;
    update();
  });
  const element = h(
    'section',
    { class: 'stats-section', 'aria-label': 'Statistics' },
    h(
      'div',
      { class: 'section-head' },
      h('h2', { class: 'section-title', text: 'Statistics' }),
      sampleBadge,
      customBadge,
      meta,
      h('span', { class: 'section-spacer' }),
      refresh,
    ),
    h('div', { class: 'stats-body' }, controls.element, body),
  );

  function update(): void {
    const { metrics } = ctx.store.get();
    const { points, custom } = shownPoints(ctx);
    sampleBadge.hidden = !ctx.data.stats.sample;
    customBadge.hidden = !custom;
    meta.textContent = `Updated ${clockIn(ctx.data.timezone, ctx.now())}`;
    controls.update(table);
    replace(
      body,
      statTiles(totalsOf(points)),
      metrics.length === 0
        ? h('p', { class: 'section-empty', text: 'Pick a metric above to see its graph.' })
        : table
          ? statsTable(points, metrics, ctx.data.timezone)
          : chartCards(ctx, points),
    );
  }

  // Rereading a local file takes a few milliseconds, too fast to see. Keep
  // the spinner up for a moment so a click always looks like it did something.
  const label = refresh.querySelector('.label');
  refresh.addEventListener('click', () => {
    if (refresh.classList.contains('is-loading')) return;
    refresh.classList.add('is-loading');
    refresh.setAttribute('aria-busy', 'true');
    if (label !== null) label.textContent = 'Refreshing';
    const pause = new Promise((resolve) => window.setTimeout(resolve, MIN_SPIN_MS));
    void Promise.all([ctx.refresh(), pause]).finally(() => {
      refresh.classList.remove('is-loading');
      refresh.removeAttribute('aria-busy');
      if (label !== null) label.textContent = 'Refresh';
      update();
    });
  });
  return { element, update };
}
