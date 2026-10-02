import { defineConfig, devices } from '@playwright/test';

/**
 * Dashboard browser tests. They run in installed Google Chrome because
 * Playwright's bundled Chromium cannot play H.264 video or AAC audio.
 * Run `npm run demo` first: the tests use projects/demo.
 */
export default defineConfig({
  testDir: 'packages/dashboard/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
});
