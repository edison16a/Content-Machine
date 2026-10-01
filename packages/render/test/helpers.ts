import { spawnSync } from 'node:child_process';

/** Integration tests need real ffmpeg; they are skipped when it is missing. */
export const hasFfmpeg = spawnSync('ffmpeg', ['-hide_banner', '-version']).status === 0;

/** Decodes a stretch of a file's audio to mono float samples at 48 kHz. */
export function decodeAudio(path: string, start: number, duration: number): Float32Array {
  const result = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      String(start),
      '-t',
      String(duration),
      '-i',
      path,
      '-ac',
      '1',
      '-ar',
      '48000',
      '-f',
      'f32le',
      '-',
    ],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  const bytes = result.stdout;
  return new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
}

/** Root mean square level in decibels. */
export function rmsDb(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return 10 * Math.log10(sum / Math.max(1, samples.length) + 1e-12);
}
