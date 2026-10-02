import { describe, expect, it } from 'vitest';
import type { DashboardItem } from '../src/shared/types.js';
import { periodTitle, shiftAnchor } from '../src/client/lib/calendar.js';
import { addMonths, monthTitle, monthWeeks, startOfMonth } from '../src/client/lib/dates.js';
import { matchesQuery } from '../src/client/lib/search.js';
import { initialAnchor } from '../src/client/lib/selectors.js';

describe('month math', () => {
  it('adds months and clamps to the last day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-15', -1)).toBe('2026-09-15');
    expect(addMonths('2026-12-02', 1)).toBe('2027-01-02');
    expect(startOfMonth('2026-10-17')).toBe('2026-10-01');
    expect(monthTitle('2026-10-17')).toBe('October 2026');
  });

  it('covers a month with whole weeks', () => {
    const weeks = monthWeeks('2026-10-17', 'monday');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]?.[0]).toBe('2026-09-28');
    expect(weeks.at(-1)?.at(-1)).toBe('2026-11-01');
    expect(monthWeeks('2026-02-10', 'sunday')[0]?.[0]).toBe('2026-02-01');
  });
});

describe('calendar periods', () => {
  it('steps by a day, a week or a month', () => {
    expect(shiftAnchor('day', '2026-10-02', 1)).toBe('2026-10-03');
    expect(shiftAnchor('week', '2026-10-02', -1)).toBe('2026-09-25');
    expect(shiftAnchor('month', '2026-10-31', 1)).toBe('2026-11-30');
  });

  it('titles each view', () => {
    expect(periodTitle('day', '2026-10-02', 'monday')).toBe('Friday, October 2, 2026');
    expect(periodTitle('week', '2026-10-02', 'monday')).toBe('Sep 28 to Oct 4, 2026');
    expect(periodTitle('month', '2026-10-02', 'monday')).toBe('October 2026');
  });

  it('opens on today when this week has videos, else on the next busy week', () => {
    const item = (date: string): DashboardItem => ({ date }) as DashboardItem;
    expect(initialAnchor([item('2026-10-01')], '2026-10-02', 'monday')).toBe('2026-10-02');
    expect(initialAnchor([item('2026-10-20')], '2026-10-02', 'monday')).toBe('2026-10-19');
  });
});

describe('matchesQuery', () => {
  const title = '#003 How We Built A Tiny House';
  it('needs every word, in any order, ignoring case and accents', () => {
    expect(matchesQuery(title, 'tiny HOUSE')).toBe(true);
    expect(matchesQuery(title, 'house tiny')).toBe(true);
    expect(matchesQuery(title, 'tiny boat')).toBe(false);
    expect(matchesQuery('Crème Brûlée', 'creme')).toBe(true);
    expect(matchesQuery(title, '')).toBe(true);
  });

  it('finds a video by its number', () => {
    expect(matchesQuery(title, '#3')).toBe(true);
    expect(matchesQuery(title, '003')).toBe(true);
  });
});
