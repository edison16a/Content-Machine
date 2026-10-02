import { describe, expect, it } from 'vitest';
import { sampleSnapshots, type SampleInput } from '@content-machine/core';

const input: SampleInput = {
  items: [
    { id: 1, postTitle: 'One' },
    { id: 2, postTitle: 'Two' },
    { id: 3, postTitle: 'Three' },
  ],
  rates: { tiktok: 0.4, instagram: 0.01, youtube: 0.07 },
  now: '2026-10-02T12:00:00.000Z',
  days: 30,
  target: { kind: 'income', amount: 30000 },
  seed: 'demo',
};

/** The last reading of every video on every platform. */
function finals(snapshots: ReturnType<typeof sampleSnapshots>) {
  const latest = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) latest.set(`${s.platform}#${s.itemId}`, s);
  return [...latest.values()];
}

describe('sampleSnapshots', () => {
  it('adds up to the income target on the last day', () => {
    const income = finals(sampleSnapshots(input)).reduce(
      (sum, s) => sum + (s.views / 1000) * input.rates[s.platform],
      0,
    );
    expect(income).toBeCloseTo(30000, -1);
  });

  it('can aim at a number of views instead', () => {
    const views = finals(
      sampleSnapshots({ ...input, target: { kind: 'views', amount: 30000 } }),
    ).reduce((sum, s) => sum + s.views, 0);
    expect(Math.abs(views - 30000)).toBeLessThanOrEqual(9);
  });

  it('covers the last 30 days, one reading a day, and only grows', () => {
    const snapshots = sampleSnapshots(input);
    const days = new Set(snapshots.map((s) => s.at.slice(0, 10)));
    expect(days.size).toBeLessThanOrEqual(30);
    expect([...days].sort().at(-1)).toBe('2026-10-02');
    expect([...days].sort()[0]! >= '2026-09-03').toBe(true);
    for (const id of [1, 2, 3]) {
      const views = snapshots
        .filter((s) => s.itemId === id && s.platform === 'tiktok')
        .map((s) => s.views);
      expect(views).toEqual([...views].sort((a, b) => a - b));
    }
    expect(snapshots.every((s) => s.likes <= s.views && s.comments <= s.likes)).toBe(true);
  });

  it('has uneven days, not a smooth curve', () => {
    const totals = sampleSnapshots(input)
      .filter((s) => s.itemId === 1 && s.platform === 'tiktok')
      .map((s) => s.views);
    const daily = totals.map((v, i) => v - (totals[i - 1] ?? 0)).slice(1);
    const rises = daily.filter((d, i) => i > 0 && d > (daily[i - 1] ?? 0)).length;
    // A smooth launch curve only ever falls day to day; real days go up too.
    expect(rises).toBeGreaterThan(3);
  });

  it('is the same for the same seed and different for another', () => {
    expect(sampleSnapshots(input)).toEqual(sampleSnapshots(input));
    expect(sampleSnapshots({ ...input, seed: 'other' })).not.toEqual(sampleSnapshots(input));
  });

  it('still makes views for a platform that pays nothing', () => {
    const free = sampleSnapshots({ ...input, rates: { ...input.rates, instagram: 0 } });
    expect(finals(free).some((s) => s.platform === 'instagram' && s.views > 0)).toBe(true);
  });
});
