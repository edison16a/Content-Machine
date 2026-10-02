import { PLATFORM_NAMES } from '../../shared/types.js';
import type { Context } from '../context.js';
import { focusPlatform } from '../state.js';
import { dayName, monthDay } from '../lib/dates.js';
import { h, replace } from '../lib/dom.js';
import { time12 } from '../lib/format.js';
import { countsFor, nextUp, type Counts } from '../lib/selectors.js';

const STATS = [
  ['posted', 'Posted'],
  ['scheduled', 'Scheduled'],
  ['queued', 'Queued'],
  ['failed', 'Failed'],
] as const;

function stat(value: number, label: string, kind: string): HTMLElement {
  return h(
    'div',
    { class: `stat stat-${kind}` },
    h('span', { class: 'stat-value', text: String(value) }),
    h('span', { class: 'stat-label', text: label }),
  );
}

/** One thin bar showing how far along the queue is: posted, then scheduled. */
function progress(counts: Counts): HTMLElement {
  const total = Math.max(1, counts.total);
  const segment = (kind: string, value: number): HTMLElement | null =>
    value === 0
      ? null
      : h('span', { class: `bar-${kind}`, style: `width:${(value / total) * 100}%` });
  return h(
    'div',
    { class: 'bar', role: 'img', 'aria-label': `${counts.posted} of ${counts.total} posted` },
    segment('posted', counts.posted),
    segment('scheduled', counts.scheduled),
    segment('failed', counts.failed),
  );
}

/** The stats panel for the selected platform, with what posts next. */
export function renderOverview(ctx: Context, container: HTMLElement): void {
  const platform = focusPlatform(ctx.store.get().platform);
  const counts = countsFor(ctx.data.items, platform);
  const next = nextUp(ctx.data.items, platform, ctx.now());
  const nextText =
    next === undefined
      ? 'Nothing waiting'
      : `${dayName(next.date)} ${monthDay(next.date)}, ${time12(next.platforms[platform].time)}`;
  replace(
    container,
    h(
      'div',
      { class: 'stats', 'aria-label': `${PLATFORM_NAMES[platform]} summary` },
      h(
        'div',
        { class: 'stats-row' },
        stat(counts.total, 'Videos', 'total'),
        ...STATS.map(([key, label]) => stat(counts[key], label, key)),
        h(
          'div',
          { class: 'stat stat-next' },
          h('span', { class: 'stat-value', text: nextText }),
          h('span', { class: 'stat-label', text: 'Next up' }),
        ),
      ),
      progress(counts),
    ),
  );
}
