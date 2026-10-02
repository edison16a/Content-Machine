/**
 * Generates the README images from the real dashboard running on the demo
 * project, in installed Google Chrome with the clock frozen so every run
 * produces the same pictures. Nothing here is mocked except the chat image,
 * which is clearly labeled as illustrative.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
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
  /** The dashboard is dark by default; light shots set the remembered choice first. */
  theme: 'light' | 'dark';
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
  { file: 'dashboard-week.png', width: 1440, height: 900, theme: 'dark' },
  { file: 'dashboard-player.png', width: 1440, height: 900, theme: 'dark', prepare: openPlayer },
  { file: 'dashboard-light.png', width: 1440, height: 900, theme: 'light' },
  { file: 'dashboard-mobile.png', width: 390, height: 844, theme: 'dark', scale: 2 },
];

async function capture(browser: Browser, shot: Shot): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.scale ?? 1,
  });
  const page = await context.newPage();
  await page.addInitScript((theme) => {
    localStorage.setItem('content-machine:theme', theme);
  }, shot.theme);
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
    viewport: { width: 920, height: 600 },
    deviceScaleFactor: 1.5,
  });
  await page.goto(`file://${join(ROOT, 'docs', 'mock', 'claude-usage.html')}`);
  await page.locator('.window').screenshot({ path: join(OUT, 'claude-usage.png') });
  await page.close();
  console.log('docs/images/claude-usage.png');
}

/**
 * A strip of real frames from the rendered demo videos: two Sequential parts
 * and two clips, with rounded corners on a transparent background.
 */
async function videoStrip(): Promise<void> {
  const frames = [
    join(DEMO, 'work', 'qa', 'frames', '002_mid.jpg'),
    join(DEMO, 'work', 'qa', 'frames', '014_mid.jpg'),
    join(ROOT, 'projects', 'demo-clips', 'work', 'qa', 'frames', '001_mid.jpg'),
    join(ROOT, 'projects', 'demo-clips', 'work', 'qa', 'frames', '002_mid.jpg'),
  ];
  const [w, h, gap, radius] = [300, 533, 24, 22];
  const canvas = createCanvas(frames.length * w + (frames.length - 1) * gap, h);
  const ctx = canvas.getContext('2d');
  for (const [index, path] of frames.entries()) {
    const x = index * (w + gap);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, 0, w, h, radius);
    ctx.clip();
    ctx.drawImage(await loadImage(await readFile(path)), x, 0, w, h);
    ctx.restore();
  }
  await writeFile(join(OUT, 'videos.png'), await canvas.encode('png'));
  console.log('docs/images/videos.png');
}

await ensureDemo();
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const shot of SHOTS) await capture(browser, shot);
  await chatImage(browser);
  await videoStrip();
} finally {
  await browser.close();
}
