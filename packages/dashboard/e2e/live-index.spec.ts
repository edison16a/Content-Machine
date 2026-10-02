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
});
