import { STAT_METRICS, type StatMetric } from '../../../shared/types.js';
import type { Context } from '../../context.js';
import { h } from '../../lib/dom.js';
import type { StatsMode } from '../../state.js';
import { METRICS } from './metrics.js';
import { videoPicker } from './video-picker.js';

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

/** Total or Per day, as one segmented control like the calendar's view switch. */
function modeSwitch(ctx: Context): { element: HTMLElement; update: () => void } {
  const choices: [StatsMode, string][] = [
    ['total', 'Total'],
    ['daily', 'Per day'],
  ];
  const buttons = choices.map(([mode, label]) =>
    h('button', {
      type: 'button',
      class: 'segment',
      'data-mode': mode,
      text: label,
      on: { click: () => ctx.store.set({ statsMode: mode }) },
    }),
  );
  const element = h(
    'div',
    { class: 'segments', role: 'group', 'aria-label': 'Graph values' },
    ...buttons,
  );
  const update = (): void => {
    for (const button of buttons) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.mode === ctx.store.get().statsMode),
      );
    }
  };
  return { element, update };
}

/**
 * The one row of filters above the numbers: which graphs, which video, and
 * whether to read it as a table. They scope everything below them. The row
 * is built once and updated in place, so the video picker stays open
 * through background refreshes.
 */
export function statsControls(
  ctx: Context,
  onTable: () => void,
): { element: HTMLElement; update: (table: boolean) => void } {
  const chips = h('div', { class: 'chips-slot' });
  const picker = videoPicker(ctx);
  const tableButton = h('button', {
    type: 'button',
    class: 'text-button',
    on: { click: onTable },
  });
  const modes = modeSwitch(ctx);
  const element = h(
    'div',
    { class: 'stats-controls' },
    chips,
    h('div', { class: 'stats-controls-end' }, modes.element, picker.element, tableButton),
  );
  const update = (table: boolean): void => {
    chips.replaceChildren(metricChips(ctx));
    modes.update();
    picker.update();
    tableButton.textContent = table ? 'Show graphs' : 'Show table';
    tableButton.setAttribute('aria-pressed', String(table));
  };
  return { element, update };
}
