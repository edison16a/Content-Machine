import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect, type Page } from '@playwright/test';

export const DEMO_DIR = fileURLToPath(new URL('../../../projects/demo/', import.meta.url));

/** The demo writes the time it treated as "now", so the page clock can match it. */
export async function demoNow(): Promise<Date> {
  const text = await readFile(join(DEMO_DIR, 'work', 'demo-clock.json'), 'utf8').catch(() => {
    throw new Error('projects/demo is missing. Run "npm run demo" before the browser tests.');
  });
  return new Date((JSON.parse(text) as { now: string }).now);
}

/** Opens a dashboard with the clock frozen at the demo's "now" and records any network use. */
export async function openDashboard(page: Page, dir = DEMO_DIR): Promise<{ requests: string[]; errors: string[] }> {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.clock.setFixedTime(await demoNow());
  await page.goto(`file://${join(dir, 'dashboard.html')}`);
  await expect(page.locator('.week .day').first()).toBeVisible();
  return { requests, errors };
}

/** Copies the demo project somewhere else, to prove the folder is portable. */
export const test = base.extend<{ movedDir: string }>({
  // eslint-disable-next-line no-empty-pattern
  movedDir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), 'cm moved '));
    await cp(DEMO_DIR, dir, { recursive: true });
    await use(dir);
    await rm(dir, { recursive: true, force: true });
  },
});

/** Reads the playback state of the player's video element. */
export function playback(page: Page) {
  return page.locator('.player video').evaluate((el) => {
    const video = el as HTMLVideoElement & { webkitAudioDecodedByteCount?: number };
    return {
      readyState: video.readyState,
      currentTime: video.currentTime,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      audioBytes: video.webkitAudioDecodedByteCount ?? 0,
      src: video.getAttribute('src'),
    };
  });
}

export { expect };
