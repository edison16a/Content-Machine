import { DATA_ELEMENT_ID, type DashboardData } from '../shared/types.js';
import type { Context } from './context.js';
import { addDays, todayIn } from './lib/dates.js';
import { h } from './lib/dom.js';
import { stopPreview } from './lib/hover-preview.js';
import { initialWeek } from './lib/selectors.js';
import { createStore, initialState, type State } from './state.js';
import { renderHeader } from './views/header.js';
import { renderOverview } from './views/overview.js';
import { createPlayer } from './views/player.js';
import { renderTabs } from './views/tabs.js';
import { renderWeek } from './views/week.js';
import { renderWeekNav } from './views/weeknav.js';

function readData(): DashboardData {
  const node = document.getElementById(DATA_ELEMENT_ID);
  return JSON.parse(node?.textContent ?? '{}') as DashboardData;
}

/** Builds the page once, then re-renders only the parts a state change touches. */
function boot(): void {
  const data = readData();
  const now = (): Date => new Date();
  const store = createStore(
    initialState(initialWeek(data.items, todayIn(data.timezone, now()), data.weekStartsOn)),
  );
  const ctx: Context = {
    data,
    store,
    now,
    openItem: (item, opener) => player.open(item, opener),
    playerOpen: () => player.isOpen(),
  };
  const player = createPlayer(ctx);
  const header = renderHeader(ctx);
  const tabs = renderTabs(ctx);
  const nav = renderWeekNav(ctx);
  const overview = h('section', { class: 'overview' });
  const week = h('main', { class: 'week', id: 'week' });
  const app = document.getElementById('app') ?? document.body;
  app.replaceChildren(
    header.element,
    overview,
    h('nav', { class: 'toolbar', 'aria-label': 'Calendar controls' }, tabs.element, nav.element),
    week,
    player.element,
  );

  const render = (state: State, previous?: State): void => {
    if (previous === undefined || state.theme !== previous.theme) header.update();
    if (previous === undefined || state.platform !== previous.platform) {
      tabs.update();
      renderOverview(ctx, overview);
      player.refresh();
    }
    if (
      previous === undefined ||
      state.platform !== previous.platform ||
      state.weekStart !== previous.weekStart
    ) {
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
  render(store.get());

  document.addEventListener('keydown', (event) => {
    if (player.isOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof HTMLElement && event.target.closest('[role="tablist"]') !== null)
      return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      store.set({ weekStart: addDays(store.get().weekStart, event.key === 'ArrowLeft' ? -7 : 7) });
    }
  });
  document.documentElement.classList.add('is-ready');
}

boot();
