import { describe, expect, it } from 'vitest';
import {
  channelOf,
  chooseSubtitles,
  downloadArgs,
  downloadStem,
  infoArgs,
  parseVideoInfo,
  parseVideoUrl,
  platformOf,
  supportsNodeRuntime,
  type VideoInfo,
} from '@content-machine/core';

const info = (fields: Partial<VideoInfo>): VideoInfo => ({ id: 'abc123', ...fields });

describe('parseVideoUrl', () => {
  it('accepts web links and trims spaces', () => {
    expect(parseVideoUrl('  https://youtu.be/abc  ')).toBe('https://youtu.be/abc');
  });

  it('rejects search terms, files and other schemes', () => {
    for (const bad of ['funny cats', '/Users/me/video.mp4', 'file:///tmp/a.mp4', 'ftp://x/y']) {
      expect(() => parseVideoUrl(bad)).toThrow(expect.objectContaining({ code: 'E_USAGE' }));
    }
  });
});

describe('parseVideoInfo', () => {
  it('keeps the fields we use and drops the rest', () => {
    const parsed = parseVideoInfo(
      JSON.stringify({ id: 'x', title: 'Hi', formats: [1, 2], channel: 'Me', duration: 19 }),
    );
    expect(parsed).toEqual({ id: 'x', title: 'Hi', channel: 'Me', duration: 19 });
  });

  it('refuses playlists and live streams', () => {
    expect(() => parseVideoInfo('{"id":"p","_type":"playlist"}')).toThrow(/playlist/);
    expect(() => parseVideoInfo('{"id":"l","is_live":true}')).toThrow(/live/);
  });

  it('reports broken output as a JSON error', () => {
    expect(() => parseVideoInfo('nope')).toThrow(expect.objectContaining({ code: 'E_JSON_PARSE' }));
  });
});

describe('platformOf and channelOf', () => {
  it('maps extractors to logo platforms', () => {
    expect(platformOf(info({ extractor_key: 'Youtube' }))).toBe('youtube');
    expect(platformOf(info({ extractor_key: 'TwitchVod' }))).toBe('twitch');
    expect(platformOf(info({ extractor_key: 'Twitter' }))).toBe('x');
    expect(platformOf(info({ extractor_key: 'Vimeo' }))).toBe('other');
    expect(platformOf(info({}))).toBe('other');
  });

  it('falls back to the uploader for the channel name', () => {
    expect(channelOf(info({ channel: ' Jawed ', uploader: 'x' }))).toBe('Jawed');
    expect(channelOf(info({ uploader: 'Uploader' }))).toBe('Uploader');
    expect(channelOf(info({}))).toBe('');
  });
});

describe('downloadStem', () => {
  it('turns a title into a safe file name', () => {
    expect(downloadStem('How We Built A Tiny House (In 30 Days!)', 'id')).toBe(
      'how-we-built-a-tiny-house-in-30-days',
    );
    expect(downloadStem('Crème Brûlée', 'id')).toBe('creme-brulee');
  });

  it('falls back to the id, then to "video"', () => {
    expect(downloadStem('🔥🔥🔥', 'dQw4w9WgXcQ')).toBe('dqw4w9wgxcq');
    expect(downloadStem(undefined, '___')).toBe('video');
  });

  it('caps the length without a trailing hyphen', () => {
    const stem = downloadStem(`${'a'.repeat(59)} b`, 'id');
    expect(stem).toBe('a'.repeat(59));
  });
});

describe('chooseSubtitles', () => {
  it('prefers human captions in the spoken language', () => {
    const choice = chooseSubtitles(
      info({ language: 'es', subtitles: { en: [], 'es-419': [] }, automatic_captions: { es: [] } }),
    );
    expect(choice).toEqual({ language: 'es-419', automatic: false });
  });

  it('uses English human captions when the language is unknown', () => {
    expect(chooseSubtitles(info({ subtitles: { de: [], 'en-GB': [] } }))).toEqual({
      language: 'en-GB',
      automatic: false,
    });
  });

  it('ignores chat replays and falls back to the original automatic track', () => {
    const choice = chooseSubtitles(
      info({ subtitles: { live_chat: [] }, automatic_captions: { fr: [], 'en-orig': [], en: [] } }),
    );
    expect(choice).toEqual({ language: 'en-orig', automatic: true });
  });

  it('uses the spoken language or English automatic track, else nothing', () => {
    expect(
      chooseSubtitles(info({ language: 'de', automatic_captions: { de: [], en: [] } })),
    ).toEqual({ language: 'de', automatic: true });
    expect(chooseSubtitles(info({ automatic_captions: { en: [] } }))).toEqual({
      language: 'en',
      automatic: true,
    });
    expect(chooseSubtitles(info({ automatic_captions: { fr: [] } }))).toBeUndefined();
    expect(chooseSubtitles(info({}))).toBeUndefined();
  });
});

describe('yt-dlp arguments', () => {
  it('only asks for the Node runtime on versions that know the flag', () => {
    expect(supportsNodeRuntime('2026.08.19')).toBe(true);
    expect(supportsNodeRuntime('2025.11.12')).toBe(true);
    expect(supportsNodeRuntime('2025.10.22')).toBe(false);
    expect(supportsNodeRuntime('garbage')).toBe(false);
    expect(infoArgs('https://x.test/v', '2024.01.01')).toEqual([
      '--no-playlist',
      '--no-warnings',
      '--no-color',
      '--dump-single-json',
      '--',
      'https://x.test/v',
    ]);
    expect(infoArgs('https://x.test/v', '2026.01.01')).toContain('--js-runtimes');
  });

  it('downloads an MP4 into the folder with the chosen captions', () => {
    const args = downloadArgs({
      url: 'https://x.test/v',
      version: '2026.01.01',
      folder: '/p/source/downloads',
      stem: 'my-video',
      subtitles: { language: 'en-orig', automatic: true },
    });
    expect(args.slice(-2)).toEqual(['--', 'https://x.test/v']);
    expect(args).toContain('--write-auto-subs');
    expect(args.join(' ')).toContain('--paths /p/source/downloads --output my-video.%(ext)s');
    expect(args.join(' ')).toContain('--sub-langs en-orig');
  });

  it('skips captions when there are none', () => {
    const args = downloadArgs({
      url: 'https://x.test/v',
      version: '2026.01.01',
      folder: '/f',
      stem: 's',
      subtitles: undefined,
    });
    expect(args.some((arg) => arg.includes('subs'))).toBe(false);
  });
});
