import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Schedule } from '@content-machine/core';
import {
  escapeHtml,
  jsonForScript,
  loadClientBundle,
  renderDashboardHtml,
  toDashboardData,
} from '@content-machine/dashboard';

const schedule: Schedule = {
  schemaVersion: 1,
  project: 'demo',
  channel: 'Example Channel',
  timezone: 'America/Los_Angeles',
  weekStartsOn: 'monday',
  slots: ['12:00', '17:00', '20:00'],
  stagger: { tiktok: 0, instagram: 15, youtube: 30 },
  handles: { tiktok: 'me', instagram: '' },
  updatedAt: '2026-10-01T00:00:00Z',
  items: [
    {
      id: 1,
      video: 'videos/001.mp4',
      thumb: 'thumbs/001.jpg',
      duration: 30,
      postTitle: 'Bad </script><script>alert(1)</script>',
      captions: { tiktok: 't', instagram: 'i', youtube: 'y' },
      source: 'a.mp4',
      sourceStart: 0,
      sourceEnd: 30,
      note: '',
      date: '2026-10-02',
      slot: 0,
      platforms: {
        tiktok: { time: '12:00', iso: '2026-10-02T12:00:00-07:00', status: 'queued', note: '' },
        instagram: { time: '12:15', iso: '2026-10-02T12:15:00-07:00', status: 'queued', note: '' },
        youtube: { time: '12:30', iso: '2026-10-02T12:30:00-07:00', status: 'queued', note: '' },
      },
    },
  ],
};

const extras = {
  sourcePlatform: 'youtube',
  logos: {
    brand: 'data:image/svg+xml;base64,AA==',
    platforms: { tiktok: null, instagram: null, youtube: null },
    source: null,
  },
  repoUrl: 'https://github.com/edison16a/Content-Machine',
  stats: { rates: { tiktok: 0.4, instagram: 0.01, youtube: 0.07 }, snapshots: [] },
};

describe('toDashboardData', () => {
  it('copies only what the page shows and drops empty handles', () => {
    const data = toDashboardData(schedule, extras);
    expect(data.handles).toEqual({ tiktok: 'me' });
    expect(data.items[0]?.platforms.instagram.time).toBe('12:15');
    expect(data.repoUrl).toBe(extras.repoUrl);
  });
});

describe('renderDashboardHtml', () => {
  it('embeds data safely and inlines everything', () => {
    const html = renderDashboardHtml({
      data: toDashboardData(schedule, extras),
      js: 'var a="</script>";',
      css: 'body{}',
    });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('<\\/script>');
    expect(html).toContain('<title>demo | Content Machine</title>');
    expect(html).not.toMatch(/<link[^>]+stylesheet|<script[^>]+src=|https?:\/\/(?!github\.com)/);
  });

  it('escapes JSON and HTML', () => {
    expect(jsonForScript({ a: '<b>&\u2028' })).toBe('{"a":"\\u003cb\\u003e\\u0026\\u2028"}');
    expect(escapeHtml(`"<'&>`)).toBe('&#34;&#60;&#39;&#38;&#62;');
  });
});

describe('loadClientBundle', () => {
  it('reads a bundle directory and explains a missing build', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-bundle-'));
    await writeFile(join(dir, 'client.js'), 'js');
    await writeFile(join(dir, 'client.css'), 'css');
    expect(await loadClientBundle(`${dir}/`)).toEqual({ js: 'js', css: 'css' });
    await expect(loadClientBundle(`${dir}/missing/`)).rejects.toMatchObject({
      code: 'E_FILE_NOT_FOUND',
    });
    await rm(dir, { recursive: true, force: true });
  });
});
