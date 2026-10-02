import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, type CommandContext } from '../src/context.js';
import { Output } from '../src/io/output.js';

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Captures what a command prints. */
export class Capture {
  stdout = '';
  stderr = '';
  readonly out: Output;
  constructor(json = false) {
    this.out = new Output(
      { json, verbose: false, quiet: false },
      { write: (t: string) => (this.stdout += t) },
      { write: (t: string) => (this.stderr += t) },
    );
  }
}

/** A throwaway Content Machine root with the committed defaults. */
export async function tempRoot(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await mkdtemp(join(tmpdir(), 'cm-cli-'));
  await mkdir(join(root, 'config'), { recursive: true });
  await copyFile(join(REPO_ROOT, 'config', 'defaults.json'), join(root, 'config', 'defaults.json'));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export function context(
  root: string,
  now = '2026-10-01T19:00:00Z',
  json = false,
): { ctx: CommandContext; capture: Capture } {
  const capture = new Capture(json);
  return { ctx: createContext({ root, now }, capture.out), capture };
}

/** Fakes a finished render: plan, render log and placeholder output files. */
export async function fakeRender(root: string, name: string, count: number): Promise<void> {
  const dir = join(root, 'projects', name);
  const items = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    source: 'v.mp4',
    start: i * 30,
    end: (i + 1) * 30,
  }));
  await writeFile(
    join(dir, 'plan', 'plan.json'),
    JSON.stringify({
      schemaVersion: 1,
      mode: 'sequential',
      sources: [
        {
          file: 'v.mp4',
          channel: 'Example Channel',
          platform: 'youtube',
          title: 'A Test Video',
          accent: 'Test',
        },
      ],
      items: items.map((i) => ({ ...i, note: `part ${i.id}` })),
    }),
  );
  await mkdir(join(dir, 'work'), { recursive: true });
  const log = items.map((i) => {
    const base = String(i.id).padStart(3, '0');
    return {
      ...i,
      plannedStart: i.start,
      plannedEnd: i.end,
      startSnapped: true,
      endSnapped: true,
      planKey: 'k',
      fingerprint: 'f',
      output: `videos/${base}.mp4`,
      thumb: `thumbs/${base}.jpg`,
      renderedAt: 'x',
    };
  });
  await writeFile(
    join(dir, 'work', 'render-log.json'),
    JSON.stringify({ schemaVersion: 1, items: log }),
  );
  for (const entry of log) {
    await writeFile(join(dir, entry.output), 'video');
    await writeFile(join(dir, entry.thumb), 'thumb');
  }
}

export async function writeMetadata(
  root: string,
  name: string,
  count: number,
  title = (id: number) => `Post ${id}`,
): Promise<void> {
  const items = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    postTitle: title(i + 1),
    captions: { tiktok: 't', instagram: 'i', youtube: 'y' },
  }));
  await writeFile(
    join(root, 'projects', name, 'plan', 'metadata.json'),
    JSON.stringify({ schemaVersion: 1, items }),
  );
}
