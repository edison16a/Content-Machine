import { describe, expect, it } from 'vitest';
import { parseProbe, parseRate, parseSilenceLog } from '@content-machine/render';

describe('parseRate', () => {
  it('parses fractions and plain numbers', () => {
    expect(parseRate('30000/1001')).toBeCloseTo(29.97, 2);
    expect(parseRate('25')).toBe(25);
    expect(parseRate('0/0')).toBe(0);
    expect(parseRate(undefined)).toBe(0);
    expect(parseRate('x')).toBe(0);
  });
});

describe('parseProbe', () => {
  it('reads streams and ignores cover art', () => {
    const info = parseProbe(
      JSON.stringify({
        streams: [
          {
            codec_type: 'video',
            codec_name: 'mjpeg',
            width: 600,
            height: 600,
            disposition: { attached_pic: 1 },
          },
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            avg_frame_rate: '30/1',
            sample_aspect_ratio: '1:1',
          },
          { codec_type: 'audio', codec_name: 'aac', sample_rate: '48000' },
        ],
        format: { duration: '61.5' },
      }),
    );
    expect(info).toEqual({
      duration: 61.5,
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: 'h264',
      audioCodec: 'aac',
      sampleRate: 48000,
      videoStreams: 1,
      audioStreams: 1,
    });
  });

  it('corrects for pixel aspect and rotation', () => {
    const anamorphic = parseProbe(
      JSON.stringify({
        streams: [
          {
            codec_type: 'video',
            width: 1440,
            height: 1080,
            sample_aspect_ratio: '4:3',
            r_frame_rate: '25/1',
          },
        ],
        format: {},
      }),
    );
    expect([anamorphic.width, anamorphic.height, anamorphic.fps]).toEqual([1920, 1080, 25]);
    const rotated = parseProbe(
      JSON.stringify({
        streams: [
          { codec_type: 'video', width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] },
        ],
      }),
    );
    expect([rotated.width, rotated.height]).toEqual([1080, 1920]);
    const tagged = parseProbe(
      JSON.stringify({
        streams: [
          { codec_type: 'video', width: 1920, height: 1080, tags: { rotate: '90' }, duration: '3' },
        ],
      }),
    );
    expect([tagged.width, tagged.height, tagged.duration]).toEqual([1080, 1920, 3]);
    const empty = parseProbe(JSON.stringify({}));
    expect([empty.videoStreams, empty.width, empty.sampleRate]).toEqual([0, 0, undefined]);
  });
});

describe('parseSilenceLog', () => {
  it('pairs starts with ends and closes an open silence at the end', () => {
    const log = [
      '[silencedetect @ 0x1] silence_start: -0.01',
      '[silencedetect @ 0x1] silence_end: 0.52 | silence_duration: 0.53',
      'frame=  1 fps=0.0',
      '[silencedetect @ 0x1] silence_start: 10.25',
      '[silencedetect @ 0x1] silence_end: 10.9 | silence_duration: 0.65',
      '[silencedetect @ 0x1] silence_start: 59.5',
    ].join('\n');
    expect(parseSilenceLog(log, 60)).toEqual([
      { start: 0, end: 0.52 },
      { start: 10.25, end: 10.9 },
      { start: 59.5, end: 60 },
    ]);
    expect(parseSilenceLog('silence_end: 3', 10)).toEqual([]);
  });
});
