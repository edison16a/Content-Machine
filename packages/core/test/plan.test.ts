import { describe, expect, it } from 'vitest';
import {
  assertNoLockedChanges,
  assertValidPlan,
  findAccentRange,
  findLockedChanges,
  planKeyFor,
  resolveItemText,
  validatePlan,
  type ErrorCode,
  type Plan,
} from '@content-machine/core';
import { clipPlan, sequentialPlan } from './fixtures.js';

const durations = { 'video1.mp4': 100, 'stream.mp4': 600 };

function codes(plan: Plan, d: Record<string, number> = durations): ErrorCode[] {
  return validatePlan(plan, d).errors.map((issue) => issue.code);
}

describe('findAccentRange', () => {
  it('matches words ignoring case and punctuation', () => {
    expect(findAccentRange('How We Built It In 30 Days!', '30 days')).toEqual([5, 7]);
    expect(findAccentRange('Hello, World', 'hello')).toEqual([0, 1]);
    expect(findAccentRange('Hello World', 'Worl')).toBeUndefined();
    expect(findAccentRange('Hello World', '!!')).toBeUndefined();
  });
});

describe('validatePlan: Sequential', () => {
  it('accepts a contiguous plan', () => {
    expect(validatePlan(sequentialPlan(), durations)).toEqual({ errors: [], warnings: [] });
  });

  it('finds gaps, overlaps, a late first start and an early end', () => {
    const plan = sequentialPlan([
      { id: 1, source: 'video1.mp4', start: 1, end: 30 },
      { id: 2, source: 'video1.mp4', start: 31, end: 60 },
      { id: 3, source: 'video1.mp4', start: 59, end: 90 },
    ]);
    const report = validatePlan(plan, durations);
    expect(report.errors.map((i) => [i.code, i.itemId])).toEqual([
      ['E_PLAN_GAP', 1],
      ['E_PLAN_GAP', 2],
      ['E_PLAN_OVERLAP', 3],
      ['E_PLAN_GAP', 3],
    ]);
  });

  it('enforces the 59.98s ceiling, 8s floor and warns under 20s', () => {
    const plan = sequentialPlan([
      { id: 1, source: 'video1.mp4', start: 0, end: 60 },
      { id: 2, source: 'video1.mp4', start: 60, end: 65 },
      { id: 3, source: 'video1.mp4', start: 65, end: 80 },
      { id: 4, source: 'video1.mp4', start: 80, end: 100 },
    ]);
    const report = validatePlan(plan, durations);
    expect(report.errors.map((i) => i.itemId)).toEqual([1, 2]);
    expect(report.warnings.map((i) => i.itemId)).toEqual([3]);
  });

  it('requires title and accent on the source, not the items', () => {
    const plan = sequentialPlan();
    plan.sources[0] = { file: 'video1.mp4', channel: 'C', platform: 'youtube' };
    plan.items[0] = { ...plan.items[0]!, title: 'Nope' };
    expect(codes(plan)).toEqual(['E_PLAN_INVALID', 'E_PLAN_INVALID']);
  });

  it('checks the accent appears in the title', () => {
    const plan = sequentialPlan();
    plan.sources[0] = { ...plan.sources[0]!, accent: 'Forty Days' };
    expect(validatePlan(plan, durations).errors[0]?.message).toMatch(/not a run of words/);
  });
});

describe('validatePlan: shared rules', () => {
  it('requires unique ascending ids', () => {
    const plan = sequentialPlan([
      { id: 2, source: 'video1.mp4', start: 0, end: 50 },
      { id: 1, source: 'video1.mp4', start: 50, end: 100 },
    ]);
    expect(codes(plan)).toEqual(['E_PLAN_INVALID']);
    const dup = sequentialPlan([
      { id: 1, source: 'video1.mp4', start: 0, end: 50 },
      { id: 1, source: 'video1.mp4', start: 50, end: 100 },
    ]);
    expect(validatePlan(dup, durations).errors[0]?.message).toMatch(/used twice/);
  });

  it('requires known sources inside the source folder', () => {
    const plan = sequentialPlan();
    expect(codes(plan, {})).toContain('E_FILE_NOT_FOUND');
    plan.sources.push({ ...plan.sources[0]! });
    expect(validatePlan(plan, durations).errors[0]?.message).toMatch(/listed twice/);
    plan.items[0] = { ...plan.items[0]!, source: 'other.mp4' };
    expect(codes(plan)).toContain('E_PLAN_INVALID');
  });

  it('rejects inverted ranges and ends past the source', () => {
    const plan = clipPlan([
      { id: 1, source: 'stream.mp4', start: 30, end: 20, title: 'A B', accent: 'A' },
      { id: 2, source: 'stream.mp4', start: 590, end: 610, title: 'A B', accent: 'B' },
    ]);
    expect(codes(plan)).toEqual(['E_PLAN_DURATION', 'E_PLAN_DURATION']);
  });
});

describe('validatePlan: Clip', () => {
  it('accepts valid clips', () => {
    expect(codes(clipPlan())).toEqual([]);
  });

  it('requires each clip to carry its own text and not overlap', () => {
    const plan = clipPlan([
      { id: 1, source: 'stream.mp4', start: 10, end: 30, title: 'He Missed', accent: 'Missed' },
      { id: 2, source: 'stream.mp4', start: 20, end: 40 },
      { id: 3, source: 'stream.mp4', start: 100, end: 120, title: 'He Won', accent: 'Lost' },
    ]);
    expect(codes(plan)).toEqual(['E_PLAN_INVALID', 'E_PLAN_INVALID', 'E_PLAN_OVERLAP']);
  });
});

describe('assertValidPlan', () => {
  it('throws with the shared code and all issues', () => {
    const plan = sequentialPlan([{ id: 1, source: 'video1.mp4', start: 0, end: 40 }]);
    expect(() => assertValidPlan(plan, durations)).toThrow(expect.objectContaining({ code: 'E_PLAN_GAP' }));
    const mixed = sequentialPlan([{ id: 1, source: 'video1.mp4', start: 5, end: 70 }]);
    expect(() => assertValidPlan(mixed, durations)).toThrow(expect.objectContaining({ code: 'E_PLAN_INVALID' }));
  });

  it('returns warnings when valid', () => {
    expect(assertValidPlan(sequentialPlan(), durations).warnings).toEqual([]);
  });
});

describe('resolveItemText and locks', () => {
  it('takes Sequential text from the source and Clip text from the item', () => {
    const seq = sequentialPlan();
    expect(resolveItemText(seq, seq.items[1]!)?.title).toBe('How We Built A Tiny House In 30 Days');
    const clip = clipPlan();
    expect(resolveItemText(clip, clip.items[0]!)).toMatchObject({ accent: 'One Inch', platform: 'twitch' });
    expect(resolveItemText(clip, { ...clip.items[0]!, source: 'missing.mp4' })).toBeUndefined();
    expect(resolveItemText(clip, { id: 9, source: 'stream.mp4', start: 0, end: 9 })).toBeUndefined();
  });

  it('refuses edits to rendered items unless forced', () => {
    const plan = sequentialPlan();
    const locked = plan.items.map((item) => ({ id: item.id, planKey: planKeyFor(plan, item) }));
    expect(findLockedChanges(plan, locked)).toEqual([]);
    const edited = sequentialPlan([
      { id: 1, source: 'video1.mp4', start: 0, end: 40 },
      { id: 3, source: 'video1.mp4', start: 40, end: 100 },
    ]);
    expect(findLockedChanges(edited, locked).map((i) => i.itemId)).toEqual([1, 2]);
    expect(() => assertNoLockedChanges(edited, locked, false)).toThrow(/2 rendered item/);
    expect(() => assertNoLockedChanges(edited, locked, true)).not.toThrow();
  });
});
