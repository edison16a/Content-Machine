import { describe, expect, it } from 'vitest';
import {
  CREDIT,
  DEFAULT_LAYOUT,
  TITLE_BLOCK_HEIGHT,
  balancedSplit,
  computeLayout,
  fitCredit,
  fitTitle,
  foregroundMaxHeight,
  toTitleCase,
  type Measure,
} from '@content-machine/core';

/** Monospace stand-in for canvas: every character is 0.6em wide. */
const measure: Measure = (text, size) => text.length * size * 0.6;

const ASPECTS: Array<[string, number, number]> = [
  ['16:9', 1920, 1080],
  ['4:3', 1440, 1080],
  ['1:1', 1080, 1080],
  ['4:5', 1080, 1350],
  ['9:16', 1080, 1920],
];

describe('computeLayout', () => {
  it.each(ASPECTS)('keeps %s inside the safe zone with no overlaps', (_, w, h) => {
    const layout = computeLayout(w, h);
    const { safeTop, safeBottom } = DEFAULT_LAYOUT;
    expect(layout.title.y).toBeGreaterThanOrEqual(safeTop);
    expect(layout.credit.y + layout.credit.height).toBeLessThanOrEqual(safeBottom);
    expect(layout.title.y + layout.title.height).toBeLessThanOrEqual(layout.credit.y);
    expect(layout.credit.width).toBe(CREDIT.maxWidth);
    expect(layout.credit.x + layout.credit.width / 2).toBe(540);
    expect(layout.credit.x + layout.credit.width).toBeLessThanOrEqual(912);
    if (layout.kind === 'band') {
      expect(layout.title.y + layout.title.height).toBeLessThanOrEqual(layout.foreground.y);
      expect(layout.foreground.y + layout.foreground.height).toBeLessThanOrEqual(layout.credit.y);
      expect(layout.foreground.width % 2).toBe(0);
      expect(layout.foreground.height % 2).toBe(0);
    }
  });

  it('turns 16:9 into a full width 1080x608 band with fixed gaps', () => {
    const layout = computeLayout(1920, 1080);
    expect(layout.kind).toBe('band');
    expect(layout.foreground).toEqual({ x: 0, y: 656, width: 1080, height: 608 });
    expect(layout.foreground.y - (layout.title.y + TITLE_BLOCK_HEIGHT)).toBe(36);
    expect(layout.credit.y - (layout.foreground.y + layout.foreground.height)).toBe(
      36 + CREDIT.topPadding,
    );
  });

  it('limits tall square-ish sources to the room left over', () => {
    const layout = computeLayout(1080, 1350);
    expect(layout.foreground.height).toBe(foregroundMaxHeight());
    expect(layout.foreground.x).toBe((1080 - layout.foreground.width) / 2);
  });

  it('covers the canvas for portrait sources', () => {
    const layout = computeLayout(1080, 1920);
    expect(layout.kind).toBe('cover');
    expect(layout.foreground).toEqual({ x: 0, y: 0, width: 1080, height: 1920 });
    expect(layout.title.y).toBe(260);
  });

  it('gives identical layouts for identical aspect ratios', () => {
    expect(computeLayout(1280, 720)).toEqual(computeLayout(3840, 2160));
  });

  it('clamps into the safe zone with tight custom constants', () => {
    const tight = { ...DEFAULT_LAYOUT, safeTop: 600, safeBottom: 1700 };
    const layout = computeLayout(1920, 1080, tight);
    expect(layout.title.y).toBeGreaterThanOrEqual(600);
    const bottomHeavy = { ...DEFAULT_LAYOUT, safeTop: 100, safeBottom: 1100 };
    const other = computeLayout(1920, 1080, bottomHeavy);
    expect(other.credit.y + other.credit.height).toBeLessThanOrEqual(1100);
  });

  it('rejects empty sizes', () => {
    expect(() => computeLayout(0, 100)).toThrow(RangeError);
  });
});

describe('fitTitle', () => {
  it('balances a normal title over two lines at full size', () => {
    const fit = fitTitle('How We Built A Tiny House', measure);
    expect(fit.fontSize).toBe(88);
    expect(fit.lines.map((l) => l.words.join(' '))).toEqual(['How We Built', 'A Tiny House']);
    expect(fit.lines[1]?.firstWord).toBe(3);
  });

  it('shrinks a 40 character title until it fits', () => {
    const fit = fitTitle('How We Built A Tiny House In Thirty Days', measure);
    expect(fit.lines).toHaveLength(2);
    expect(fit.fontSize).toBeLessThan(88);
    for (const line of fit.lines)
      expect(measure(line.words.join(' '), fit.fontSize)).toBeLessThanOrEqual(918);
  });

  it('keeps one word and short titles on one line', () => {
    expect(fitTitle('Unbelievable', measure).lines).toHaveLength(1);
    expect(fitTitle('He Won', measure).lines).toHaveLength(1);
  });

  it('never leaves one word alone on the last line', () => {
    const split = balancedSplit(['Supercalifragilistic', 'Is', 'A', 'Word'], 88, measure);
    expect(split[1]?.length).toBeGreaterThan(1);
    expect(balancedSplit(['Alone'], 88, measure)).toEqual([['Alone']]);
  });

  it('splits a two word title that is too wide for one line', () => {
    const fit = fitTitle('Extraordinarily Unbelievable', measure);
    expect(fit.lines.map((l) => l.words)).toEqual([['Extraordinarily'], ['Unbelievable']]);
  });

  it('fails with the maximum length when nothing fits', () => {
    const long = 'This Title Is Far Too Long To Ever Fit On Two Lines Of The Video';
    expect(() => fitTitle(long, measure)).toThrow(
      expect.objectContaining({ code: 'E_TITLE_TOO_LONG' }),
    );
    try {
      fitTitle(long, measure);
    } catch (error) {
      expect((error as { hint: string }).hint).toMatch(/about \d+ characters/);
    }
  });
});

describe('toTitleCase', () => {
  it('capitalizes lowercase words only', () => {
    expect(toTitleCase('how we built an iPhone at NASA')).toBe('How We Built An iPhone At NASA');
  });
});

describe('fitCredit', () => {
  it('uses 52px when the name fits', () => {
    expect(fitCredit('Example Channel', measure, 56)).toEqual({
      fontSize: 52,
      text: 'Example Channel',
      truncated: false,
    });
  });

  it('shrinks, then truncates with an ellipsis', () => {
    const shrunk = fitCredit('A Fairly Long Channel Name Here', measure, 56);
    expect(shrunk.fontSize).toBeLessThan(52);
    const cut = fitCredit('An Extremely Long Channel Name That Will Never Fit Here', measure, 56);
    expect(cut).toMatchObject({ fontSize: 36, truncated: true });
    expect(cut.text.endsWith('…')).toBe(true);
    expect(measure(cut.text, 36)).toBeLessThanOrEqual(744 - 56 - 16);
    expect(fitCredit('No Logo', measure, 0).truncated).toBe(false);
  });
});
