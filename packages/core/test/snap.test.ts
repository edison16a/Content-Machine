import { describe, expect, it } from 'vitest';
import {
  candidatesNear,
  mergeSilences,
  nearest,
  snapPlan,
  type Silence,
} from '@content-machine/core';
import { clipPlan, sequentialPlan } from './fixtures.js';

describe('mergeSilences', () => {
  it('unions overlapping passes and drops junk', () => {
    const merged = mergeSilences(
      [
        { start: 1, end: 2 },
        { start: 5, end: 6 },
      ],
      [
        { start: 1.5, end: 3 },
        { start: 9, end: 8 },
        { start: Number.NaN, end: 1 },
      ],
    );
    expect(merged).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 6 },
    ]);
  });

  it('finds the nearest candidate', () => {
    expect(nearest([1, 4, 6], 5.2)).toBe(6);
    expect(nearest([], 5)).toBeUndefined();
    expect(candidatesNear([{ start: 10, end: 11 }], 'shared', 12, 2)).toEqual([10.5]);
    expect(candidatesNear([{ start: 10, end: 11 }], 'start', 20, 2)).toEqual([]);
  });
});

describe('snapPlan: Sequential', () => {
  const silences: Silence[] = [
    { start: 46.5, end: 47.1 },
    { start: 70, end: 71 },
  ];

  it('moves shared boundaries to pause midpoints and pins the ends', () => {
    const items = snapPlan(
      sequentialPlan(),
      { 'video1.mp4': silences },
      { 'video1.mp4': 100.2 },
      { window: 2 },
    );
    expect(items).toEqual([
      {
        id: 1,
        source: 'video1.mp4',
        plannedStart: 0,
        plannedEnd: 47.3,
        start: 0,
        end: 46.8,
        startSnapped: true,
        endSnapped: true,
      },
      {
        id: 2,
        source: 'video1.mp4',
        plannedStart: 47.3,
        plannedEnd: 100,
        start: 46.8,
        end: 100.2,
        startSnapped: true,
        endSnapped: true,
      },
    ]);
  });

  it('keeps the planned time when no pause is near', () => {
    const items = snapPlan(
      sequentialPlan(),
      { 'video1.mp4': [] },
      { 'video1.mp4': 100 },
      { window: 2 },
    );
    expect(items[0]).toMatchObject({ end: 47.3, endSnapped: false });
    expect(items[1]).toMatchObject({ start: 47.3, startSnapped: false });
  });

  it('pulls an end back to an earlier pause when snapping overshoots', () => {
    const plan = sequentialPlan([
      { id: 1, source: 'video1.mp4', start: 0, end: 59 },
      { id: 2, source: 'video1.mp4', start: 59, end: 100 },
    ]);
    const quiet = [
      { start: 57.5, end: 58 },
      { start: 60.2, end: 60.6 },
    ];
    const items = snapPlan(plan, { 'video1.mp4': quiet }, { 'video1.mp4': 100 }, { window: 2 });
    expect(items[0]?.end).toBeCloseTo(57.75);
    expect(items[1]?.start).toBeCloseTo(57.75);
  });

  it('fails naming the item when nothing fits', () => {
    const plan = sequentialPlan([
      { id: 1, source: 'video1.mp4', start: 0, end: 59.9 },
      { id: 2, source: 'video1.mp4', start: 59.9, end: 100 },
    ]);
    const quiet = [{ start: 60.5, end: 61.5 }];
    expect(() =>
      snapPlan(plan, { 'video1.mp4': quiet }, { 'video1.mp4': 100 }, { window: 2 }),
    ).toThrow(
      expect.objectContaining({
        code: 'E_SNAP_FAILED',
        issues: [expect.objectContaining({ itemId: 1 })],
      }),
    );
  });
});

describe('snapPlan: Clip', () => {
  it('starts before speech resumes and ends after it stops', () => {
    const quiet = [
      { start: 8.5, end: 9.5 },
      { start: 30.5, end: 31 },
    ];
    const items = snapPlan(
      clipPlan(),
      { 'stream.mp4': quiet },
      { 'stream.mp4': 600 },
      { window: 2 },
    );
    expect(items[0]).toMatchObject({ start: 9.4, end: 30.7, startSnapped: true, endSnapped: true });
    expect(items[1]).toMatchObject({ start: 40, end: 70, startSnapped: false, endSnapped: false });
  });

  it('shortens an over-long clip using an earlier pause', () => {
    const plan = clipPlan([
      { id: 1, source: 'stream.mp4', start: 10, end: 69.5, title: 'A B', accent: 'A' },
    ]);
    const quiet = [
      { start: 9, end: 9.2 },
      { start: 68.5, end: 69 },
      { start: 70.5, end: 71 },
    ];
    const items = snapPlan(plan, { 'stream.mp4': quiet }, { 'stream.mp4': 600 }, { window: 2 });
    expect(items[0]?.start).toBeCloseTo(9.1);
    expect(items[0]?.end).toBeCloseTo(68.7);
  });

  it('handles unknown durations and rejects clips snapped below 8 seconds', () => {
    const plan = clipPlan([
      { id: 1, source: 'stream.mp4', start: 10, end: 19, title: 'A B', accent: 'A' },
    ]);
    expect(snapPlan(plan, {}, {}, { window: 2 })[0]).toMatchObject({ start: 10, end: 19 });
    const quiet = [{ start: 17, end: 20 }];
    expect(() =>
      snapPlan(plan, { 'stream.mp4': quiet }, { 'stream.mp4': 600 }, { window: 2 }),
    ).toThrow(expect.objectContaining({ code: 'E_SNAP_FAILED' }));
  });
});
