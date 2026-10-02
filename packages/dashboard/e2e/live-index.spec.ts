import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { demoNow } from './fixtures.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DATA = join(ROOT, 'projects', 'dashboard-data.js');
const INDEX = `file://${join(ROOT, 'index.html')}#project=demo`;

test.describe('live index.html', () => {
  test('shows every project with a live strip', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(await demoNow());
    await page.goto(INDEX);
    await expect(page.locator('.week .day').first()).toBeVisible();
    await expect(page.locator('.project-select')).toHaveValue('demo');
    await expect(page.locator('.project-select option')).toHaveCount(2);
    await expect(page.locator('.now-time')).toBeVisible();
    await expect(page.locator('.card img').first()).toHaveAttribute('src', /^projects\/demo\//);
    await page.selectOption('.project-select', 'demo-clips');
    await expect(page.locator('.card')).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('lists posts that are due once their time has passed', async ({ page }) => {
    const later = new Date((await demoNow()).getTime() + 30 * 24 * 3_600_000);
    await page.clock.setFixedTime(later);
    await page.goto(INDEX);
    await expect(page.locator('.now-due h3')).toHaveText('Post on TikTok now');
    await expect(page.locator('.now-due .now-item').first()).toContainText('ago');
  });

  test('picks up new data without a reload', async ({ page }) => {
    const original = await readFile(DATA, 'utf8');
    await page.goto(INDEX);
    const first = page.locator('.card').first();
    const id = await first.getAttribute('data-id');
    const marker = await page.evaluate(() => {
      const w = window as unknown as { marker: number };
      w.marker = 42;
      return w.marker;
    });
    try {
      const renamed = original.replace(/"postTitle":"[^"]*"/g, '"postTitle":"Fresh From Disk"');
      await writeFile(DATA, renamed);
      await expect(page.locator(`.card[data-id="${id}"]`).first()).toContainText(
        'Fresh From Disk',
        { timeout: 15_000 },
      );
      expect(await page.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(
        marker,
      );
    } finally {
      await writeFile(DATA, original);
    }
  });

  test('All tab shows every video, then statistics with graphs', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(await demoNow());
    await page.goto(INDEX);
    await page.locator('.tab[data-platform="all"]').click();
    await expect(page.locator('.week')).toBeHidden();
    await expect(page.locator('.video-tile')).toHaveCount(24);
    await expect(page.locator('.video-tile').first().locator('.video-platform')).toHaveCount(3);
    await expect(page.locator('.stat-tile')).toHaveCount(5);
    await expect(page.locator('.stat-tile.metric-income .stat-tile-value')).toHaveText(
      /^\$[\d,]+\.\d{6}$/,
    );
    await expect(page.locator('.chart-card')).toHaveCount(5);

    await page.locator('.chip.metric-likes').click();
    await expect(page.locator('.chart-card')).toHaveCount(4);
    await expect(page.locator('.chip.metric-likes')).toHaveAttribute('aria-pressed', 'false');

    const total = await page.locator('.stat-tile.metric-views .stat-tile-value').textContent();
    await page.selectOption('.stats-video', '1');
    await expect(page.locator('.stat-tile.metric-views .stat-tile-value')).not.toHaveText(
      total ?? '',
    );

    await page.getByRole('button', { name: 'Show table' }).click();
    await expect(page.locator('.stats-table tbody tr').first()).toBeVisible();
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();

    await page.locator('.tab[data-platform="youtube"]').click();
    await expect(page.locator('.week')).toBeVisible();
    await expect(page.locator('.stats-section')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
