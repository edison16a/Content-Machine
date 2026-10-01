import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (pkg: string): string =>
  fileURLToPath(new URL(`./packages/${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@content-machine/core': src('core'),
      '@content-machine/render': src('render'),
      '@content-machine/dashboard': src('dashboard'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'test/**/*.test.ts', 'scripts/test/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/dashboard/src/client/**', 'packages/cli/src/bin.ts', '**/index.ts'],
      reporter: ['text-summary', 'html', 'json-summary'],
      thresholds: {
        'packages/core/src/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
      },
    },
  },
});
