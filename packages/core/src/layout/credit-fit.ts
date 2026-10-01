import { CREDIT } from './constants.js';
import type { Measure } from './title-fit.js';

export interface CreditFit {
  fontSize: number;
  text: string;
  truncated: boolean;
}

/**
 * Fits the channel name into the room left after the logo: shrinks from 52px
 * to 36px, then trims characters and adds an ellipsis.
 */
export function fitCredit(name: string, measure: Measure, logoWidth: number): CreditFit {
  const available = CREDIT.rightLimit - CREDIT.left - (logoWidth > 0 ? logoWidth + CREDIT.logoGap : 0);
  for (let size = CREDIT.fontSize; size >= CREDIT.minFontSize; size -= CREDIT.step) {
    if (measure(name, size) <= available) return { fontSize: size, text: name, truncated: false };
  }
  const size = CREDIT.minFontSize;
  let chars = Array.from(name);
  while (chars.length > 1 && measure(`${chars.join('').trimEnd()}…`, size) > available) chars = chars.slice(0, -1);
  return { fontSize: size, text: `${chars.join('').trimEnd()}…`, truncated: true };
}
