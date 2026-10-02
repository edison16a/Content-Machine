import { describe, expect, it } from 'vitest';
import { statsTimeline, statsTotals } from '@content-machine/dashboard';
import type { DashboardData } from '../src/shared/types.js';
import { ALL_PROJECTS, mergeProjects } from '../src/client/lib/merge.js';
import { dataFor, resolveSelection } from '../src/client/lib/projects.js';
import { inPostingOrder, slotIndex } from '../src/client/lib/selectors.js';
import { withKeys } from '../src/client/lib/upgrade.js';
import { projectOptions } from '../src/client/views/settings/project-options.js';
import { ants, bees, item, project } from './fixtures.js';

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

  it('puts an item past the end of its slots on the first slot', () => {
    const odd = project(
      'odd',
      ['17:00'],
      [item('odd', 1, '2026-10-02', 5)],
      '2026-09-01T00:00:00Z',
    );
    const withOdd = mergeProjects([ants, odd]);
    const placed = withOdd.items.find((i) => i.key === 'odd#1');
    expect(withOdd.slots[placed?.slot ?? -1]).toBe('17:00');
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

  it('pools statistics even when item numbers repeat across projects', () => {
    expect(statsTimeline(merged.stats, { platform: 'all', itemKey: 'all' }).at(-1)?.views).toBe(
      4000,
    );
    expect(statsTotals(merged.stats, { platform: 'tiktok', itemKey: 'all' }).views).toBe(4000);
    expect(statsTotals(merged.stats, { platform: 'all', itemKey: 'bees#1' }).views).toBe(1000);
  });
});

describe('choosing what is on screen', () => {
  it('keeps a real selection and turns a missing one into all projects', () => {
    expect(resolveSelection([ants, bees], 'ants')).toBe('ants');
    expect(resolveSelection([ants, bees], ALL_PROJECTS)).toBe(ALL_PROJECTS);
    expect(resolveSelection([ants, bees], 'gone')).toBe(ALL_PROJECTS);
    expect(resolveSelection([], 'gone')).toBe('gone');
  });

  it('shows the named project, else every project together, else the placeholder', () => {
    expect(dataFor([ants, bees], 'ants').project).toBe('ants');
    expect(dataFor([ants, bees], 'gone').project).toBe(ALL_PROJECTS);
    expect(dataFor([], 'ants').project).toBe('');
  });
});

/** The same project as an older CLI would have written it: no keys on items or readings. */
function withoutKeys(data: DashboardData): DashboardData {
  const drop = <T extends object>(value: T, keys: string[]): T =>
    Object.fromEntries(Object.entries(value).filter(([k]) => !keys.includes(k))) as T;
  return {
    ...data,
    items: data.items.map((i) => drop(i, ['key', 'project'])),
    stats: { ...data.stats, snapshots: data.stats.snapshots.map((s) => drop(s, ['itemKey'])) },
  };
}

describe('withKeys', () => {
  it('fills in keys missing from data written by an older CLI', () => {
    const upgraded = withKeys(withoutKeys(ants));
    expect(upgraded.items.map((i) => [i.key, i.project])).toEqual([
      ['ants#1', 'ants'],
      ['ants#2', 'ants'],
    ]);
    expect(upgraded.stats.snapshots.map((s) => s.itemKey)).toEqual(['ants#1', 'ants#2']);
    expect(withKeys(ants)).toEqual(ants);
  });

  it('lets old data from two projects share a slot and still pool stats', () => {
    const merged = mergeProjects([withKeys(withoutKeys(ants)), withKeys(withoutKeys(bees))]);
    expect(inPostingOrder(merged.items).map((i) => i.key)).toEqual([
      'ants#1',
      'bees#1',
      'ants#2',
      'bees#2',
    ]);
    expect(statsTotals(merged.stats, { platform: 'all', itemKey: 'all' }).views).toBe(4000);
  });
});

describe('projectOptions', () => {
  it('offers all projects first, then each with its first poster', () => {
    const options = projectOptions([bees, ants]);
    expect(options.map((o) => o.value)).toEqual([ALL_PROJECTS, 'ants', 'bees']);
    expect(options[0]?.detail).toBe('4 videos, 2 projects');
    expect(options[1]).toMatchObject({
      thumb: 'projects/ants/thumbs/001.jpg',
      detail: 'ants channel, 2 videos',
    });
    const empty = projectOptions([project('new', ['12:00'], [], '2026-10-02T00:00:00Z')]);
    expect(empty[1]).toMatchObject({ mark: 'film', detail: 'new channel, 0 videos' });
  });
});
