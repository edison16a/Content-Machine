import type { StatsPoint } from '../../../shared/stats.js';
import type { StatMetric } from '../../../shared/types.js';
import { h } from '../../lib/dom.js';
import { stamp } from '../../lib/format.js';
import { METRICS } from './metrics.js';

/**
 * The same numbers as the graphs, as a table: newest first, one column per
 * chosen metric. It is the way to read exact values without hovering.
 */
export function statsTable(
  points: readonly StatsPoint[],
  metrics: readonly StatMetric[],
  timeZone: string,
): HTMLElement {
  return h(
    'div',
    { class: 'stats-table-wrap' },
    h(
      'table',
      { class: 'stats-table' },
      h(
        'thead',
        {},
        h(
          'tr',
          {},
          h('th', { text: 'Recorded' }),
          ...metrics.map((m) => h('th', { text: METRICS[m].label })),
        ),
      ),
      h(
        'tbody',
        {},
        points.length === 0
          ? h(
              'tr',
              {},
              h('td', {
                class: 'stats-table-empty',
                colspan: metrics.length + 1,
                text: 'No readings yet',
              }),
            )
          : null,
        ...[...points]
          .reverse()
          .map((point) =>
            h(
              'tr',
              {},
              h('td', { text: stamp(point.at, timeZone) }),
              ...metrics.map((m) => h('td', { text: METRICS[m].format(point[m]) })),
            ),
          ),
      ),
    ),
  );
}
