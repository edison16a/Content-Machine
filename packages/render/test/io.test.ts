import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ProcessRunner } from '@content-machine/core';
import {
  COMMAND_NOT_FOUND,
  NodeFileSystem,
  NodeProcessRunner,
  detectTools,
  pausesEvery,
  runTool,
  tail,
  toneExpression,
} from '@content-machine/render';

let dir = '';
const fs = new NodeFileSystem();

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cm-io-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('NodeFileSystem', () => {
  it('writes atomically and leaves no temp files', async () => {
    const path = join(dir, 'a', 'b.json');
    await fs.writeText(path, '{"x":1}');
    await fs.writeText(path, '{"x":2}');
    expect(await fs.readText(path)).toBe('{"x":2}');
    expect(await readdir(join(dir, 'a'))).toEqual(['b.json']);
    await fs.writeBytes(join(dir, 'bin'), new Uint8Array([1, 2, 3]));
    expect([...(await fs.readBytes(join(dir, 'bin')))]).toEqual([1, 2, 3]);
  });

  it('supports the rest of the port', async () => {
    await fs.appendText(join(dir, 'log', 'h.log'), 'one\n');
    await fs.appendText(join(dir, 'log', 'h.log'), 'two\n');
    expect(await fs.readText(join(dir, 'log', 'h.log'))).toBe('one\ntwo\n');
    await fs.copyFile(join(dir, 'bin'), join(dir, 'copy', 'bin'));
    await fs.rename(join(dir, 'copy', 'bin'), join(dir, 'moved', 'bin'));
    expect(await fs.exists(join(dir, 'moved', 'bin'))).toBe(true);
    expect((await fs.stat(join(dir, 'moved'))).isDirectory).toBe(true);
    await fs.mkdirp(join(dir, 'empty'));
    expect(await fs.list(dir)).toContain('empty');
    await fs.remove(join(dir, 'moved'));
    expect(await fs.exists(join(dir, 'moved'))).toBe(false);
  });

  it('cleans up the temp file when the rename fails', async () => {
    await fs.mkdirp(join(dir, 'target-dir', 'inner'));
    await expect(fs.writeText(join(dir, 'target-dir'), 'x')).rejects.toThrow();
    expect((await readdir(dir)).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
});

describe('NodeProcessRunner and runTool', () => {
  it('passes arguments without a shell', async () => {
    const result = await new NodeProcessRunner().run('node', [
      '-e',
      'process.stdout.write(process.argv[1])',
      'a "quoted" $HOME;',
    ]);
    expect(result).toMatchObject({ code: 0, stdout: 'a "quoted" $HOME;' });
  });

  it('reports a missing program as 127', async () => {
    expect((await new NodeProcessRunner().run('definitely-not-a-program', [])).code).toBe(
      COMMAND_NOT_FOUND,
    );
  });

  it('maps failures to typed errors', async () => {
    const missing: ProcessRunner = {
      run: () => Promise.resolve({ code: COMMAND_NOT_FOUND, stdout: '', stderr: '' }),
    };
    await expect(runTool(missing, 'ffmpeg', [])).rejects.toMatchObject({
      code: 'E_FFMPEG_MISSING',
      exitCode: 4,
    });
    await expect(runTool(missing, 'ffprobe', [])).rejects.toMatchObject({
      code: 'E_FFPROBE_MISSING',
    });
    const failing: ProcessRunner = {
      run: () => Promise.resolve({ code: 1, stdout: '', stderr: 'a\nb\nInvalid data' }),
    };
    await expect(runTool(failing, 'ffmpeg', [])).rejects.toMatchObject({
      code: 'E_FFMPEG_FAILED',
      exitCode: 5,
    });
    expect(tail('1\n2\n3\n', 2)).toBe('2\n3');
  });

  it('reports missing tools from detectTools', async () => {
    const none: ProcessRunner = {
      run: () => Promise.resolve({ code: COMMAND_NOT_FOUND, stdout: '', stderr: '' }),
    };
    expect(await detectTools(none)).toEqual({
      ffmpeg: undefined,
      ffprobe: undefined,
      libx264: false,
      videotoolbox: false,
    });
  });
});

describe('synthetic helpers', () => {
  it('spreads pauses with jitter and silences them in the tone', () => {
    const pauses = pausesEvery(60, 8);
    expect(pauses.length).toBeGreaterThan(4);
    expect(pauses.every((p, i) => i === 0 || p > (pauses[i - 1] ?? 0))).toBe(true);
    const spec = {
      duration: 60,
      width: 1,
      height: 1,
      fps: 1,
      colors: ['000000'],
      pauses: [5],
      pauseLength: 0.5,
      toneHz: 220,
    };
    expect(toneExpression(spec)).toMatch(/^if\(between\(t,5,5.50\),0,/);
    expect(toneExpression({ ...spec, pauses: [] })).not.toMatch(/^if/);
  });
});
