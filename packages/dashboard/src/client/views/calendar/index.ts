import type { Context } from '../../context.js';
import { todayIn } from '../../lib/dates.js';
import { replace } from '../../lib/dom.js';
import { dayView } from './day.js';
import { emptyState } from './empty.js';
import { monthView } from './month.js';
import { weekView } from './week.js';

/** Class names per view. The week keeps "week" so its grid styles apply. */
const CONTAINER = { day: 'calendar day-view', week: 'calendar week', month: 'calendar month' };

/** Draws the calendar in the chosen view: one day, one week or one month. */
export function renderCalendar(ctx: Context, container: HTMLElement): void {
  const { calendar } = ctx.store.get();
  container.className = CONTAINER[calendar];
  if (ctx.data.items.length === 0) {
    replace(container, emptyState(ctx.data.project));
    return;
  }
  const today = todayIn(ctx.data.timezone, ctx.now());
  const views = { day: dayView, week: weekView, month: monthView };
  replace(container, ...views[calendar](ctx, today));
}
