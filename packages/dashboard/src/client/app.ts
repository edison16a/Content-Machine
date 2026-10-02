import type { DashboardData } from '../shared/types.js';
import type { Context } from './context.js';
import { shiftAnchor } from './lib/calendar.js';
import { todayIn } from './lib/dates.js';
import { h } from './lib/dom.js';
import { stopPreview } from './lib/hover-preview.js';
import { dataFor } from './lib/projects.js';
import { initialAnchor } from './lib/selectors.js';
import { createStore, initialState, type State, type Store } from './state.js';
import { renderCalendar } from './views/calendar/index.js';
import { renderCalendarNav } from './views/calendar/nav.js';
import { renderHeader } from './views/header.js';
import { renderNow } from './views/now.js';
import { renderOverview } from './views/overview.js';
import { createPlayer } from './views/player.js';
import { createAdminPanel } from './views/settings/admin.js';
import { renderSettings } from './views/settings/settings.js';
import { renderStatsSection } from './views/stats/section.js';
import { renderTabs } from './views/tabs.js';

/** How often the clock and the "post now" list are redrawn. */
const TICK_MS = 15_000;
/** How often the statistics reread their numbers on their own. */
const STATS_MS = 60_000;

export interface App {
  /** Swaps in fresh data from the live file without losing your place. */
  setProjects: (projects: DashboardData[]) => void;
}

export interface MountOptions {
  live: boolean;
  projects: DashboardData[];
  /** A project name, or ALL_PROJECTS for every project on one calendar. */
  selection: string;
  refresh: () => Promise<void>;
}

const anchorFor = (data: DashboardData, now: Date): string =>
  initialAnchor(data.items, todayIn(data.timezone, now), data.weekStartsOn);

/** Left and right arrows page through the calendar, unless a control wants the keys. */
function bindWeekKeys(store: Store, playerOpen: () => boolean): void {
  document.addEventListener('keydown', (event) => {
    if (playerOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (
      target !== null &&
      target.closest('[role="tablist"], select, input, .chart-frame, .picker') !== null
    )
      return;
    event.preventDefault();
    const { calendar, anchor } = store.get();
    store.set({ anchor: shiftAnchor(calendar, anchor, event.key === 'ArrowLeft' ? -1 : 1) });
  });
}

/** Builds the page once, then re-renders only the parts a state change touches. */
export function mountApp(root: HTMLElement, options: MountOptions): App {
  let projects = options.projects;
  const first = dataFor(projects, options.selection);
  const now = (): Date => new Date();
  const store = createStore(initialState(anchorFor(first, now()), options.selection));
  const ctx: Context = {
    data: first,
    live: options.live,
    refresh: options.refresh,
    store,
    now,
    openItem: (item, opener) => player.open(item, opener),
    playerOpen: () => player.isOpen(),
  };
  const player = createPlayer(ctx);
  const tabs = renderTabs(ctx);
  const nav = renderCalendarNav(ctx);
  const stats = renderStatsSection(ctx);
  const admin = createAdminPanel(ctx, () => stats.update());
  const settings = renderSettings(ctx, () => projects, {
    // Picking a project also jumps the calendar to where its videos are.
    pickProject: (selection) =>
      store.set({ project: selection, anchor: anchorFor(dataFor(projects, selection), now()) }),
    openAdmin: admin.open,
  });
  const header = renderHeader(ctx, settings.element);
  const live = h('section', { class: 'now', 'aria-label': 'Right now' });
  const overview = h('section', { class: 'overview' });
  const week = h('main', { class: 'week', id: 'week' });
  root.replaceChildren(
    header.element,
    live,
    overview,
    h('nav', { class: 'toolbar', 'aria-label': 'Calendar controls' }, tabs.element, nav.element),
    week,
    stats.element,
    player.element,
    admin.element,
  );

  /** Everything that depends on the data or the tab, redrawn together. */
  const renderData = (): void => {
    stopPreview();
    // The counts panel describes one platform, so the All tab leaves it out.
    const all = store.get().platform === 'all';
    overview.hidden = all;
    renderNow(ctx, live);
    if (!all) renderOverview(ctx, overview);
    nav.update();
    renderCalendar(ctx, week);
    stats.update();
    player.refresh();
  };

  const render = (state: State, previous?: State): void => {
    if (previous === undefined || state.theme !== previous.theme) header.update();
    if (previous !== undefined && state.project !== previous.project) {
      player.close();
      ctx.data = dataFor(projects, state.project);
      settings.update();
      renderData();
    } else if (previous === undefined || state.platform !== previous.platform) {
      tabs.update();
      renderData();
      // Switching tabs is a natural moment to check for new numbers.
      if (previous !== undefined) void ctx.refresh().then(stats.update);
    } else if (state.anchor !== previous.anchor || state.calendar !== previous.calendar) {
      stopPreview();
      nav.update();
      renderCalendar(ctx, week);
    } else if (state.metrics !== previous.metrics || state.statsItem !== previous.statsItem) {
      stats.update();
    }
    if (state.focusKey !== null) {
      const card = week.querySelector<HTMLElement>(
        `.card[data-key="${CSS.escape(state.focusKey)}"]`,
      );
      card?.scrollIntoView({ block: 'nearest' });
      card?.focus();
      store.set({ focusKey: null });
    }
  };
  store.subscribe(render);
  render(store.get());

  // Keep the clock honest. When the date rolls over, "Today" moves too.
  let today = todayIn(ctx.data.timezone, now());
  window.setInterval(() => {
    const current = todayIn(ctx.data.timezone, now());
    if (current !== today) {
      today = current;
      renderData();
    } else {
      renderNow(ctx, live);
      if (store.get().platform !== 'all') renderOverview(ctx, overview);
    }
  }, TICK_MS);
  window.setInterval(() => void ctx.refresh().then(stats.update), STATS_MS);
  bindWeekKeys(store, () => player.isOpen());

  return {
    setProjects(next) {
      projects = next;
      ctx.data = dataFor(projects, store.get().project);
      settings.update();
      renderData();
    },
  };
}
