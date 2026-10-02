import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProcessResult, ProcessRunner } from '@content-machine/core';
import { collectChecks } from '../src/commands/doctor.js';
import { runFetch } from '../src/commands/fetch.js';
import { runNew } from '../src/commands/new.js';
import { context, tempRoot } from './helpers.js';

let root = '';
let cleanup: () => Promise<void> = () => Promise.resolve();

beforeEach(async () => {
  ({ root, cleanup } = await tempRoot());
});
afterEach(() => cleanup());

const ok = (stdout = ''): ProcessResult => ({ code: 0, stdout, stderr: '' });

/**
 * Pretends to be yt-dlp: answers --version and --dump-single-json, and on a
 * download writes the files yt-dlp would write. Everything else fails, so a
 * test notices if fetch starts calling something new.
 */
class FakeYtDlp implements ProcessRunner {
  calls: string[][] = [];
  constructor(
    private readonly info: Record<string, unknown>,
    private readonly caption: string | undefined = 'en.vtt',
    private readonly installed = true,
  ) {}

  async run(command: string, args: readonly string[]): Promise<ProcessResult> {
    this.calls.push([command, ...args]);
    if (command !== 'yt-dlp' || !this.installed) return { code: 127, stdout: '', stderr: '' };
    if (args.includes('--version')) return ok('2026.08.19\n');
    if (args.includes('--dump-single-json')) return ok(JSON.stringify(this.info));
    const folder = args[args.indexOf('--paths') + 1] ?? '';
    const stem = (args[args.indexOf('--output') + 1] ?? '').replace('.%(ext)s', '');
    if (this.info.id === 'broken') {
      return { code: 1, stdout: '', stderr: 'noise\nERROR: Video unavailable\n' };
    }
    await writeFile(join(folder, `${stem}.mp4`), 'video');
    if (this.caption !== undefined && args.includes('--sub-langs')) {
      await writeFile(
        join(folder, `${stem}.${this.caption}`),
        'WEBVTT\n\n00:00.000 --> 00:01.000\nhi\n',
      );
    }
    return ok();
  }
}

const zooInfo = {
  id: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  channel: 'jawed',
  extractor_key: 'Youtube',
  duration: 19,
  subtitles: { en: [] },
};

function fetchContext(runner: ProcessRunner) {
  const made = context(root, undefined, true);
  return { ...made, ctx: { ...made.ctx, runner } };
}

describe('fetch', () => {
  it('saves the video and transcript in source/downloads and remembers the channel', async () => {
    const runner = new FakeYtDlp(zooInfo);
    const { ctx } = fetchContext(runner);
    await runNew(ctx, 'zoo', {});
    const result = await runFetch(ctx, 'zoo', 'https://youtu.be/jNQXAC9IVRw', { captions: true });
    const downloads = join(root, 'projects', 'zoo', 'source', 'downloads');
    expect(result).toMatchObject({
      video: 'me-at-the-zoo.mp4',
      title: 'Me at the zoo',
      channel: 'jawed',
      platform: 'youtube',
      duration: 19,
      alreadyDownloaded: false,
    });
    expect(result.transcript).toBe(join(downloads, 'me-at-the-zoo.transcript.txt'));
    expect(await readdir(downloads)).toEqual(['me-at-the-zoo.mp4', 'me-at-the-zoo.transcript.txt']);
    const project = JSON.parse(
      await readFile(join(root, 'projects', 'zoo', 'project.json'), 'utf8'),
    ) as { channel: string; sourcePlatform: string };
    expect(project).toMatchObject({ channel: 'jawed', sourcePlatform: 'youtube' });
  });

  it('does not download twice and keeps a transcript you pasted', async () => {
    const runner = new FakeYtDlp(zooInfo);
    const { ctx } = fetchContext(runner);
    await runNew(ctx, 'zoo', { channel: 'Mine' });
    const downloads = join(root, 'projects', 'zoo', 'source', 'downloads');
    await writeFile(join(downloads, 'clip.transcript.txt'), 'pasted');
    const first = await runFetch(ctx, 'zoo', 'https://youtu.be/x', {
      name: 'clip',
      captions: true,
    });
    expect(await readFile(join(downloads, 'clip.transcript.txt'), 'utf8')).toBe('pasted');
    expect(await readdir(downloads)).toEqual(['clip.mp4', 'clip.transcript.txt']);
    expect(first.transcript).toBe(join(downloads, 'clip.transcript.txt'));
    const again = await runFetch(ctx, 'zoo', 'https://youtu.be/x', {
      name: 'clip',
      captions: true,
    });
    expect(again.alreadyDownloaded).toBe(true);
    expect(runner.calls.filter((call) => call.includes('--paths'))).toHaveLength(1);
    const project = JSON.parse(
      await readFile(join(root, 'projects', 'zoo', 'project.json'), 'utf8'),
    ) as { channel: string };
    expect(project.channel).toBe('Mine');
  });

  it('skips captions when asked and reports unreadable formats', async () => {
    const { ctx } = fetchContext(new FakeYtDlp(zooInfo));
    await runNew(ctx, 'zoo', {});
    const skipped = await runFetch(ctx, 'zoo', 'https://youtu.be/a', {
      name: 'a',
      captions: false,
    });
    expect(skipped.transcript).toBeNull();
    const odd = fetchContext(new FakeYtDlp(zooInfo, 'en.json3'));
    const result = await runFetch(odd.ctx, 'zoo', 'https://youtu.be/b', {
      name: 'b',
      captions: true,
    });
    expect(result.transcript).toBeNull();
    expect(odd.capture.stdout).toContain('"transcript": null');
  });

  it('explains missing yt-dlp, bad names and failed downloads', async () => {
    const { ctx } = fetchContext(new FakeYtDlp(zooInfo, undefined, false));
    await runNew(ctx, 'zoo', {});
    await expect(runFetch(ctx, 'zoo', 'https://youtu.be/a', { captions: true })).rejects.toThrow(
      expect.objectContaining({ code: 'E_YTDLP_MISSING', exitCode: 4 }),
    );
    const named = fetchContext(new FakeYtDlp(zooInfo));
    await expect(
      runFetch(named.ctx, 'zoo', 'https://youtu.be/a', { name: '../up', captions: true }),
    ).rejects.toThrow(expect.objectContaining({ code: 'E_USAGE' }));
    const broken = fetchContext(new FakeYtDlp({ id: 'broken', title: 'Gone' }));
    const error: unknown = await runFetch(broken.ctx, 'zoo', 'https://youtu.be/a', {
      captions: true,
    }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code: 'E_DOWNLOAD_FAILED' });
    expect(String((error as { hint?: string }).hint)).toContain('Video unavailable');
  });

  it('shows yt-dlp in doctor without making it required', async () => {
    const { ctx } = fetchContext(new FakeYtDlp(zooInfo, undefined, false));
    const check = (await collectChecks(ctx)).find((c) => c.name === 'yt-dlp');
    expect(check).toMatchObject({ ok: false, required: false, detail: 'not found' });
  });
});
