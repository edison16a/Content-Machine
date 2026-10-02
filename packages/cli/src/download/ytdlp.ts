import {
  MissingDependencyError,
  ToolError,
  downloadArgs,
  infoArgs,
  parseVideoInfo,
  type DownloadRequest,
  type ProcessResult,
  type ProcessRunner,
  type VideoInfo,
} from '@content-machine/core';

export const YTDLP = 'yt-dlp';

/** One line people can follow on any machine. Doctor shows the same text. */
export const YTDLP_INSTALL =
  'macOS: brew install yt-dlp. Windows: winget install yt-dlp. Linux: pipx install yt-dlp.';

/** The installed version, like "2026.08.19", or undefined when it is missing. */
export async function ytDlpVersion(runner: ProcessRunner): Promise<string | undefined> {
  const result = await runner.run(YTDLP, ['--version']);
  return result.code === 0 ? result.stdout.trim() : undefined;
}

export async function requireYtDlp(runner: ProcessRunner): Promise<string> {
  const version = await ytDlpVersion(runner);
  if (version === undefined) {
    throw new MissingDependencyError('E_YTDLP_MISSING', 'yt-dlp is not installed.', {
      hint: `Install it, then try again. ${YTDLP_INSTALL}`,
    });
  }
  return version;
}

/**
 * yt-dlp prints a lot to stderr. The line that starts with "ERROR:" is the
 * one a person needs, so we surface that and keep the rest out of the way.
 */
function failure(action: string, result: ProcessResult): ToolError {
  const lines = result.stderr.split('\n').map((line) => line.trim());
  const reason = lines.find((line) => line.startsWith('ERROR:')) ?? lines.filter(Boolean).pop();
  return new ToolError('E_DOWNLOAD_FAILED', `yt-dlp could not ${action}.`, {
    hint: `${reason ?? 'No details were printed.'} If the link works in a browser, update yt-dlp (yt-dlp -U, or brew upgrade yt-dlp) and try again.`,
  });
}

/** Reads the title, channel, captions and so on without downloading the video. */
export async function readVideoInfo(
  runner: ProcessRunner,
  url: string,
  version: string,
): Promise<VideoInfo> {
  const result = await runner.run(YTDLP, infoArgs(url, version));
  if (result.code !== 0) throw failure('read that link', result);
  return parseVideoInfo(result.stdout);
}

export async function downloadVideo(
  runner: ProcessRunner,
  request: DownloadRequest,
): Promise<void> {
  const result = await runner.run(YTDLP, downloadArgs(request));
  if (result.code !== 0) throw failure('download the video', result);
}
