import type { SubtitleChoice } from './subtitles.js';

/**
 * yt-dlp needs a JavaScript runtime to read YouTube pages. Since 2025.11.12
 * it can use Node, which everyone running Content Machine already has.
 * Older builds do not know the flag and would refuse to start, so we only
 * pass it when the installed version is new enough.
 */
const JS_RUNTIME_SINCE = '2025.11.12';

/** yt-dlp versions are dates like "2026.08.19", so string order is date order. */
export function supportsNodeRuntime(version: string): boolean {
  const date = /^\d{4}\.\d{2}\.\d{2}/.exec(version.trim())?.[0];
  return date !== undefined && date >= JS_RUNTIME_SINCE;
}

/** Flags every call shares: one video only, no colour codes, no chatter. */
function common(version: string): string[] {
  return [
    '--no-playlist',
    '--no-warnings',
    '--no-color',
    ...(supportsNodeRuntime(version) ? ['--js-runtimes', 'node'] : []),
  ];
}

/** Reads the video's details without downloading anything. */
export function infoArgs(url: string, version: string): string[] {
  return [...common(version), '--dump-single-json', '--', url];
}

export interface DownloadRequest {
  url: string;
  /** yt-dlp's tool version, from `yt-dlp --version`. */
  version: string;
  /** Folder the files land in. */
  folder: string;
  /** File name without extension, already safe. */
  stem: string;
  subtitles: SubtitleChoice | undefined;
}

/**
 * Downloads the video as an MP4 plus one caption file. We prefer H.264 at up
 * to 1080p: it decodes fast during rendering and the output is 1080 wide
 * anyway. Streams are remuxed into MP4, never re-encoded, so the audio
 * arrives exactly as it was published.
 */
export function downloadArgs(request: DownloadRequest): string[] {
  const { subtitles } = request;
  const captions =
    subtitles === undefined
      ? []
      : [
          subtitles.automatic ? '--write-auto-subs' : '--write-subs',
          '--sub-langs',
          subtitles.language,
          '--sub-format',
          'vtt/srt/best',
        ];
  return [
    ...common(request.version),
    '--no-progress',
    '--format',
    'bv*+ba/b',
    '--format-sort',
    'vcodec:h264,res:1080,acodec:aac',
    '--merge-output-format',
    'mp4',
    '--remux-video',
    'mp4',
    '--paths',
    request.folder,
    '--output',
    `${request.stem}.%(ext)s`,
    ...captions,
    '--',
    request.url,
  ];
}
