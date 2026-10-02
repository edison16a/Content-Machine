import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeFileSystem, locateSource, projectDirs } from '@content-machine/render';

let root = '';
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cm-sources-'));
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('locateSource', () => {
  it('looks in source/ first, then source/downloads/', async () => {
    const dirs = projectDirs(root);
    await mkdir(dirs.downloadsDir, { recursive: true });
    const fs = new NodeFileSystem();
    expect(await locateSource(fs, dirs.sourceDir, 'a.mp4')).toBeUndefined();
    await writeFile(join(dirs.downloadsDir, 'a.mp4'), 'fetched');
    expect(await locateSource(fs, dirs.sourceDir, 'a.mp4')).toBe(join(dirs.downloadsDir, 'a.mp4'));
    await writeFile(join(dirs.sourceDir, 'a.mp4'), 'mine');
    expect(await locateSource(fs, dirs.sourceDir, 'a.mp4')).toBe(join(dirs.sourceDir, 'a.mp4'));
  });
});
