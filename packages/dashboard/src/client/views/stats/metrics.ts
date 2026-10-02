import type { StatMetric } from '../../../shared/types.js';
import type { IconName } from '../../lib/icons.js';
import { compact, compactMoney, count, money } from '../../lib/numbers.js';

export interface MetricInfo {
  label: string;
  icon: IconName;
  /** The full value, for tiles and tooltips. */
  format: (value: number) => string;
  /** A short value, for axis ticks. */
  axis: (value: number) => string;
}

/**
 * How each metric is named, drawn and formatted. Each one has its own color
 * (`--metric-<name>` in stats.css), and that color follows the metric on
 * every tab, so "green" always means income.
 */
export const METRICS: Record<StatMetric, MetricInfo> = {
  views: { label: 'Views', icon: 'eye', format: count, axis: compact },
  income: { label: 'Income', icon: 'dollar', format: money, axis: compactMoney },
  likes: { label: 'Likes', icon: 'heart', format: count, axis: compact },
  comments: { label: 'Comments', icon: 'comment', format: count, axis: compact },
  shares: { label: 'Shares', icon: 'share', format: count, axis: compact },
};
