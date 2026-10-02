import { STAT_METRICS } from '../../../shared/types.js';
import type { Totals } from '../../../shared/stats.js';
import { h } from '../../lib/dom.js';
import { icon } from '../../lib/icons.js';
import { METRICS } from './metrics.js';

/**
 * The headline numbers: views with the eye, estimated income in dollars to
 * six decimals, then likes, comments and shares. The icon carries the
 * metric's color; the number itself stays in the text color so it is always
 * readable.
 */
export function statTiles(totals: Totals): HTMLElement {
  return h(
    'div',
    { class: 'stat-tiles' },
    ...STAT_METRICS.map((metric) =>
      h(
        'div',
        { class: `stat-tile metric-${metric}` },
        h(
          'span',
          { class: 'stat-tile-label' },
          icon(METRICS[metric].icon, 'icon metric-icon'),
          METRICS[metric].label,
        ),
        h('span', { class: 'stat-tile-value', text: METRICS[metric].format(totals[metric]) }),
      ),
    ),
  );
}
