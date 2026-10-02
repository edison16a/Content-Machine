import type { LayoutConstants } from '../schemas/index.js';

/** Default 9:16 canvas and safe zone. Matches config/defaults.json. */
export const DEFAULT_LAYOUT: LayoutConstants = {
  canvasWidth: 1080,
  canvasHeight: 1920,
  safeTop: 230,
  safeBottom: 1540,
  gap: 36,
};

/** Title type scale. Starts big and steps down until both lines fit. */
export const TITLE = {
  maxSize: 88,
  minSize: 60,
  step: 2,
  linePitch: 1.12,
  /** 85% of the canvas width, so text never kisses the edges. */
  maxWidthRatio: 0.85,
  /** Titles narrower than this share of the max width stay on one line. */
  singleLineRatio: 0.6,
} as const;

/** Reserved for two lines at the largest size, so the band never moves. */
export const TITLE_BLOCK_HEIGHT = Math.ceil(2 * TITLE.maxSize * TITLE.linePitch);

/** Credit line: platform logo, a gap, then the channel name, centered. */
export const CREDIT = {
  logoHeight: 56,
  logoGap: 16,
  fontSize: 52,
  minFontSize: 36,
  step: 2,
  /**
   * Widest the centered credit may get (168px to 912px on a 1080 canvas), so
   * it stays clear of the like and comment buttons on the right.
   */
  maxWidth: 744,
  blockHeight: 64,
} as const;

/** Sources narrower than this (width / height) are treated as portrait. */
export const PORTRAIT_THRESHOLD = 0.7;
/** In portrait layouts the title sits this far below the safe top. */
export const PORTRAIT_TITLE_OFFSET = 30;
