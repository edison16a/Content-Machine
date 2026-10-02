import type { StatMetric } from '../../../shared/types.js';
import { h } from '../../lib/dom.js';
import { svg, svgText } from '../../lib/svg.js';
import { METRICS } from './metrics.js';

/** Same drawing box as the real chart, so empty and full cards line up. */
const W = 560;
const H = 200;
const PAD = { top: 12, right: 16, bottom: 26, left: 56 };
const GRID_LINES = 4;
const DAY_MS = 24 * 60 * 60 * 1000;

function dateLabel(time: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }).format(
    new Date(time),
  );
}

/**
 * The frame of a chart with nothing in it yet: gridlines, a zero baseline,
 * the last week along the bottom and a quiet note in the middle. It keeps the
 * section the same shape before and after the first numbers arrive.
 */
export function emptyChart(metric: StatMetric, timeZone: string, now: Date): HTMLElement {
  const base = H - PAD.bottom;
  const step = (base - PAD.top) / GRID_LINES;
  const grid = Array.from({ length: GRID_LINES + 1 }, (_, i) => {
    const y = base - i * step;
    return svg('line', { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, class: 'chart-grid' });
  });
  const plot = svg(
    'svg',
    {
      viewBox: `0 0 ${W} ${H}`,
      class: 'chart-svg',
      role: 'img',
      'aria-label': `${METRICS[metric].label} over time: no readings yet`,
    },
    ...grid,
    svgText(
      { x: PAD.left - 8, y: base + 4, class: 'chart-axis', 'text-anchor': 'end' },
      METRICS[metric].axis(0),
    ),
    svgText(
      { x: PAD.left, y: H - 6, class: 'chart-axis' },
      dateLabel(now.getTime() - 6 * DAY_MS, timeZone),
    ),
    svgText(
      { x: W - PAD.right, y: H - 6, class: 'chart-axis', 'text-anchor': 'end' },
      dateLabel(now.getTime(), timeZone),
    ),
    svgText(
      {
        x: (PAD.left + W - PAD.right) / 2,
        // Halfway between two gridlines, so the note never sits on a line.
        y: base - (GRID_LINES / 2 + 0.5) * step + 4,
        class: 'chart-empty',
        'text-anchor': 'middle',
      },
      'No readings yet',
    ),
  );
  return h('div', { class: 'chart-frame' }, plot);
}
