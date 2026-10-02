import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, openDashboard, playback, test } from './fixtures.js';

test.describe('player', () => {
  test('plays the clicked video with sound', async ({ page }) => {
    await openDashboard(page);
    await page.locator('.card').first().click();
    await expect(page.locator('.player')).toBeVisible();
    await expect
      .poll(async () => (await playback(page)).readyState, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(3);
    const first = await playback(page);
    await expect
      .poll(async () => (await playback(page)).currentTime)
      .toBeGreaterThan(first.currentTime);
    const state = await playback(page);
    expect(state.paused).toBe(false);
    expect(state.muted).toBe(false);
    expect(state.volume).toBeGreaterThan(0);
    await expect.poll(async () => (await playback(page)).audioBytes).toBeGreaterThan(0);
  });

  test('keeps the player simple: no next, previous or auto-play controls', async ({ page }) => {
    await openDashboard(page);
    await page.locator('.card').first().click();
    await expect(page.getByRole('button', { name: /Next video|Previous video/ })).toHaveCount(0);
    await expect(page.getByText('Auto-play next')).toHaveCount(0);
    const title = await page.locator('#player-title').textContent();
    await expect
      .poll(async () => (await playback(page)).readyState, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(1);
    await page.locator('.player video').evaluate((el) => {
      const video = el as HTMLVideoElement;
      video.currentTime = video.duration - 0.3;
    });
    await expect
      .poll(() => page.locator('.player video').evaluate((v) => (v as HTMLVideoElement).ended), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect(page.locator('#player-title')).toHaveText(title ?? '');
  });

  test('keyboard controls work and closing stops playback', async ({ page }) => {
    await openDashboard(page);
    await page.locator('.card').nth(1).click();
    await expect.poll(async () => (await playback(page)).paused).toBe(false);
    await page.keyboard.press('Space');
    await expect.poll(async () => (await playback(page)).paused).toBe(true);
    await page.keyboard.press('m');
    await expect.poll(async () => (await playback(page)).muted).toBe(true);
    await page.keyboard.press('m');
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    await page.keyboard.press('Escape');
    await expect(page.locator('.player')).toBeHidden();
    const closed = await playback(page);
    expect(closed.paused).toBe(true);
    expect(closed.src).toBeNull();
  });

  test('copies the caption and an absolute file path', async ({ page }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      Object.defineProperty(window, '__copied', { value: copied });
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            copied.push(text);
            return Promise.resolve();
          },
        },
      });
    });
    await openDashboard(page);
    await page.locator('.card').first().click();
    await page.getByRole('button', { name: 'Copy TikTok caption' }).click();
    await page.getByRole('button', { name: 'Copy file path' }).click();
    await expect(page.getByRole('button', { name: 'Copied' }).first()).toBeVisible();
    const copied = await page.evaluate(
      () => (window as unknown as { __copied: string[] }).__copied,
    );
    expect(copied[0]).toContain('Credit: Example Channel');
    expect(copied[1]).toMatch(/projects\/demo\/videos\/\d{3}\.mp4$/);
  });

  test('works after moving the project folder and explains a missing file', async ({
    page,
    movedDir,
  }) => {
    await openDashboard(page, movedDir);
    await page.locator('.card').first().click();
    await expect
      .poll(async () => (await playback(page)).readyState, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(3);
    expect((await playback(page)).paused).toBe(false);
    await page.keyboard.press('Escape');
    const secondId = Number(await page.locator('.card').nth(1).getAttribute('data-id'));
    await rm(join(movedDir, 'videos', `${String(secondId).padStart(3, '0')}.mp4`));
    await page.locator('.card').nth(1).click();
    await expect(page.locator('.video-error')).toBeVisible();
    await expect(page.locator('.video-error')).toContainText(
      'Keep dashboard.html in the project folder next to the videos folder.',
    );
  });
});
