import {
  DASHBOARD_PLATFORMS,
  STAT_METRICS,
  type DashboardPlatform,
  type StatMetric,
} from '../shared/types.js';
import { CALENDAR_VIEWS, type CalendarView } from './lib/calendar.js';
import { load, loadChoice, save } from './lib/storage.js';

export type Theme = 'light' | 'dark';

/** A tab: one platform, or all of them together. */
export type View = 'all' | DashboardPlatform;
export const VIEWS: readonly View[] = ['all', ...DASHBOARD_PLATFORMS];

export interface State {
  /**
   * Which project is on screen: a project's name, or ALL_PROJECTS for every
   * project on one calendar (the default). Chosen in Settings.
   */
  project: string;
  platform: View;
  /** Day, week or month. Week by default; the choice is remembered. */
  calendar: CalendarView;
  /**
   * A date inside the visible period, "YYYY-MM-DD". Each view works out its
   * own range from it, so switching views keeps you around the same days.
   */
  anchor: string;
  theme: Theme;
  /** Key of the item whose card should take focus after the next render. */
  focusKey: string | null;
  /** Which graphs the statistics section shows. */
  metrics: StatMetric[];
  /** Statistics for one video (its key), or "all" for every video. */
  statsItem: string;
}

type Listener = (state: State, previous: State) => void;

export interface Store {
  get(): State;
  set(patch: Partial<State>): void;
  subscribe(listener: Listener): void;
}

/**
 * The platform whose times, captions and statuses a per-platform view
 * shows. The All tab has none of its own, so it falls back to TikTok, the
 * first platform, wherever a single one is needed (the player's caption).
 */
export function focusPlatform(view: View): DashboardPlatform {
  return view === 'all' ? 'tiktok' : view;
}

/** Remembered graph choices, ignoring anything that is not a metric. */
function loadMetrics(): StatMetric[] {
  const saved = (load('metrics') ?? '').split(',');
  const chosen = STAT_METRICS.filter((metric) => saved.includes(metric));
  return load('metrics') === null ? [...STAT_METRICS] : chosen;
}

/** Restores remembered preferences. Dark mode is the default. */
export function initialState(anchor: string, project: string): State {
  return {
    project,
    platform: loadChoice<View>('platform', VIEWS, 'tiktok'),
    calendar: loadChoice<CalendarView>('calendar', CALENDAR_VIEWS, 'week'),
    anchor,
    theme: loadChoice<Theme>('theme', ['light', 'dark'], 'dark'),
    focusKey: null,
    metrics: loadMetrics(),
    statsItem: 'all',
  };
}

/** A tiny observable store. Remembers the tab, the calendar view, the theme and the graphs. */
export function createStore(initial: State, options: { rememberProject: boolean }): Store {
  let state = initial;
  const listeners: Listener[] = [];
  return {
    get: () => state,
    set(patch) {
      const previous = state;
      state = { ...state, ...patch };
      if (patch.platform !== undefined) save('platform', state.platform);
      if (patch.theme !== undefined) save('theme', state.theme);
      if (patch.calendar !== undefined) save('calendar', state.calendar);
      if (patch.project !== undefined && options.rememberProject)
        save('selected-project', state.project);
      if (patch.metrics !== undefined) save('metrics', state.metrics.join(','));
      for (const listener of listeners) listener(state, previous);
    },
    subscribe(listener) {
      listeners.push(listener);
    },
  };
}
