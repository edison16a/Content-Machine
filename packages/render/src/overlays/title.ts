import { createCanvas } from '@napi-rs/canvas';
import {
  DEFAULT_LAYOUT,
  TITLE_BLOCK_HEIGHT,
  ValidationError,
  findAccentRange,
  fitTitle,
  toTitleCase,
  type TitleFit,
} from '@content-machine/core';
import { OVERLAY_PADDING, TEXT_SHADOW, canvasMeasure, fontAt, withShadows } from './canvas.js';

export interface TitleSpec {
  title: string;
  accent: string;
  accentColor: string;
  textColor: string;
}

export interface TitleImage {
  png: Uint8Array;
  fit: TitleFit;
  /** The PNG is taller than the title block by this much on each side. */
  padding: number;
}

/**
 * Draws the title as a transparent PNG: white words, the accent words in the
 * accent color, centered and bottom-aligned in the fixed two-line block.
 */
export async function renderTitle(spec: TitleSpec): Promise<TitleImage> {
  const measure = canvasMeasure();
  const text = toTitleCase(spec.title);
  const range = findAccentRange(text, spec.accent);
  if (range === undefined) {
    throw new ValidationError(
      'E_PLAN_INVALID',
      `The accent "${spec.accent}" is not in the title "${text}".`,
    );
  }
  const fit = fitTitle(text, measure);
  const width = DEFAULT_LAYOUT.canvasWidth;
  const canvas = createCanvas(width, TITLE_BLOCK_HEIGHT + 2 * OVERLAY_PADDING);
  const ctx = canvas.getContext('2d');
  ctx.font = fontAt(fit.fontSize);
  ctx.textBaseline = 'middle';
  const space = measure(' ', fit.fontSize);
  const top = OVERLAY_PADDING + TITLE_BLOCK_HEIGHT - fit.lines.length * fit.lineHeight;
  fit.lines.forEach((line, row) => {
    const y = top + row * fit.lineHeight + fit.lineHeight / 2;
    let x = (width - measure(line.words.join(' '), fit.fontSize)) / 2;
    line.words.forEach((word, offset) => {
      const index = line.firstWord + offset;
      ctx.fillStyle = index >= range[0] && index < range[1] ? spec.accentColor : spec.textColor;
      const at = x;
      withShadows(ctx, TEXT_SHADOW, () => {
        ctx.fillText(word, at, y);
      });
      x += measure(word, fit.fontSize) + space;
    });
  });
  return { png: await canvas.encode('png'), fit, padding: OVERLAY_PADDING };
}
