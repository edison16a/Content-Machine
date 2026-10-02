import { createCanvas, type Image } from '@napi-rs/canvas';
import { CREDIT, DEFAULT_LAYOUT, fitCredit, type CreditFit } from '@content-machine/core';
import { OVERLAY_PADDING, TEXT_SHADOW, canvasMeasure, fontAt, withShadows } from './canvas.js';

export interface CreditSpec {
  channel: string;
  logo: Image | undefined;
  textColor: string;
}

export interface CreditImage {
  png: Uint8Array;
  fit: CreditFit;
  padding: number;
}

/**
 * Draws the credit line: source platform logo, a 16px gap, then the channel
 * name. The pair is centered as one unit and is never wider than 744px, which
 * keeps it clear of the app's buttons on the right.
 */
export async function renderCredit(spec: CreditSpec): Promise<CreditImage> {
  const measure = canvasMeasure();
  const logoWidth =
    spec.logo === undefined ? 0 : (spec.logo.width / spec.logo.height) * CREDIT.logoHeight;
  const fit = fitCredit(spec.channel, measure, logoWidth);
  const canvas = createCanvas(DEFAULT_LAYOUT.canvasWidth, CREDIT.blockHeight + 2 * OVERLAY_PADDING);
  const ctx = canvas.getContext('2d');
  const middle = OVERLAY_PADDING + CREDIT.blockHeight / 2;
  ctx.font = fontAt(fit.fontSize);
  const logoSpace = logoWidth > 0 ? logoWidth + CREDIT.logoGap : 0;
  const total = logoSpace + ctx.measureText(fit.text).width;
  let x = (DEFAULT_LAYOUT.canvasWidth - total) / 2;
  const logo = spec.logo;
  if (logo !== undefined) {
    const y = middle - CREDIT.logoHeight / 2;
    withShadows(ctx, [{ color: 'rgba(0,0,0,0.45)', blur: 14, offsetY: 3 }], () => {
      ctx.drawImage(logo, x, y, logoWidth, CREDIT.logoHeight);
    });
    x += logoWidth + CREDIT.logoGap;
  }
  ctx.font = fontAt(fit.fontSize);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = spec.textColor;
  withShadows(ctx, TEXT_SHADOW, () => {
    ctx.fillText(fit.text, x, middle);
  });
  return { png: await canvas.encode('png'), fit, padding: OVERLAY_PADDING };
}
