import { expect, openDashboard, test } from './fixtures.js';

test.describe('calendar', () => {
  test('loads with no errors and no network requests', async ({ page }) => {
    const { requests, errors } = await openDashboard(page);
    await expect(page.locator('.day')).toHaveCount(7);
    await expect(page.locator('.day.is-today')).toHaveCount(1);
    await expect(page.locator('.chip-total .chip-value')).toHaveText('24');
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('shows official logos on the tabs and switches times per platform', async ({ page }) => {
    await openDashboard(page);
    for (const platform of ['tiktok', 'instagram', 'youtube']) {
      await expect(page.locator(`.tab[data-platform="${platform}"] img`)).toHaveAttribute(
        'src',
        /^data:image\/png;base64,/,
      );
    }
    const firstTime = page.locator('.slot-time').first();
    await expect(firstTime).toHaveText('12:00 PM');
    await page.locator('.tab[data-platform="instagram"]').click();
    await expect(page.locator('.tab[data-platform="instagram"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(firstTime).toHaveText('12:15 PM');
    await expect(page.locator('.handle')).toHaveText('@your.instagram');
    await page.locator('.tab[data-platform="youtube"]').click();
    await expect(firstTime).toHaveText('12:30 PM');
    await page.reload();
    await expect(page.locator('.tab[data-platform="youtube"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('navigates weeks with buttons, Today, arrow keys and First unposted', async ({ page }) => {
    await openDashboard(page);
    const title = page.locator('.week-title');
    const start = await title.textContent();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(title).not.toHaveText(start ?? '');
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(title).toHaveText(start ?? '');
    await page.keyboard.press('ArrowLeft');
    await expect(title).not.toHaveText(start ?? '');
    await page.keyboard.press('ArrowRight');
    await expect(title).toHaveText(start ?? '');
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'First unposted' }).click();
    await expect(page.locator('.card:focus')).toHaveCount(1);
    await expect(page.locator('.card:focus .badge')).not.toHaveText('Posted');
  });

  test('shows every status and quiet empty slots', async ({ page }) => {
    await openDashboard(page);
    await expect(page.locator('.badge-posted').first()).toBeVisible();
    await expect(page.locator('.badge-scheduled').first()).toBeVisible();
    await page.locator('.tab[data-platform="instagram"]').click();
    await expect(page.locator('.badge-failed')).toHaveCount(1);
    await page.getByRole('button', { name: 'Next week' }).click();
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page.locator('.slot-empty').first()).toBeVisible();
  });

  test('toggles and remembers dark mode', async ({ page }) => {
    await openDashboard(page);
    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).click();
    await expect(html).not.toHaveAttribute('data-theme', before ?? '');
    const after = await html.getAttribute('data-theme');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', after ?? '');
  });

  test('links to GitHub', async ({ page }) => {
    await openDashboard(page);
    await expect(page.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/edison16a/Content-Machine',
    );
  });
});
