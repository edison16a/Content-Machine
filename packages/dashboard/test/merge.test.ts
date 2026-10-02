import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatsPoint } from '@content-machine/dashboard';
import type { DashboardData, DashboardItem } from '../src/shared/types.js';
import { ALL_PROJECTS, mergeProjects } from '../src/client/lib/merge.js';
import { parseAmount } from '../src/client/lib/numbers.js';
import {
  applyOverride,
  clearOverride,
  loadOverride,
  overrideIncome,
  saveOverride,
  splitViews,
  startingOverride,
} from '../src/client/lib/override.js';
import { inPostingOrder, slotIndex } from '../src/client/lib/selectors.js';
import { projectOptions } from '../src/client/views/settings/project-options.js';

function item(project: string, id: number, date: string, slot: number): DashboardItem {
  const entry = { time: '12:00', iso: `${date}T12:00:00Z`, status: 'queued' as const, note: '' };
  return {
    id,
    key: `${project}#${id}`,
    project,
    video: `projects/${project}/videos/00${id}.mp4`,
    thumb: `projects/${project}/thumbs/00${id}.jpg`,
    duration: 30,
    postTitle: `${project} ${id}`,
    captions: { tiktok: '', instagram: '', youtube: '' },
    source: 'a.mp4',
    sourceStart: 0,
    sourceEnd: 30,
    note: '',
    date,
    slot,
    platforms: { tiktok: entry, instagram: entry, youtube: entry },
  };
}

function project(
  name: string,
  slots: string[],
  items: DashboardItem[],
  updatedAt: string,
  sample = false,
): DashboardData {
  return {
    project: name,
    channel: `${name} channel`,
    sourcePlatform: 'youtube',
    timezone: name === 'bees' ? 'Europe/Berlin' : 'UTC',
    weekStartsOn: 'monday',
    slots,
    stagger: { tiktok: 0, instagram: 15, youtube: 30 },
    handles: { tiktok: `@${name}` },
    updatedAt,
    items,
    logos: { brand: '', platforms: { tiktok: null, instagram: null, youtube: null }, source: null },
    repoUrl: '',
    stats: {
      rates: { tiktok: 0.4, instagram: 0.01, youtube: 0.07 },
      sample,
      snapshots: items.map((i) => ({
        at: '2026-10-02T00:00:00Z',
        platform: 'tiktok' as const,
        itemId: i.id,
        itemKey: i.key,
        views: 1000,
        likes: 10,
        comments: 1,
        shares: 1,
      })),
    },
  };
}

// Two projects with different slot times, and both posting on Oct 2 at 12:00.
const ants = project(
  'ants',
  ['12:00', '17:00'],
  [item('ants', 1, '2026-10-02', 0), item('ants', 2, '2026-10-02', 1)],
  '2026-10-01T00:00:00Z',
);
const bees = project(
  'bees',
  ['09:00', '12:00'],
  [item('bees', 1, '2026-10-02', 1), item('bees', 2, '2026-10-03', 0)],
  '2026-10-02T00:00:00Z',
  true,
);

describe('mergeProjects', () => {
  const merged = mergeProjects([ants, bees]);

  it('puts every video on one calendar, each on the row of its own time', () => {
    expect(merged.project).toBe(ALL_PROJECTS);
    expect(merged.slots).toEqual(['09:00', '12:00', '17:00']);
    const rows = Object.fromEntries(merged.items.map((i) => [i.key, merged.slots[i.slot]]));
    expect(rows).toEqual({
      'ants#1': '12:00',
      'ants#2': '17:00',
      'bees#1': '12:00',
      'bees#2': '09:00',
    });
    expect(new Set(merged.items.map((i) => i.key)).size).toBe(4);
  });

  it('keeps two projects that share a slot side by side', () => {
    const shared = slotIndex(merged.items).get('2026-10-02#1') ?? [];
    expect(shared.map((i) => i.key)).toEqual(['ants#1', 'bees#1']);
    expect(inPostingOrder(merged.items).map((i) => i.key)).toEqual([
      'ants#1',
      'bees#1',
      'ants#2',
      'bees#2',
    ]);
  });

  it('takes single settings from the newest project and pools the rest', () => {
    expect(merged.timezone).toBe('Europe/Berlin');
    expect(merged.handles).toEqual({ tiktok: '@bees' });
    expect(merged.stats.snapshots).toHaveLength(4);
    expect(merged.stats.sample).toBe(true);
  });
});

describe('projectOptions', () => {
  it('offers all projects first, then each with its first poster', () => {
    const options = projectOptions([bees, ants]);
    expect(options.map((o) => o.value)).toEqual([ALL_PROJECTS, 'ants', 'bees']);
    expect(options[0]?.detail).toBe('Automatic: 4 videos from 2 projects on one calendar');
    expect(options[1]).toMatchObject({
      thumb: 'projects/ants/thumbs/001.jpg',
      detail: 'ants channel, 2 videos',
    });
    const empty = projectOptions([project('new', ['12:00'], [], '2026-10-02T00:00:00Z')]);
    expect(empty[1]).toMatchObject({ mark: 'film', detail: 'new channel, 0 videos' });
  });
});

describe('parseAmount', () => {
  it('reads plain, comma, k and M amounts', () => {
    expect(parseAmount('30000')).toBe(30000);
    expect(parseAmount('30,000')).toBe(30000);
    expect(parseAmount(' 30k ')).toBe(30000);
    expect(parseAmount('1.5M')).toBe(1500000);
    expect(parseAmount('$2.5k')).toBe(2500);
    expect(parseAmount('lots')).toBeUndefined();
    expect(parseAmount('')).toBeUndefined();
  });
});

describe('custom numbers', () => {
  const rates = { tiktok: 0.4, instagram: 0.01, youtube: 0.07 };
  const override = { views: 30000, split: { tiktok: 60, instagram: 10, youtube: 30 } };

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
    const now = new Date('2026-10-02T00:00:00Z');
    const all = applyOverride(history, override, rates, 'all', now);
    expect(all).toHaveLength(2);
    expect(all[1]).toMatchObject({ at: now.toISOString(), views: 30000, likes: 9, comments: 2 });
    expect(applyOverride(history, override, rates, 'youtube', now)[1]?.views).toBe(9000);
    const replaced = applyOverride(
      history,
      override,
      rates,
      'all',
      new Date('2026-09-30T00:00:00Z'),
    );
    expect(replaced).toHaveLength(1);
    expect(applyOverride([], override, rates, 'all', now)[0]).toMatchObject({
      likes: 0,
      views: 30000,
    });
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

  describe('storage', () => {
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
});
