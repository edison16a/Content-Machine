import { randomUUID } from 'node:crypto';
import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { FileStat, FileSystem } from '@content-machine/core';

/**
 * Writes to a temp file in the same folder, then renames it into place.
 * A crash mid-write leaves the old file intact instead of half a file.
 */
async function writeAtomic(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = join(dirname(path), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, data);
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

/** The real filesystem, used by the CLI. */
export class NodeFileSystem implements FileSystem {
  readText(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  async readBytes(path: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(path));
  }

  writeText(path: string, data: string): Promise<void> {
    return writeAtomic(path, data);
  }

  writeBytes(path: string, data: Uint8Array): Promise<void> {
    return writeAtomic(path, data);
  }

  async appendText(path: string, data: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, data, 'utf8');
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async mkdirp(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async list(path: string): Promise<string[]> {
    return (await readdir(path)).sort();
  }

  async stat(path: string): Promise<FileStat> {
    const info = await stat(path);
    return { size: info.size, mtimeMs: info.mtimeMs, isDirectory: info.isDirectory() };
  }

  async remove(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true });
  }

  async copyFile(from: string, to: string): Promise<void> {
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
  }

  async rename(from: string, to: string): Promise<void> {
    await mkdir(dirname(to), { recursive: true });
    await rename(from, to);
  }
}
