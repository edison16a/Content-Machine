import { join } from 'node:path';
import type { FileSystem } from '@content-machine/core';

/**
 * Where `fetch` saves videos it downloads, inside source/. Keeping them in
 * their own folder means you can always tell your own files from fetched
 * ones, and clean up downloads without touching anything else.
 */
export const DOWNLOADS_FOLDER = 'downloads';

/**
 * Finds a source video by its plain file name. Plans only ever store the
 * name, so a video works the same whether you copied it into source/ or
 * fetched it into source/downloads/. Your own copy wins if both exist.
 */
export async function locateSource(
  fs: FileSystem,
  sourceDir: string,
  file: string,
): Promise<string | undefined> {
  for (const path of [join(sourceDir, file), join(sourceDir, DOWNLOADS_FOLDER, file)]) {
    if (await fs.exists(path)) return path;
  }
  return undefined;
}
