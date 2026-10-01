import type { ProcessRunner } from '@content-machine/core';

export interface ToolReport {
  ffmpeg: string | undefined;
  ffprobe: string | undefined;
  libx264: boolean;
  videotoolbox: boolean;
}

/** First line of `-version` minus the copyright, e.g. "ffmpeg version 6.1.1". */
function versionOf(stdout: string): string {
  const first = stdout.split('\n')[0] ?? '';
  return first.replace(/\s+Copyright.*$/, '').trim();
}

/** Finds ffmpeg, ffprobe and the encoders the renderer can use. */
export async function detectTools(runner: ProcessRunner): Promise<ToolReport> {
  const [ffmpeg, ffprobe] = await Promise.all([
    runner.run('ffmpeg', ['-hide_banner', '-version']),
    runner.run('ffprobe', ['-hide_banner', '-version']),
  ]);
  const hasFfmpeg = ffmpeg.code === 0;
  const encoders = hasFfmpeg
    ? await runner.run('ffmpeg', ['-hide_banner', '-encoders'])
    : undefined;
  return {
    ffmpeg: hasFfmpeg ? versionOf(ffmpeg.stdout) : undefined,
    ffprobe: ffprobe.code === 0 ? versionOf(ffprobe.stdout) : undefined,
    libx264: encoders?.stdout.includes('libx264') ?? false,
    videotoolbox: encoders?.stdout.includes('h264_videotoolbox') ?? false,
  };
}
