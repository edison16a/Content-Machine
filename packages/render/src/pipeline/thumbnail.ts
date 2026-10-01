import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { FileSystem, ProcessRunner } from '@content-machine/core';
import { runTool } from '../ffmpeg/run.js';

export const THUMB = { width: 360, height: 640, quality: 80, at: 2.0 } as const;

/** Grabs one frame of a finished video as a full-size PNG. */
export async function extractFrame(
  runner: ProcessRunner,
  videoPath: string,
  at: number,
  outPath: string,
  scale?: string,
): Promise<void> {
  const filters = scale === undefined ? [] : ['-vf', scale];
  await runTool(runner, 'ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-loglevel',
    'error',
    '-ss',
    at.toFixed(3),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    ...filters,
    '-update',
    '1',
    outPath,
  ]);
}

/**
 * Writes the 360x640 poster for a video from the frame at 2.0s, encoded as
 * JPEG quality 80 with canvas so the quality setting means what it says.
 */
export async function makeThumbnail(
  deps: { runner: ProcessRunner; fs: FileSystem },
  videoPath: string,
  thumbPath: string,
  tmpDir: string,
): Promise<void> {
  const frame = join(tmpDir, `${randomUUID()}.png`);
  await deps.fs.mkdirp(tmpDir);
  await extractFrame(
    deps.runner,
    videoPath,
    THUMB.at,
    frame,
    `scale=${THUMB.width}:${THUMB.height}:flags=lanczos`,
  );
  try {
    const image = await loadImage(Buffer.from(await deps.fs.readBytes(frame)));
    const canvas = createCanvas(THUMB.width, THUMB.height);
    canvas.getContext('2d').drawImage(image, 0, 0, THUMB.width, THUMB.height);
    await deps.fs.writeBytes(thumbPath, await canvas.encode('jpeg', THUMB.quality));
  } finally {
    await deps.fs.remove(frame);
  }
}
