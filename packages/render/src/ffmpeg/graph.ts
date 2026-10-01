import type { Layout } from '@content-machine/core';

/** Title and credit motion. Quiet on purpose: a fade and a short rise, no bounce. */
export const MOTION = { delay: 0.1, fade: 0.35, rise: 20 } as const;

/** Blurred background: shrink, blur, scale back, darken by 35%, lift saturation a touch. */
export const BACKGROUND = {
  smallWidth: 270,
  smallHeight: 480,
  blurSigma: 8,
  darken: 0.65,
  saturation: 1.15,
} as const;

export const MAX_FPS = 60;

export interface GraphInput {
  layout: Layout;
  titleY: number;
  creditY: number;
  /** Input indexes for each overlay PNG; shadow only exists for band layouts. */
  inputs: { title: number; credit: number; shadow: number | undefined };
  /** True when the source runs faster than 60 fps and must be capped. */
  capFps: boolean;
}

/**
 * Scales the source for the band, or covers the canvas for portrait sources.
 * All background work (blur, darken, saturation, the band shadow) happens at
 * quarter size before one cheap upscale; a blur looks the same either way and
 * it saves about a third of the render time.
 */
function baseChain(input: GraphInput): string[] {
  const { layout } = input;
  const { width: W, height: H } = layout.canvas;
  const fps = input.capFps ? `fps=${MAX_FPS},` : '';
  if (layout.kind === 'cover') {
    return [
      `[0:v]${fps}scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,format=yuv420p[base]`,
    ];
  }
  const fg = layout.foreground;
  const b = BACKGROUND;
  const shadow = input.inputs.shadow;
  const small = `${b.smallWidth}:${b.smallHeight}`;
  return [
    `[0:v]${fps}setsar=1,split=2[bgsrc][fgsrc]`,
    `[bgsrc]scale=${small}:force_original_aspect_ratio=increase,crop=${small},gblur=sigma=${b.blurSigma},` +
      `colorchannelmixer=rr=${b.darken}:gg=${b.darken}:bb=${b.darken},eq=saturation=${b.saturation},format=rgba[bgsmall]`,
    shadow === undefined
      ? '[bgsmall]null[bgshadow]'
      : `[${shadow}:v]format=rgba[shadow];[bgsmall][shadow]overlay=0:0[bgshadow]`,
    `[bgshadow]format=yuv420p,scale=${W}:${H}:flags=bilinear[bg]`,
    `[fgsrc]scale=${fg.width}:${fg.height}:flags=lanczos,format=yuv420p[fg]`,
    `[bg][fg]overlay=${fg.x}:${fg.y}:format=yuv420[base]`,
  ];
}

/** ffmpeg expression: an ease-out cubic rise from +20px to 0 over the fade. */
export function riseExpression(y: number): string {
  const { delay, fade, rise } = MOTION;
  return `${y}+${rise}*pow(1-clip((t-${delay})/${fade},0,1),3)`;
}

/**
 * The full filter graph. Overlays are pre-rendered PNGs looped as inputs;
 * the title fades in and rises, the credit only fades. Ends in yuv420p so
 * every browser can play the result.
 */
export function buildFilterGraph(input: GraphInput): string {
  const { delay, fade } = MOTION;
  const fadeIn = `format=rgba,fade=t=in:st=${delay}:d=${fade}:alpha=1`;
  return [
    ...baseChain(input),
    `[${input.inputs.title}:v]${fadeIn}[title]`,
    `[base][title]overlay=x=0:y='${riseExpression(input.titleY)}':eval=frame:format=yuv420[v1]`,
    `[${input.inputs.credit}:v]${fadeIn}[credit]`,
    `[v1][credit]overlay=x=0:y=${input.creditY}:format=yuv420[v2]`,
    '[v2]format=yuv420p[vout]',
  ].join(';');
}
