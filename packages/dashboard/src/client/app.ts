import type { DashboardData } from '../shared/types.js';
import type { Context } from './context.js';
import { addDays, todayIn } from './lib/dates.js';
import { h } from './lib/dom.js';
import { stopPreview } from './lib/hover-preview.js';
import { chooseProject } from './lib/projects.js';
import { initialWeek } from './lib/selectors.js';
import { createStore, initialState, type State } from './state.js';
import { renderHeader } from './views/header.js';
import { renderNow } from './views/now.js';
import { renderOverview } from './views/overview.js';
import { createPlayer } from './views/player.js';
import { renderProjectPicker } from './views/project-picker.js';
import { renderTabs } from './views/tabs.js';
import { renderWeek } from './views/week.js';
import { renderWeekNav } from './views/weeknav.js';

/** How often the clock, countdowns and "post now" list are redrawn. */
const TICK_MS = 15_000;

export interface App {
  /** Swaps in fresh data from the live file without losing your place. */
  setProjects: (projects: DashboardData[]) => void;
}

const weekFor = (data: DashboardData, now: Date): string =>
  initialWeek(data.items, todayIn(data.timezone, now), data.weekStartsOn);

/** Builds the page once, then re-renders only the parts a state change touches. */
export function mountApp(
  root: HTMLElement,
  first: DashboardData,
  options: { live: boolean; projects: DashboardData[] },
): App {
  let projects = options.projects;
  const now = (): Date => new Date();
  const store = createStore(initialState(weekFor(first, now()), first.project));
  const ctx: Context = {
    data: first,
    live: options.live,
    store,
    now,
    openItem: (item, opener) => player.open(item, opener),
    playerOpen: () => player.isOpen(),
  };
  const player = createPlayer(ctx);
  const header = renderHeader(ctx);
  const tabs = renderTabs(ctx);
  const nav = renderWeekNav(ctx);
  const picker = renderProjectPicker(ctx, (name) => {
    const next = projects.find((project) => project.project === name);
    if (next !== undefined) store.set({ project: name, weekStart: weekFor(next, now()) });
  });
  const live = h('section', { class: 'now', 'aria-label': 'Right now' });
  const overview = h('section', { class: 'overview' });
  const week = h('main', { class: 'week', id: 'week' });
  root.replaceChildren(
    header.element,
    picker.element,
    live,
    overview,
    h('nav', { class: 'toolbar', 'aria-label': 'Calendar controls' }, tabs.element, nav.element),
    week,
    player.element,
  );

  /** Everything that depends on the data, redrawn together. */
  const renderData = (): void => {
    stopPreview();
    renderNow(ctx, live);
    renderOverview(ctx, overview);
    nav.update();
    renderWeek(ctx, week);
    player.refresh();
  };

  const render = (state: State, previous?: State): void => {
    if (previous === undefined || state.theme !== previous.theme) header.update();
    if (previous !== undefined && state.project !== previous.project) {
      player.close();
      ctx.data = chooseProject(projects, state.project) ?? ctx.data;
      picker.update(projects);
      renderData();
    } else if (previous === undefined || state.platform !== previous.platform) {
      tabs.update();
      renderData();
    } else if (state.weekStart !== previous.weekStart) {
      stopPreview();
      nav.update();
      renderWeek(ctx, week);
    }
    if (state.focusId !== null) {
      const card = week.querySelector<HTMLElement>(`.card[data-id="${state.focusId}"]`);
      card?.scrollIntoView({ block: 'nearest' });
      card?.focus();
      store.set({ focusId: null });
    }
  };
  store.subscribe(render);
  picker.update(projects);
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
      renderOverview(ctx, overview);
    }
  }, TICK_MS);

  document.addEventListener('keydown', (event) => {
    if (player.isOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('[role="tablist"]') !== null)
      return;
    if (event.target instanceof HTMLSelectElement) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      store.set({ weekStart: addDays(store.get().weekStart, event.key === 'ArrowLeft' ? -7 : 7) });
    }
  });

  return {
    setProjects(next) {
      projects = next;
      const chosen = chooseProject(projects, store.get().project);
      if (chosen === undefined) return;
      ctx.data = chosen;
      if (chosen.project !== store.get().project) store.set({ project: chosen.project });
      picker.update(projects);
      renderData();
    },
  };
}
