import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { demoNow } from './fixtures.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DATA = join(ROOT, 'projects', 'dashboard-data.js');
const INDEX = `file://${join(ROOT, 'index.html')}#project=demo`;

test.describe('live index.html', () => {
  test('shows every project on one calendar by default, picked in Settings', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(await demoNow());
    await page.goto(`file://${join(ROOT, 'index.html')}`);
    await expect(page.locator('.week .day').first()).toBeVisible();
    await expect(page.locator('.now')).toBeHidden();
    await expect(page.locator('.card img').first()).toHaveAttribute('src', /^projects\/demo/);

    // The stats picker lists every video from both projects.
    await page.locator('.stats-section .picker-button').click();
    await expect(page.locator('.stats-section .picker-option')).toHaveCount(28);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Settings' }).click();
    const projectPicker = page.locator('.settings-panel .picker-button');
    await expect(projectPicker).toHaveText(/All projects/);
    await projectPicker.click();
    await expect(page.locator('.settings-panel .picker-option')).toHaveCount(3);
    await page.locator('.settings-panel .picker-option', { hasText: 'demo-clips' }).click();
    await expect(page.locator('.card')).toHaveCount(3);
    await page.reload();
    await expect(page.locator('.card')).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test('three clicks on Settings open the admin panel for custom numbers', async ({ page }) => {
    await page.clock.setFixedTime(await demoNow());
    await page.goto(INDEX);
    const gear = page.getByRole('button', { name: 'Settings' });
    await gear.click();
    await gear.click();
    await gear.click();
    await expect(page.locator('.admin')).toBeVisible();
    await page.locator('#admin-views').fill('30k');
    await page.locator('.admin-slider').nth(0).fill('60');
    await page.locator('.admin-slider').nth(1).fill('10');
    await page.locator('.admin-slider').nth(2).fill('30');
    await expect(page.locator('.admin-total')).toHaveText('$7.860000');
    await page.getByRole('button', { name: 'Show these numbers' }).click();
    await expect(page.locator('.admin')).toBeHidden();
    await page.locator('.tab[data-platform="tiktok"]').click();
    await expect(page.locator('.stat-tile.metric-views .stat-tile-value')).toHaveText('18,000');
    await expect(page.locator('.sample-badge', { hasText: 'Custom numbers' })).toBeVisible();

    await gear.click();
    await gear.click();
    await gear.click();
    await page.getByRole('button', { name: 'Use recorded numbers' }).click();
    await expect(page.locator('.sample-badge', { hasText: 'Custom numbers' })).toBeHidden();
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

  test('All tab keeps the calendar and shows every platform on each card', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(await demoNow());
    await page.goto(INDEX);
    await page.locator('.tab[data-platform="all"]').click();
    await expect(page.locator('.week .day')).toHaveCount(7);
    await expect(page.locator('.week .card').first().locator('.video-platform')).toHaveCount(3);
    await expect(page.locator('.overview')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('switches between day, week and month views', async ({ page }) => {
    await page.clock.setFixedTime(await demoNow());
    await page.goto(INDEX);
    await page.locator('.segment[data-view="day"]').click();
    await expect(page.locator('.day-view .day-large')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Next day' })).toBeVisible();
    await page.locator('.segment[data-view="month"]').click();
    await expect(page.locator('.month-cell').first()).toBeVisible();
    expect(await page.locator('.month-cell').count()).toBeGreaterThanOrEqual(28);
    await expect(page.locator('.mini-poster').first()).toBeVisible();
    await page.locator('.month-cell:not(.is-other) .month-date').first().click();
    await expect(page.locator('.segment[data-view="day"]')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('.day-view')).toBeVisible();
    await page.locator('.segment[data-view="week"]').click();
    await expect(page.locator('.week .day')).toHaveCount(7);
  });

  test('statistics: tiles, graphs, a searchable video picker and a table', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(await demoNow());
    await page.goto(INDEX);
    await page.locator('.tab[data-platform="all"]').click();
    await expect(page.locator('.stat-tile')).toHaveCount(5);
    await expect(page.locator('.stat-tile.metric-income .stat-tile-value')).toHaveText(
      /^\$[\d,]+\.\d{6}$/,
    );
    await expect(page.locator('.chart-card')).toHaveCount(5);

    await page.locator('.chip.metric-likes').click();
    await expect(page.locator('.chart-card')).toHaveCount(4);
    await expect(page.locator('.chip.metric-likes')).toHaveAttribute('aria-pressed', 'false');

    const total = await page.locator('.stat-tile.metric-views .stat-tile-value').textContent();
    await page.locator('.stats-section .picker-button').click();
    await page.locator('.stats-section .picker-search').fill('#1 tiny');
    await expect(page.locator('.stats-section .picker-option')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(page.locator('.stats-section .picker-panel')).toBeHidden();
    await expect(page.locator('.stats-section .picker-label')).toHaveText(/^#001 /);
    await expect(page.locator('.stat-tile.metric-views .stat-tile-value')).not.toHaveText(
      total ?? '',
    );
    await page.locator('.stats-section .picker-button').click();
    await page.mouse.click(5, 5);
    await expect(page.locator('.stats-section .picker-panel')).toBeHidden();

    await page.getByRole('button', { name: 'Show table' }).click();
    await expect(page.locator('.stats-table tbody tr').first()).toBeVisible();
    const refresh = page.locator('.stats-section .section-head .button');
    await refresh.click();
    await expect(refresh).toHaveClass(/is-loading/);
    await expect(refresh).not.toHaveClass(/is-loading/);

    await page.locator('.tab[data-platform="youtube"]').click();
    await expect(page.locator('.stats-section')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
