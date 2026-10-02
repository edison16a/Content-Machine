/**
 * Generates the README images from the real dashboard running on the demo
 * project, in installed Google Chrome with the clock frozen so every run
 * produces the same pictures. Nothing here is mocked except the chat image,
 * which is clearly labeled as illustrative.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'docs', 'images');
const DEMO = join(ROOT, 'projects', 'demo');
/** The demo is built as if it were this moment, so dates in the images never change. */
const NOW = '2026-10-01T22:30:00.000Z';

async function ensureDemo(): Promise<void> {
  const clock = await readFile(join(DEMO, 'work', 'demo-clock.json'), 'utf8').catch(() => '');
  if (clock.includes(NOW)) return;
  console.log('Building the demo at a fixed date...');
  const result = spawnSync('node', ['packages/cli/dist/bin.js', '--now', NOW, 'demo'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('npm run demo failed');
}

interface Shot {
  file: string;
  width: number;
  height: number;
  scheme: 'light' | 'dark';
  scale?: number;
  prepare?: (page: Page) => Promise<void>;
}

/** Opens the player on a posted item and parks the video on a calm frame. */
async function openPlayer(page: Page): Promise<void> {
  await page.locator('.card').nth(4).click();
  const video = page.locator('.player video');
  await video.evaluate(async (el) => {
    const v = el as HTMLVideoElement;
    if (v.readyState < 1)
      await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.pause();
    v.currentTime = 2.5;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
  });
  // Let Chrome drop its buffering spinner before the picture is taken.
  await page.waitForTimeout(1500);
}

const SHOTS: Shot[] = [
  { file: 'dashboard-week.png', width: 1440, height: 900, scheme: 'light' },
  { file: 'dashboard-dark.png', width: 1440, height: 900, scheme: 'dark' },
  { file: 'dashboard-player.png', width: 1440, height: 900, scheme: 'light', prepare: openPlayer },
  { file: 'dashboard-mobile.png', width: 390, height: 844, scheme: 'light', scale: 2 },
];

async function capture(browser: Browser, shot: Shot): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    colorScheme: shot.scheme,
    deviceScaleFactor: shot.scale ?? 1,
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`file://${join(DEMO, 'dashboard.html')}`);
  await page.locator('.week .card').first().waitFor();
  await page.waitForTimeout(300);
  await shot.prepare?.(page);
  await page.screenshot({ path: join(OUT, shot.file) });
  await context.close();
  console.log(`docs/images/${shot.file}`);
}

async function chatImage(browser: Browser): Promise<void> {
  const page = await browser.newPage({
    viewport: { width: 880, height: 600 },
    deviceScaleFactor: 1.5,
  });
  await page.goto(`file://${join(ROOT, 'docs', 'mock', 'claude-usage.html')}`);
  await page.locator('.chat').screenshot({ path: join(OUT, 'claude-usage.png') });
  await page.close();
  console.log('docs/images/claude-usage.png');
}

await ensureDemo();
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const shot of SHOTS) await capture(browser, shot);
  await chatImage(browser);
} finally {
  await browser.close();
}
