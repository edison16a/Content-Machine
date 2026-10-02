import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatsPoint } from '@content-machine/dashboard';
import { ALL_PROJECTS } from '../src/client/lib/merge.js';
import {
  applyOverride,
  clearOverride,
  loadOverride,
  overrideIncome,
  saveOverride,
  shownStats,
  splitViews,
  startingOverride,
} from '../src/client/lib/override.js';
import { rebalance, toPercentages } from '../src/client/lib/split.js';
import { ants } from './fixtures.js';

const rates = { tiktok: 0.4, instagram: 0.01, youtube: 0.07 };
const override = { views: 30000, split: { tiktok: 60, instagram: 10, youtube: 30 } };
const now = new Date('2026-10-02T00:00:00Z');

describe('custom numbers', () => {
  it('splits views into whole numbers that add up to the total', () => {
    expect(splitViews(override)).toEqual({ tiktok: 18000, instagram: 3000, youtube: 9000 });
    const odd = splitViews({ views: 10, split: { tiktok: 1, instagram: 1, youtube: 1 } });
    expect(odd.tiktok + odd.instagram + odd.youtube).toBe(10);
    expect(splitViews({ views: 9, split: { tiktok: 0, instagram: 0, youtube: 0 } })).toEqual({
      tiktok: 3,
      instagram: 3,
      youtube: 3,
    });
  });

  it('estimates income per platform and in total', () => {
    const income = overrideIncome(override, rates);
    expect(income.perPlatform.tiktok).toBeCloseTo(7.2, 10);
    expect(income.total).toBeCloseTo(7.86, 10);
  });

  it('becomes the newest point for the tab on screen, keeping history', () => {
    const history: StatsPoint[] = [
      { at: '2026-10-01T00:00:00Z', views: 100, income: 0.04, likes: 9, comments: 2, shares: 1 },
    ];
    const all = applyOverride(history, override, rates, 'all', now);
    expect(all).toHaveLength(2);
    expect(all[1]).toMatchObject({ at: now.toISOString(), views: 30000, likes: 9, comments: 2 });
    expect(applyOverride(history, override, rates, 'youtube', now)[1]?.views).toBe(9000);
    const earlier = new Date('2026-09-30T00:00:00Z');
    expect(applyOverride(history, override, rates, 'all', earlier)).toHaveLength(1);
    expect(applyOverride([], override, rates, 'all', now)[0]).toMatchObject({ likes: 0 });
  });

  it('starts the form from saved numbers, else from the recorded split', () => {
    expect(startingOverride(override, ants.stats)).toBe(override);
    expect(startingOverride(undefined, ants.stats)).toEqual({
      views: 2000,
      split: { tiktok: 2000, instagram: 0, youtube: 0 },
    });
    const none = { ...ants.stats, snapshots: [] };
    expect(startingOverride(undefined, none).split).toEqual({
      tiktok: 50,
      instagram: 25,
      youtube: 25,
    });
  });
});

describe('shownStats', () => {
  const keys = ants.items.map((i) => i.key);

  it('applies custom numbers when looking at every video', () => {
    const shown = shownStats(
      ants.stats,
      keys,
      { platform: 'all', statsItem: 'all' },
      override,
      now,
    );
    expect(shown.custom).toBe(true);
    expect(shown.points.at(-1)?.views).toBe(30000);
  });

  it('leaves them out when one video is picked', () => {
    const shown = shownStats(
      ants.stats,
      keys,
      { platform: 'all', statsItem: 'ants#1' },
      override,
      now,
    );
    expect(shown.custom).toBe(false);
    expect(shown.points.at(-1)?.views).toBe(1000);
  });

  it('treats a picked video from another project as every video', () => {
    const shown = shownStats(
      ants.stats,
      keys,
      { platform: 'all', statsItem: 'bees#1' },
      undefined,
      now,
    );
    expect(shown.points.at(-1)?.views).toBe(2000);
    expect(shown.custom).toBe(false);
  });
});

describe('slider shares', () => {
  it('turns any weights into whole percentages that add up to 100', () => {
    expect(toPercentages({ tiktok: 1, instagram: 1, youtube: 1 })).toEqual({
      tiktok: 34,
      instagram: 33,
      youtube: 33,
    });
    expect(toPercentages({ tiktok: 2000, instagram: 0, youtube: 0 })).toEqual({
      tiktok: 100,
      instagram: 0,
      youtube: 0,
    });
    const odd = toPercentages({ tiktok: 1, instagram: 1, youtube: 4 });
    expect(odd.tiktok + odd.instagram + odd.youtube).toBe(100);
    expect(toPercentages({ tiktok: 0, instagram: 0, youtube: 0 })).toEqual({
      tiktok: 34,
      instagram: 33,
      youtube: 33,
    });
  });

  it('moves the other two in proportion so the total stays 100', () => {
    expect(rebalance({ tiktok: 50, instagram: 25, youtube: 25 }, 'tiktok', 80)).toEqual({
      tiktok: 80,
      instagram: 10,
      youtube: 10,
    });
    expect(rebalance({ tiktok: 100, instagram: 0, youtube: 0 }, 'tiktok', 40)).toEqual({
      tiktok: 40,
      instagram: 30,
      youtube: 30,
    });
    const odd = rebalance({ tiktok: 33, instagram: 33, youtube: 34 }, 'youtube', 7);
    expect(odd.tiktok + odd.instagram + odd.youtube).toBe(100);
  });
});

describe('saved custom numbers', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('saves per selection, ignores junk and clears', () => {
    saveOverride(ALL_PROJECTS, override);
    expect(loadOverride(ALL_PROJECTS)).toEqual(override);
    expect(loadOverride('ants')).toBeUndefined();
    window.localStorage.setItem('content-machine:override:bees', '{"views":-1}');
    expect(loadOverride('bees')).toBeUndefined();
    window.localStorage.setItem('content-machine:override:bees', 'not json');
    expect(loadOverride('bees')).toBeUndefined();
    clearOverride(ALL_PROJECTS);
    expect(loadOverride(ALL_PROJECTS)).toBeUndefined();
  });
});
