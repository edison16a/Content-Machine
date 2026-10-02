import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
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
