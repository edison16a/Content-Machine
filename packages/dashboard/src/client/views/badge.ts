import type { DashboardStatus } from '../../shared/types.js';
import { h } from '../lib/dom.js';
import { STATUS_LABELS } from '../lib/format.js';
import { icon, type IconName } from '../lib/icons.js';

const ICONS: Partial<Record<DashboardStatus, IconName>> = {
  scheduled: 'clock',
  posted: 'check',
  failed: 'alert',
};

/**
 * A status pill. Queued is quiet and neutral, scheduled is outlined in the
 * accent, posted is filled with the accent, failed is inverted so it stands
 * out without adding a second color.
 */
export function statusBadge(status: DashboardStatus): HTMLSpanElement {
  const name = ICONS[status];
  return h(
    'span',
    { class: `badge badge-${status}` },
    name === undefined ? null : icon(name, 'icon icon-xs'),
    STATUS_LABELS[status],
  );
}
