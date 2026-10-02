import { describe, expect, it } from 'vitest';
import {
  incomeFor,
  statsTimeline,
  statsTotals,
  type DashboardSnapshot,
  type DashboardStats,
} from '@content-machine/dashboard';
import { compact, compactMoney, count, money, niceTicks } from '../src/client/lib/numbers.js';
import { placeholderProject } from '../src/client/lib/projects.js';

function reading(
  at: string,
  platform: DashboardSnapshot['platform'],
  itemId: number,
  views: number,
): DashboardSnapshot {
  return { at, platform, itemId, views, likes: views / 10, comments: 1, shares: 2 };
}

const stats: DashboardStats = {
  rates: { tiktok: 0.4, instagram: 0.01, youtube: 0.07 },
  sample: false,
  snapshots: [
    reading('2026-10-02T00:00:00Z', 'tiktok', 1, 2000),
    reading('2026-10-01T00:00:00Z', 'tiktok', 1, 1000),
    reading('2026-10-01T00:00:00Z', 'youtube', 1, 500),
    reading('2026-10-02T00:00:00Z', 'tiktok', 2, 300),
  ],
};

describe('statsTimeline', () => {
  it('sums the latest reading of every video at each moment', () => {
    const points = statsTimeline(stats, { platform: 'all', itemId: 'all' });
    expect(points.map((p) => [p.at, p.views])).toEqual([
      ['2026-10-01T00:00:00Z', 1500],
      ['2026-10-02T00:00:00Z', 2800],
    ]);
    expect(points[1]?.income).toBeCloseTo(0.8 + 0.035 + 0.12, 10);
  });

  it('narrows to one platform and one video', () => {
    expect(statsTimeline(stats, { platform: 'youtube', itemId: 'all' })).toHaveLength(1);
    const one = statsTimeline(stats, { platform: 'tiktok', itemId: 2 });
    expect(one.map((p) => p.views)).toEqual([300]);
  });

  it('gives zeros when nothing is recorded', () => {
    const empty = { ...stats, snapshots: [] };
    expect(statsTimeline(empty, { platform: 'all', itemId: 'all' })).toEqual([]);
    expect(statsTotals(empty, { platform: 'all', itemId: 'all' })).toEqual({
      views: 0,
      income: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    });
  });

  it('totals the latest point', () => {
    expect(statsTotals(stats, { platform: 'tiktok', itemId: 'all' })).toMatchObject({
      views: 2300,
      likes: 230,
      comments: 2,
      shares: 4,
    });
    expect(incomeFor(2500, 0.4)).toBe(1);
  });
});

describe('number formatting', () => {
  it('keeps six decimals on money and commas on counts', () => {
    expect(money(44.7392)).toBe('$44.739200');
    expect(money(1234.5)).toBe('$1,234.500000');
    expect(count(240147.4)).toBe('240,147');
  });

  it('shortens axis labels', () => {
    expect(compact(150_000)).toBe('150K');
    expect(compact(1_500)).toBe('1.5K');
    expect(compactMoney(0)).toBe('$0');
    expect(compactMoney(0.004)).toBe('$0.0040');
    expect(compactMoney(0.5)).toBe('$0.50');
    expect(compactMoney(60)).toBe('$60');
  });

  it('picks round axis ticks that cover the maximum', () => {
    expect(niceTicks(111_848)).toEqual([0, 50_000, 100_000, 150_000]);
    expect(niceTicks(447)).toEqual([0, 200, 400, 600]);
    expect(niceTicks(0.03)).toEqual([0, 0.01, 0.02, 0.03]);
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});

describe('placeholderProject', () => {
  it('is an empty project that still has logos and a calendar', () => {
    const data = placeholderProject();
    expect(data.items).toEqual([]);
    expect(data.slots).toHaveLength(3);
    expect(data.logos.platforms.tiktok).toBe('assets/icons/tiktok.png');
    expect(data.stats.snapshots).toEqual([]);
  });
});
