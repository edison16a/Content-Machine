import { existsSync } from 'node:fs';
import { GlobalFonts, createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { MissingDependencyError, type Measure } from '@content-machine/core';
import { FONT_PATH } from '../io/assets.js';

/**
 * Registered under its own alias so a system-wide Poppins install can never
 * be picked instead of the bundled file.
 */
export const FONT_FAMILY = 'Content Machine Poppins ExtraBold';

let registered = false;

/** Registers the bundled font once. Throws exit 4 if the file is missing. */
export function ensureFont(path: string = FONT_PATH): void {
  if (registered) return;
  if (!existsSync(path) || GlobalFonts.registerFromPath(path, FONT_FAMILY) === null) {
    throw new MissingDependencyError(
      'E_FONT_MISSING',
      `The title font could not be loaded from ${path}.`,
      {
        hint: 'Restore assets/fonts/Poppins-ExtraBold.ttf from the repository (git checkout -- assets/fonts).',
      },
    );
  }
  registered = true;
}

export function fontAt(size: number): string {
  return `${size}px "${FONT_FAMILY}"`;
}

/** A Measure backed by real canvas text metrics in the bundled font. */
export function canvasMeasure(): Measure {
  ensureFont();
  const ctx = createCanvas(4, 4).getContext('2d');
  return (text, size) => {
    ctx.font = fontAt(size);
    return ctx.measureText(text).width;
  };
}

/** Soft, wide shadow: not a cartoon outline. */
export interface ShadowPass {
  color: string;
  blur: number;
  offsetY: number;
}

export const TEXT_SHADOW: readonly ShadowPass[] = [
  { color: 'rgba(0,0,0,0.6)', blur: 20, offsetY: 4 },
  { color: 'rgba(0,0,0,0.35)', blur: 6, offsetY: 2 },
];

/** Draws `paint` once per shadow pass so the shadows stack. */
export function withShadows(
  ctx: SKRSContext2D,
  passes: readonly ShadowPass[],
  paint: () => void,
): void {
  for (const pass of passes) {
    ctx.save();
    ctx.shadowColor = pass.color;
    ctx.shadowBlur = pass.blur;
    ctx.shadowOffsetY = pass.offsetY;
    paint();
    ctx.restore();
  }
}

/** Transparent padding around text PNGs so the shadow is never clipped. */
export const OVERLAY_PADDING = 48;
