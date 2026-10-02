import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runDashboard, runOpen } from '../src/commands/dashboard.js';
import { runNew } from '../src/commands/new.js';
import { runSchema } from '../src/commands/schema.js';
import { loadConfig } from '../src/config/load.js';
import { run } from '../src/program.js';
import { context, tempRoot } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

describe('dashboard, open, schema and config', () => {
  it('regenerates and opens the dashboard', async () => {
    const { ctx, capture } = context(root);
    await runNew(ctx, 'bees', {});
    const path = await runDashboard(ctx, 'bees');
    expect(path.endsWith('projects/bees/dashboard.html')).toBe(true);
    await runOpen(ctx, 'bees', () => Promise.resolve(false));
    expect(capture.stdout).toContain('Open this file yourself: file://');
    await runOpen(ctx, 'bees', () => Promise.resolve(true));
    expect(capture.stdout).toContain('Opened file://');
  });

  it('prints schemas and rejects unknown ones', () => {
    const { ctx, capture } = context(root, undefined, true);
    runSchema(ctx, undefined);
    runSchema(ctx, 'plan');
    expect(capture.stdout).toContain('"schemas"');
    expect(() => runSchema(ctx, 'nope')).toThrow(expect.objectContaining({ code: 'E_USAGE' }));
  });

  it('layers config/local.json over the defaults', async () => {
    await writeFile(
      join(root, 'config', 'local.json'),
      JSON.stringify({
        timezone: 'Europe/Berlin',
        stagger: { youtube: 45 },
        brand: { accentColor: '#00AAFF' },
      }),
    );
    const { ctx } = context(root);
    const config = await loadConfig(ctx.fs, root);
    expect(config.timezone).toBe('Europe/Berlin');
    expect(config.stagger).toEqual({ tiktok: 0, instagram: 15, youtube: 45 });
    expect(config.brand.accentColor).toBe('#00AAFF');
    expect(config.brand.font).toBe('Poppins ExtraBold');
  });
});

describe('exit codes', () => {
  it('maps failures to the documented codes', async () => {
    const quiet = ['--root', root, '--quiet'];
    expect(await run([...quiet, 'status'])).toBe(0);
    expect(await run([...quiet, 'mark', 'bees'])).toBe(2);
    expect(await run([...quiet, '--json', 'render', 'missing'])).toBe(2);
    expect(await run([...quiet, '--now', 'yesterday', 'status'])).toBe(2);
    await run([...quiet, 'new', 'bees']);
    await writeFile(join(root, 'projects', 'bees', 'plan', 'plan.json'), '{ broken');
    expect(await run([...quiet, 'render', 'bees'])).toBe(3);
  });
});
