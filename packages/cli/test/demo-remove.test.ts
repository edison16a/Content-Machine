import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ledgerSchema } from '@content-machine/core';
import { runRemoveDemo } from '../src/commands/demo.js';
import { runNew } from '../src/commands/new.js';
import { runSchedule } from '../src/commands/schedule.js';
import { context, fakeRender, tempRoot, writeMetadata } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false,
  );

describe('demo --remove', () => {
  it('deletes the demo projects and their slots, and keeps real ones', async () => {
    const { ctx, capture } = context(root);
    for (const name of ['demo', 'mine']) {
      await runNew(ctx, name, {});
      await fakeRender(root, name, 2);
      await writeMetadata(root, name, 2);
      await runSchedule(ctx, name, {});
    }
    await runNew(ctx, 'demo-clips', {});

    await runRemoveDemo(ctx);
    expect(await exists(join(root, 'projects', 'demo'))).toBe(false);
    expect(await exists(join(root, 'projects', 'demo-clips'))).toBe(false);
    expect(await exists(join(root, 'projects', 'mine'))).toBe(true);
    const ledger = ledgerSchema.parse(
      JSON.parse(await readFile(join(root, 'schedule-ledger.json'), 'utf8')),
    );
    expect(new Set(ledger.entries.map((e) => e.project))).toEqual(new Set(['mine']));
    const live = await readFile(join(root, 'projects', 'dashboard-data.js'), 'utf8');
    expect(live).toContain('"project":"mine"');
    expect(live).not.toContain('"project":"demo"');
    expect(capture.stdout).toContain('Removed demo and demo-clips.');

    await runRemoveDemo(ctx);
    expect(capture.stdout).toContain('There were no demo projects to remove.');
  });
});
