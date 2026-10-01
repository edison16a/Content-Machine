import { createCanvas } from '@napi-rs/canvas';
import type { Layout } from '@content-machine/core';
import { BACKGROUND } from '../ffmpeg/graph.js';

/**
 * A soft dark glow where the video band sits, drawn at the background's
 * quarter size so ffmpeg can composite it before upscaling. It lifts the band
 * off the blurred background without drawing a hard border.
 */
export async function renderBandShadow(layout: Layout): Promise<Uint8Array> {
  const scale = BACKGROUND.smallWidth / layout.canvas.width;
  const fg = layout.foreground;
  const canvas = createCanvas(BACKGROUND.smallWidth, BACKGROUND.smallHeight);
  const ctx = canvas.getContext('2d');
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 56 * scale;
  ctx.shadowOffsetY = 10 * scale;
  ctx.fillStyle = '#000000';
  ctx.fillRect(fg.x * scale, fg.y * scale, fg.width * scale, fg.height * scale);
  return canvas.encode('png');
}
