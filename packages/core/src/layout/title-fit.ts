import { ValidationError } from '../errors/index.js';
import { splitWords } from '../plan/accent.js';
import { DEFAULT_LAYOUT, TITLE } from './constants.js';

/** Measures the rendered width of `text` at `fontSize` pixels. */
export type Measure = (text: string, fontSize: number) => number;

export interface TitleLine {
  words: string[];
  /** Index of this line's first word in the whole title, for accent coloring. */
  firstWord: number;
}

export interface TitleFit {
  fontSize: number;
  lineHeight: number;
  lines: TitleLine[];
}

/** Capitalizes each lowercase word, leaving words like "iPhone" or "NASA" alone. */
export function toTitleCase(title: string): string {
  return splitWords(title)
    .map((word) =>
      word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(' ');
}

/**
 * Splits words into the most balanced two lines. A single word is never left
 * alone on the last line unless the title only has two words.
 */
export function balancedSplit(
  words: readonly string[],
  size: number,
  measure: Measure,
): string[][] {
  if (words.length < 2) return [[...words]];
  let best: string[][] = [[...words.slice(0, -1)], [...words.slice(-1)]];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    if (words.length > 2 && words.length - i === 1) continue;
    const first = words.slice(0, i);
    const second = words.slice(i);
    const diff = Math.abs(measure(first.join(' '), size) - measure(second.join(' '), size));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [first, second];
    }
  }
  return best;
}

function linesFor(
  words: readonly string[],
  size: number,
  measure: Measure,
  maxWidth: number,
): string[][] {
  const oneLine = measure(words.join(' '), size);
  if (words.length === 1 || oneLine <= maxWidth * TITLE.singleLineRatio) return [[...words]];
  if (words.length === 2 && oneLine <= maxWidth) return [[...words]];
  return balancedSplit(words, size, measure);
}

/**
 * Picks the font size and line breaks for a title: starts at 88px and steps
 * down by 2px to 60px until every line fits 85% of the canvas width.
 */
export function fitTitle(
  title: string,
  measure: Measure,
  canvasWidth = DEFAULT_LAYOUT.canvasWidth,
): TitleFit {
  const words = splitWords(title);
  const maxWidth = canvasWidth * TITLE.maxWidthRatio;
  for (let size: number = TITLE.maxSize; size >= TITLE.minSize; size -= TITLE.step) {
    const lines = linesFor(words, size, measure, maxWidth);
    if (lines.every((line) => measure(line.join(' '), size) <= maxWidth)) {
      let firstWord = 0;
      const placed = lines.map((line) => {
        const result = { words: line, firstWord };
        firstWord += line.length;
        return result;
      });
      return { fontSize: size, lineHeight: Math.round(size * TITLE.linePitch), lines: placed };
    }
  }
  const perChar = measure(title, TITLE.minSize) / Math.max(1, title.length);
  const maxChars = Math.floor((2 * maxWidth * 0.95) / Math.max(1, perChar));
  throw new ValidationError('E_TITLE_TOO_LONG', `The title "${title}" does not fit on two lines.`, {
    hint: `Shorten it to about ${maxChars} characters or fewer (it is ${title.length}).`,
  });
}
