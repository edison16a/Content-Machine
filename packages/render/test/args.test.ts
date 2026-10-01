import { describe, expect, it } from 'vitest';
import { computeLayout } from '@content-machine/core';
import {
  buildFilterGraph,
  buildPreviewArgs,
  buildRenderArgs,
  riseExpression,
  type RenderJob,
} from '@content-machine/render';

function job(overrides: Partial<RenderJob> = {}): RenderJob {
  return {
    sourcePath: '/p/source/my video.mp4',
    start: 12.5,
    duration: 47.3,
    outputPath: '/p/work/tmp/render-1.mp4',
    layout: computeLayout(1920, 1080),
    titlePath: '/c/title.png',
    creditPath: '/c/credit.png',
    shadowPath: '/c/shadow.png',
    titleY: 374,
    creditY: 1252,
    fps: 29.97,
    sampleRate: 44100,
    hw: false,
    ...overrides,
  };
}

describe('buildRenderArgs', () => {
  it('seeks before the input and limits the output duration', () => {
    const args = buildRenderArgs(job());
    expect(args.slice(args.indexOf('-ss'), args.indexOf('-ss') + 4)).toEqual([
      '-ss',
      '12.500',
      '-i',
      '/p/source/my video.mp4',
    ]);
    expect(args[args.indexOf('-t') + 1]).toBe('47.300');
    expect(args.at(-1)).toBe('/p/work/tmp/render-1.mp4');
  });

  it('never filters audio: AAC-LC 256k at the source rate with no -af', () => {
    const args = buildRenderArgs(job());
    expect(args).not.toContain('-af');
    expect(args).not.toContain('-filter:a');
    expect(args.join(' ')).not.toMatch(/loudnorm|volume|acompressor|alimiter|dynaudnorm/);
    expect(args.join(' ')).toContain('-c:a aac -profile:a aac_low -b:a 256k -ar 44100');
    expect(args.join(' ')).toContain('-map 0:a:0');
  });

  it('encodes H.264 high, CRF 18, medium, yuv420p, faststart', () => {
    const joined = buildRenderArgs(job()).join(' ');
    expect(joined).toContain('-c:v libx264 -profile:v high -crf 18 -preset medium');
    expect(joined).toContain('-pix_fmt yuv420p');
    expect(joined).toContain('-movflags +faststart');
    expect(buildRenderArgs(job({ preset: 'veryfast' })).join(' ')).toContain('-preset veryfast');
    expect(buildRenderArgs(job({ hw: true })).join(' ')).toContain('-c:v h264_videotoolbox');
  });

  it('adds a silent track when the source has no audio', () => {
    const args = buildRenderArgs(job({ sampleRate: undefined }));
    expect(args.join(' ')).toContain('-f lavfi -i anullsrc=r=48000:cl=stereo');
    expect(args.join(' ')).toContain('-map 4:a:0');
  });

  it('skips the shadow input for portrait sources and caps fast sources at 60 fps', () => {
    const portrait = buildRenderArgs(
      job({ layout: computeLayout(1080, 1920), shadowPath: undefined, fps: 120 }),
    );
    const graph = portrait[portrait.indexOf('-filter_complex') + 1] ?? '';
    expect(graph).toContain('fps=60');
    expect(graph).toContain('crop=1080:1920');
    expect(portrait[portrait.indexOf('-framerate') + 1]).toBe('60.000');
    expect(buildRenderArgs(job({ fps: 0 }))[buildRenderArgs(job()).indexOf('-framerate') + 1]).toBe(
      '30.000',
    );
  });

  it('builds a one-frame preview with the same graph', () => {
    const args = buildPreviewArgs(job(), 2, '/p/work/preview.png');
    expect(args.slice(-9)).toEqual([
      '-map',
      '[vout]',
      '-ss',
      '2.000',
      '-frames:v',
      '1',
      '-update',
      '1',
      '/p/work/preview.png',
    ]);
    expect(args.at(-1)).toBe('/p/work/preview.png');
  });
});

describe('buildFilterGraph', () => {
  it('fades and raises the title with an ease-out curve, credit only fades', () => {
    const graph = buildFilterGraph({
      layout: computeLayout(1920, 1080),
      titleY: 374,
      creditY: 1252,
      inputs: { title: 1, credit: 2, shadow: 3 },
      capFps: false,
    });
    expect(graph).toContain(`y='${riseExpression(374)}'`);
    expect(riseExpression(374)).toBe('374+20*pow(1-clip((t-0.1)/0.35,0,1),3)');
    expect(graph).toContain('[v1][credit]overlay=x=0:y=1252');
    expect(graph).toContain('gblur=sigma=8');
    expect(graph).toContain('[3:v]format=rgba[shadow]');
    expect(graph.endsWith('[v2]format=yuv420p[vout]')).toBe(true);
  });

  it('skips the shadow overlay when there is none', () => {
    const graph = buildFilterGraph({
      layout: computeLayout(1920, 1080),
      titleY: 1,
      creditY: 2,
      inputs: { title: 1, credit: 2, shadow: undefined },
      capFps: false,
    });
    expect(graph).toContain('[bgsmall]null[bgshadow]');
  });
});
