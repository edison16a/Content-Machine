import type { DashboardStatus } from '../../shared/types.js';
import { h } from '../lib/dom.js';
import { STATUS_LABELS } from '../lib/format.js';

/**
 * A status as a small dot and a word. Posted is a solid accent dot, scheduled
 * an accent ring, queued a gray dot, failed a bold word with a light dot.
 */
export function statusBadge(status: DashboardStatus): HTMLSpanElement {
  return h(
    'span',
    { class: `badge badge-${status}` },
    h('span', { class: 'dot', 'aria-hidden': 'true' }),
    STATUS_LABELS[status],
  );
}
