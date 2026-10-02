import type { LayoutConstants } from '../schemas/index.js';
import {
  CREDIT,
  DEFAULT_LAYOUT,
  PORTRAIT_THRESHOLD,
  PORTRAIT_TITLE_OFFSET,
  TITLE_BLOCK_HEIGHT,
} from './constants.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where everything goes on the canvas. `band` puts the full source in a
 * horizontal band over a blurred copy of itself; `cover` fills the canvas.
 */
export interface Layout {
  kind: 'band' | 'cover';
  canvas: { width: number; height: number };
  foreground: Rect;
  title: Rect;
  credit: Rect;
}

/** Video dimensions must be even for yuv420p. */
function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

/** Tallest band that still leaves room for the title, credit and both gaps. */
export function foregroundMaxHeight(c: LayoutConstants = DEFAULT_LAYOUT): number {
  return (
    c.safeBottom -
    c.safeTop -
    TITLE_BLOCK_HEIGHT -
    CREDIT.topPadding -
    CREDIT.blockHeight -
    2 * c.gap
  );
}

/** The credit block is centered horizontally and never wider than CREDIT.maxWidth. */
function creditRect(y: number, canvasWidth: number): Rect {
  return {
    x: (canvasWidth - CREDIT.maxWidth) / 2,
    y,
    width: CREDIT.maxWidth,
    height: CREDIT.blockHeight,
  };
}

/** Landscape and square-ish sources: centered band, clamped into the safe zone. */
function bandLayout(width: number, height: number, c: LayoutConstants): Layout {
  const scale = Math.min(c.canvasWidth / width, foregroundMaxHeight(c) / height);
  const fgWidth = Math.min(even(width * scale), c.canvasWidth);
  const fgHeight = even(height * scale);
  let fgY = Math.round((c.canvasHeight - fgHeight) / 2);
  const titleTop = fgY - c.gap - TITLE_BLOCK_HEIGHT;
  if (titleTop < c.safeTop) fgY += c.safeTop - titleTop;
  const creditBottom = fgY + fgHeight + c.gap + CREDIT.topPadding + CREDIT.blockHeight;
  if (creditBottom > c.safeBottom) fgY -= creditBottom - c.safeBottom;
  return {
    kind: 'band',
    canvas: { width: c.canvasWidth, height: c.canvasHeight },
    foreground: {
      x: Math.round((c.canvasWidth - fgWidth) / 2),
      y: fgY,
      width: fgWidth,
      height: fgHeight,
    },
    title: {
      x: 0,
      y: fgY - c.gap - TITLE_BLOCK_HEIGHT,
      width: c.canvasWidth,
      height: TITLE_BLOCK_HEIGHT,
    },
    credit: creditRect(fgY + fgHeight + c.gap + CREDIT.topPadding, c.canvasWidth),
  };
}

/** Portrait sources: fill the canvas and float the text over it. */
function coverLayout(c: LayoutConstants): Layout {
  return {
    kind: 'cover',
    canvas: { width: c.canvasWidth, height: c.canvasHeight },
    foreground: { x: 0, y: 0, width: c.canvasWidth, height: c.canvasHeight },
    title: {
      x: 0,
      y: c.safeTop + PORTRAIT_TITLE_OFFSET,
      width: c.canvasWidth,
      height: TITLE_BLOCK_HEIGHT,
    },
    credit: creditRect(c.safeBottom - CREDIT.blockHeight, c.canvasWidth),
  };
}

/**
 * Computes the layout for a source of the given display size. The same aspect
 * ratio always produces the same layout, which keeps a project consistent.
 */
export function computeLayout(
  width: number,
  height: number,
  constants: LayoutConstants = DEFAULT_LAYOUT,
): Layout {
  if (!(width > 0 && height > 0)) throw new RangeError(`Invalid source size ${width}x${height}`);
  return width / height < PORTRAIT_THRESHOLD
    ? coverLayout(constants)
    : bandLayout(width, height, constants);
}
