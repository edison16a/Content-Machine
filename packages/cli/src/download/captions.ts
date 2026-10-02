import { join } from 'node:path';
import type { FileSystem, SubtitleChoice } from '@content-machine/core';

/** Caption formats the transcript parser understands. */
const READABLE = ['vtt', 'srt'];

export type CaptionOutcome =
  | { kind: 'saved'; path: string }
  | { kind: 'kept-existing'; path: string }
  | { kind: 'none' }
  | { kind: 'unreadable'; file: string };

/**
 * yt-dlp names caption files "<stem>.<language>.<ext>". The rest of Content
 * Machine looks for "<stem>.transcript.txt", so we rename the file to that.
 * A transcript you pasted yourself is never overwritten: it is usually
 * better than automatic captions.
 */
export async function adoptCaptions(
  fs: FileSystem,
  folder: string,
  stem: string,
  choice: SubtitleChoice | undefined,
): Promise<CaptionOutcome> {
  if (choice === undefined) return { kind: 'none' };
  const prefix = `${stem}.${choice.language}.`;
  const files = (await fs.list(folder)).filter((file) => file.startsWith(prefix));
  if (files.length === 0) return { kind: 'none' };
  const readable = files.find((file) => READABLE.includes(file.slice(prefix.length)));
  if (readable === undefined) return { kind: 'unreadable', file: files[0] ?? prefix };
  const target = join(folder, `${stem}.transcript.txt`);
  if (await fs.exists(target)) {
    await fs.remove(join(folder, readable));
    return { kind: 'kept-existing', path: target };
  }
  await fs.rename(join(folder, readable), target);
  return { kind: 'saved', path: target };
}
