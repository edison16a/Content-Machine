import { open, readFile, rm, stat } from 'node:fs/promises';
import { UserError } from '@content-machine/core';

const RETRY_MS = 100;
const TIMEOUT_MS = 10_000;
/** A lock older than this was left by a crashed process and may be taken over. */
const STALE_MS = 120_000;

async function tryAcquire(path: string): Promise<boolean> {
  try {
    const handle = await open(path, 'wx');
    await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`);
    await handle.close();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const info = await stat(path).catch(() => undefined);
    if (info !== undefined && Date.now() - info.mtimeMs > STALE_MS) await rm(path, { force: true });
    return false;
  }
}

/**
 * Runs `task` while holding an exclusive lock file. Two CLI runs updating the
 * same schedule or ledger at once would otherwise overwrite each other.
 */
export async function withLock<T>(path: string, task: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (!(await tryAcquire(path))) {
    if (Date.now() > deadline) {
      const owner = await readFile(path, 'utf8').catch(() => 'unknown');
      throw new UserError(
        'E_LOCKED',
        `Another Content Machine command is updating the schedule (lock held by ${owner.trim()}).`,
        {
          hint: `Wait for it to finish. If nothing is running, delete ${path}.`,
        },
      );
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }
  try {
    return await task();
  } finally {
    await rm(path, { force: true });
  }
}
