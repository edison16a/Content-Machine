import { describe, expect, it } from 'vitest';
import { autoplan, type Silence } from '@content-machine/core';

describe('autoplan', () => {
  const every = (step: number, until: number): Silence[] =>
    Array.from({ length: Math.floor(until / step) }, (_, i) => ({
      start: (i + 1) * step - 0.25,
      end: (i + 1) * step + 0.25,
    }));

  it('prefers 52 to 60 second parts at pauses', () => {
    const parts = autoplan(200, every(10, 200));
    expect(parts.map((p) => [p.start, p.end])).toEqual([
      [0, 50],
      [50, 100],
      [100, 150],
      [150, 200],
    ]);
    const dense = autoplan(130, every(5, 130));
    expect(dense.map((p) => p.end)).toEqual([55, 110, 130]);
  });

  it('hard cuts at 59.5s when the audio never pauses, then re-splits a short tail', () => {
    const parts = autoplan(130, []);
    expect(parts.map((p) => [p.start, p.end, p.hardCut])).toEqual([
      [0, 59.5, true],
      [59.5, 94.75, true],
      [94.75, 130, true],
    ]);
  });

  it('always tiles the video with parts no longer than 59.98s', () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let run = 0; run < 200; run += 1) {
      const duration = 20 + random() * 900;
      const quiet: Silence[] = [];
      for (let t = random() * 20; t < duration; t += 2 + random() * 40)
        quiet.push({ start: t, end: t + 0.4 });
      const parts = autoplan(duration, quiet);
      expect(parts[0]?.start).toBe(0);
      expect(parts[parts.length - 1]?.end).toBeCloseTo(duration);
      parts.forEach((part, i) => {
        expect(part.end - part.start).toBeLessThanOrEqual(59.98);
        expect(part.end).toBeGreaterThan(part.start);
        if (i > 0) expect(part.start).toBe(parts[i - 1]?.end);
      });
    }
  });

  it('re-splits the last two parts when a short tail cannot merge', () => {
    const parts = autoplan(125, [
      { start: 54.75, end: 55.25 },
      { start: 109.75, end: 110.25 },
      { start: 85, end: 85.5 },
    ]);
    const last = parts.slice(-2);
    expect(last[0]?.end).toBe(last[1]?.start);
    expect(parts.every((p) => p.end - p.start <= 59.98)).toBe(true);
    expect(parts[parts.length - 1]?.end).toBe(125);
  });

  it('returns a single part for short videos', () => {
    expect(autoplan(40, [])).toEqual([{ start: 0, end: 40, hardCut: false }]);
  });
});
