import type { VideoInfo } from './info.js';

/** Which captions to ask yt-dlp for, and whether they are human made. */
export interface SubtitleChoice {
  language: string;
  automatic: boolean;
}

/** Tracks that are not speech, like a stream's chat replay. */
const NOT_SPEECH = new Set(['live_chat', 'rechat']);

function languages(tracks: VideoInfo['subtitles']): string[] {
  return Object.keys(tracks ?? {}).filter((key) => !NOT_SPEECH.has(key));
}

/** "en" matches "en", "en-US" and "en-GB", but not "eng". */
function matches(code: string, wanted: string): boolean {
  return code === wanted || code.startsWith(`${wanted}-`);
}

/**
 * Picks the best transcript for planning cuts. Captions a person wrote beat
 * automatic ones, and the video's own language beats English, because a
 * translated track would not match what people actually say on screen.
 */
export function chooseSubtitles(info: VideoInfo): SubtitleChoice | undefined {
  const spoken = info.language ?? undefined;
  const manual = languages(info.subtitles);
  const pickManual =
    (spoken === undefined ? undefined : manual.find((code) => matches(code, spoken))) ??
    manual.find((code) => matches(code, 'en')) ??
    manual[0];
  if (pickManual !== undefined) return { language: pickManual, automatic: false };

  // Automatic captions come in every language by machine translation. The
  // track ending in "-orig" is the one transcribed from the real audio.
  const auto = languages(info.automatic_captions);
  const pickAuto =
    auto.find((code) => code.endsWith('-orig')) ??
    (spoken === undefined ? undefined : auto.find((code) => code === spoken)) ??
    auto.find((code) => code === 'en');
  return pickAuto === undefined ? undefined : { language: pickAuto, automatic: true };
}
