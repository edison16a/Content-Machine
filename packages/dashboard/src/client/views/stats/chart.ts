import type { StatsPoint } from '../../../shared/stats.js';
import type { StatMetric } from '../../../shared/types.js';
import { h } from '../../lib/dom.js';
import { niceTicks } from '../../lib/numbers.js';
import { svg, svgText } from '../../lib/svg.js';
import { METRICS } from './metrics.js';

/** The drawing box. The SVG scales to its card; these are its own units. */
const W = 560;
const H = 200;
const PAD = { top: 12, right: 16, bottom: 26, left: 56 };

function dateLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

function stampLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Pixel positions for every point, on one shared time axis and a zero-based value axis. */
function layout(points: readonly StatsPoint[], metric: StatMetric, top: number) {
  const times = points.map((p) => Date.parse(p.at));
  const first = times[0] ?? 0;
  const span = (times.at(-1) ?? first) - first;
  const x = (t: number): number =>
    span === 0
      ? (PAD.left + W - PAD.right) / 2
      : PAD.left + ((t - first) / span) * (W - PAD.left - PAD.right);
  const y = (v: number): number => H - PAD.bottom - (v / top) * (H - PAD.top - PAD.bottom);
  return points.map((p, i) => ({ x: x(times[i] ?? first), y: y(p[metric]), point: p }));
}

/**
 * One metric over time as a thin line with a soft wash under it. Hover or
 * use the arrow keys to read any point: a crosshair snaps to the nearest
 * reading and a tooltip shows its value and time.
 */
export function lineChart(
  points: readonly StatsPoint[],
  metric: StatMetric,
  timeZone: string,
): HTMLElement {
  const info = METRICS[metric];
  const ticks = niceTicks(Math.max(...points.map((p) => p[metric]), 0));
  const top = ticks.at(-1) ?? 1;
  const at = layout(points, metric, top);
  const base = H - PAD.bottom;

  const grid = ticks.map((tick) => {
    const y = base - (tick / top) * (H - PAD.top - PAD.bottom);
    return svg(
      'g',
      {},
      svg('line', { x1: PAD.left, x2: W - PAD.right, y1: y, y2: y, class: 'chart-grid' }),
      svgText(
        { x: PAD.left - 8, y: y + 4, class: 'chart-axis', 'text-anchor': 'end' },
        info.axis(tick),
      ),
    );
  });
  const firstAt = points[0]?.at;
  const lastAt = points.at(-1)?.at;
  const xLabels = [
    firstAt === undefined
      ? null
      : svgText({ x: PAD.left, y: H - 6, class: 'chart-axis' }, dateLabel(firstAt, timeZone)),
    lastAt === undefined || lastAt === firstAt
      ? null
      : svgText(
          { x: W - PAD.right, y: H - 6, class: 'chart-axis', 'text-anchor': 'end' },
          dateLabel(lastAt, timeZone),
        ),
  ].filter((label): label is SVGTextElement => label !== null);

  const line = at
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join('');
  const firstX = at[0]?.x ?? PAD.left;
  const lastX = at.at(-1)?.x ?? PAD.left;
  const area = `${line}L${lastX.toFixed(1)},${base}L${firstX.toFixed(1)},${base}Z`;
  const end = at.at(-1);

  const cross = svg('line', { y1: PAD.top, y2: base, class: 'chart-cross', visibility: 'hidden' });
  const marker = svg('circle', { r: 4, class: 'chart-dot chart-marker', visibility: 'hidden' });
  const plot = svg(
    'svg',
    {
      viewBox: `0 0 ${W} ${H}`,
      class: 'chart-svg',
      role: 'img',
      'aria-label': `${info.label} over time`,
    },
    ...grid,
    ...xLabels,
    svg('path', { d: area, class: 'chart-area' }),
    svg('path', { d: line, class: 'chart-line' }),
    ...(end === undefined
      ? []
      : [svg('circle', { cx: end.x, cy: end.y, r: 4, class: 'chart-dot' })]),
    cross,
    marker,
  );

  const tip = h('div', { class: 'chart-tip', hidden: true });
  const frame = h('div', { class: 'chart-frame', tabindex: 0 }, plot, tip);
  let index = at.length - 1;
  const show = (i: number): void => {
    const p = at[i];
    if (p === undefined) return;
    index = i;
    for (const [node, attrs] of [
      [cross, { x1: p.x, x2: p.x }],
      [marker, { cx: p.x, cy: p.y }],
    ] as const) {
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
      node.setAttribute('visibility', 'visible');
    }
    tip.replaceChildren(
      h('strong', { text: info.format(p.point[metric]) }),
      h('span', { text: stampLabel(p.point.at, timeZone) }),
    );
    tip.hidden = false;
    tip.style.left = `${(p.x / W) * 100}%`;
    tip.style.top = `${(p.y / H) * 100}%`;
    tip.classList.toggle('flip', p.x > W * 0.66);
  };
  const hide = (): void => {
    cross.setAttribute('visibility', 'hidden');
    marker.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  frame.addEventListener('pointermove', (event) => {
    const box = plot.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    let nearest = 0;
    for (const [i, p] of at.entries()) {
      if (Math.abs(p.x - x) < Math.abs((at[nearest]?.x ?? 0) - x)) nearest = i;
    }
    show(nearest);
  });
  frame.addEventListener('pointerleave', hide);
  frame.addEventListener('focus', () => show(index));
  frame.addEventListener('blur', hide);
  frame.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    show(Math.min(at.length - 1, Math.max(0, index + (event.key === 'ArrowRight' ? 1 : -1))));
  });
  return frame;
}
