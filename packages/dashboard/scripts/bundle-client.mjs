// Bundles the dashboard client (TypeScript and CSS) into two files that the
// generator inlines into every dashboard.html. Runs as part of `npm run build`.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const shared = {
  bundle: true,
  minify: true,
  logLevel: 'warning',
  absWorkingDir: root,
  legalComments: 'none',
};

await build({
  ...shared,
  entryPoints: ['src/client/main.ts'],
  outfile: 'dist/client/client.js',
  format: 'iife',
  target: ['chrome110', 'safari16', 'firefox115'],
});

await build({
  ...shared,
  entryPoints: ['src/client/styles/index.css'],
  outfile: 'dist/client/client.css',
  target: ['chrome110', 'safari16', 'firefox115'],
});
