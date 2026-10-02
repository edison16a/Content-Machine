import { describe, expect, it } from 'vitest';
import {
  LIVE_DATA_GLOBAL,
  clientBuildId,
  renderLiveData,
  withMediaBase,
  type DashboardData,
  type DashboardItem,
} from '@content-machine/dashboard';
import { agoText, clockIn, untilText } from '../src/client/lib/format.js';
import { chooseProject, projectFromHash } from '../src/client/lib/projects.js';
import { dueNow } from '../src/client/lib/selectors.js';

function item(id: number, iso: string, status: 'queued' | 'scheduled' | 'posted'): DashboardItem {
  const entry = { time: iso.slice(11, 16), iso, status, note: '' };
  return {
    id,
    video: `videos/00${id}.mp4`,
    thumb: `thumbs/00${id}.jpg`,
    duration: 30,
    postTitle: `Item ${id}`,
    captions: { tiktok: '', instagram: '', youtube: '' },
    source: 'a.mp4',
    sourceStart: 0,
    sourceEnd: 30,
    note: '',
    date: iso.slice(0, 10),
    slot: 0,
    platforms: { tiktok: entry, instagram: entry, youtube: entry },
  };
}

function project(name: string, updatedAt: string, items: DashboardItem[] = []): DashboardData {
  return {
    project: name,
    channel: '',
    sourcePlatform: 'youtube',
    timezone: 'UTC',
    weekStartsOn: 'monday',
    slots: ['12:00'],
    stagger: { tiktok: 0, instagram: 0, youtube: 0 },
    handles: {},
    updatedAt,
    items,
    logos: { brand: '', platforms: { tiktok: null, instagram: null, youtube: null }, source: null },
    repoUrl: '',
  };
}

describe('live data file', () => {
  it('is one assignment the page can rerun, safe to load as a script', () => {
    const text = renderLiveData({ build: 'abc', updatedAt: 'now', projects: [] });
    expect(text).toBe(
      `window.${LIVE_DATA_GLOBAL} = {"build":"abc","updatedAt":"now","projects":[]};\n`,
    );
    const tricky = renderLiveData({
      build: '</script>',
      updatedAt: '',
      projects: [],
    });
    expect(tricky).not.toContain('</script>');
  });

  it('puts the project folder in front of media paths', () => {
    const data = withMediaBase(
      project('bees', 'x', [item(1, '2026-10-02T12:00:00Z', 'queued')]),
      'projects/bees/',
    );
    expect(data.items[0]).toMatchObject({
      video: 'projects/bees/videos/001.mp4',
      thumb: 'projects/bees/thumbs/001.jpg',
    });
  });

  it('fingerprints the client so a new build is noticed', () => {
    const a = clientBuildId({ js: 'a', css: 'b' });
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(clientBuildId({ js: 'a', css: 'b' })).toBe(a);
    expect(clientBuildId({ js: 'a2', css: 'b' })).not.toBe(a);
  });
});

describe('picking a project', () => {
  const projects = [project('old', '2026-09-01T00:00:00Z'), project('new', '2026-10-01T00:00:00Z')];

  it('reads #project= from the address', () => {
    expect(projectFromHash('#project=tiny-house')).toBe('tiny-house');
    expect(projectFromHash('#project=')).toBeUndefined();
    expect(projectFromHash('')).toBeUndefined();
  });

  it('prefers the asked-for project, then the most recently updated', () => {
    expect(chooseProject(projects, 'old')?.project).toBe('old');
    expect(chooseProject(projects, 'gone')?.project).toBe('new');
    expect(chooseProject(projects, undefined)?.project).toBe('new');
    expect(chooseProject([], 'old')).toBeUndefined();
  });
});

describe('what to post now', () => {
  const now = new Date('2026-10-02T13:00:00Z');
  const items = [
    item(3, '2026-10-02T12:30:00Z', 'queued'),
    item(1, '2026-10-02T09:00:00Z', 'queued'),
    item(2, '2026-10-02T10:00:00Z', 'scheduled'),
    item(4, '2026-10-02T15:00:00Z', 'queued'),
  ];

  it('lists queued posts whose time has come, oldest first', () => {
    expect(dueNow(items, 'tiktok', now).map((i) => i.id)).toEqual([1, 3]);
    expect(dueNow([], 'tiktok', now)).toEqual([]);
  });
});

describe('time words', () => {
  it('counts down in minutes, hours and days', () => {
    expect(untilText(0)).toBe('in 1 min');
    expect(untilText(45 * 60_000)).toBe('in 45 min');
    expect(untilText(120 * 60_000)).toBe('in 2 h');
    expect(untilText(125 * 60_000)).toBe('in 2 h 5 min');
    expect(untilText(72 * 3_600_000)).toBe('in 3 days');
  });

  it('says how long ago something was due', () => {
    expect(agoText(10_000)).toBe('just now');
    expect(agoText(12 * 60_000)).toBe('12 min ago');
    expect(agoText(3 * 3_600_000)).toBe('3 h ago');
    expect(agoText(72 * 3_600_000)).toBe('3 days ago');
  });

  it('shows the wall clock in the project time zone', () => {
    const at = new Date('2026-10-02T19:05:00Z');
    expect(clockIn('America/Los_Angeles', at)).toBe('12:05 PM');
    expect(clockIn('UTC', at)).toBe('7:05 PM');
  });
});
