import { z } from 'zod';
import { UserError } from '../errors/index.js';
import type { SourcePlatform } from '../schemas/index.js';
import { parseJsonText } from '../schemas/index.js';

/** A map of language code to available tracks. We only care about the keys. */
const trackMapSchema = z.record(z.string(), z.unknown()).nullish();

/**
 * The few fields we read from `yt-dlp --dump-single-json`. yt-dlp prints
 * hundreds of fields and changes them over time, so everything we do not
 * need is dropped and everything optional stays optional.
 */
export const videoInfoSchema = z.object({
  _type: z.string().nullish(),
  id: z.string().min(1),
  title: z.string().nullish(),
  channel: z.string().nullish(),
  uploader: z.string().nullish(),
  extractor_key: z.string().nullish(),
  duration: z.number().nullish(),
  webpage_url: z.string().nullish(),
  language: z.string().nullish(),
  is_live: z.boolean().nullish(),
  subtitles: trackMapSchema,
  automatic_captions: trackMapSchema,
});

export type VideoInfo = z.output<typeof videoInfoSchema>;

/** Parses yt-dlp's JSON and rejects things we cannot turn into one video file. */
export function parseVideoInfo(text: string): VideoInfo {
  const info = parseJsonText(videoInfoSchema, text, 'yt-dlp video info');
  if (info._type === 'playlist') {
    throw new UserError('E_USAGE', 'That link is a playlist, not a single video.', {
      hint: 'Open the video you want and copy its own link.',
    });
  }
  if (info.is_live === true) {
    throw new UserError('E_USAGE', 'That video is live right now.', {
      hint: 'Wait until the stream has ended and the replay is up, then try again.',
    });
  }
  return info;
}

/** yt-dlp extractor names for the platforms we have logos for. */
const EXTRACTOR_PLATFORMS: Record<string, SourcePlatform> = {
  youtube: 'youtube',
  youtubetab: 'youtube',
  twitch: 'twitch',
  twitchvod: 'twitch',
  twitchclips: 'twitch',
  kick: 'kick',
  kickvod: 'kick',
  kickclip: 'kick',
  tiktok: 'tiktok',
  instagram: 'instagram',
  twitter: 'x',
  facebook: 'facebook',
};

/** Which platform the video came from, so the credit line shows the right logo. */
export function platformOf(info: VideoInfo): SourcePlatform {
  const key = (info.extractor_key ?? '').toLowerCase();
  return EXTRACTOR_PLATFORMS[key] ?? 'other';
}

/** The channel name for the credit line. Some sites only fill in `uploader`. */
export function channelOf(info: VideoInfo): string {
  return (info.channel ?? info.uploader ?? '').trim();
}
