// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Node built-ins that would give the pure core package side effects. */
const NODE_SIDE_EFFECT_MODULES = [
  'fs',
  'fs/promises',
  'child_process',
  'os',
  'net',
  'http',
  'https',
  'worker_threads',
  'process',
].flatMap((name) => [name, `node:${name}`]);

/**
 * Builds a no-restricted-imports rule that blocks a package from importing
 * packages above it in the dependency graph (cli, render/dashboard, core).
 */
function restrict(forbiddenPackages, extraPaths = []) {
  return [
    'error',
    {
      paths: extraPaths.map((name) => ({
        name,
        message: 'core is pure: no filesystem, processes, network or OS access.',
      })),
      patterns: forbiddenPackages.map((pkg) => ({
        group: [`@content-machine/${pkg}`, `@content-machine/${pkg}/*`],
        message: 'This import breaks the dependency direction cli -> render/dashboard -> core.',
      })),
    },
  ];
}

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      'projects/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: [
          './packages/*/tsconfig.json',
          './packages/dashboard/tsconfig.client.json',
          './tsconfig.tests.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports so imports stay greppable.',
        },
      ],
      eqeqeq: 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['eslint.config.js', 'vitest.config.ts', 'playwright.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict(['render', 'dashboard', 'cli'], NODE_SIDE_EFFECT_MODULES),
    },
  },
  {
    files: ['packages/render/src/**/*.ts'],
    rules: { 'no-restricted-imports': restrict(['dashboard', 'cli']) },
  },
  {
    files: ['packages/dashboard/src/**/*.ts'],
    rules: { 'no-restricted-imports': restrict(['render', 'cli']) },
  },
  {
    files: ['packages/dashboard/src/client/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/test/**/*.ts', '**/e2e/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
