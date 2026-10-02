import { expect, openDashboard, test } from './fixtures.js';

test.describe('layout and previews', () => {
  test('hover previews are silent and one at a time', async ({ page }) => {
    await openDashboard(page);
    const cards = page.locator('.card');
    await cards.nth(0).hover();
    await expect(page.locator('.thumb .preview')).toHaveCount(1, { timeout: 3000 });
    expect(await page.locator('.thumb .preview').evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
    await cards.nth(1).hover();
    await expect(page.locator('.thumb .preview')).toHaveCount(1, { timeout: 3000 });
    await cards.nth(1).click();
    await expect(page.locator('.thumb .preview')).toHaveCount(0);
  });

  test('switches to a list of days and a full screen player on phones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDashboard(page);
    const columns = await page.locator('.week').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
    await page.locator('.card').first().click();
    const panel = await page.locator('.player-panel').boundingBox();
    expect(panel?.width).toBe(390);
  });
});
