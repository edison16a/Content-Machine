import { DASHBOARD_PLATFORMS, type DashboardPlatform } from '../shared/types.js';
import { loadChoice, save } from './lib/storage.js';

export type Theme = 'light' | 'dark';

export interface State {
  platform: DashboardPlatform;
  /** First day of the visible week, "YYYY-MM-DD". */
  weekStart: string;
  theme: Theme;
  /** Item whose card should take focus after the next render. */
  focusId: number | null;
}

type Listener = (state: State, previous: State) => void;

export interface Store {
  get(): State;
  set(patch: Partial<State>): void;
  subscribe(listener: Listener): void;
}

/** Restores remembered preferences. Dark mode is the default. */
export function initialState(weekStart: string): State {
  return {
    platform: loadChoice<DashboardPlatform>('platform', DASHBOARD_PLATFORMS, 'tiktok'),
    weekStart,
    theme: loadChoice<Theme>('theme', ['light', 'dark'], 'dark'),
    focusId: null,
  };
}

/** A tiny observable store. Remembers the tab and the theme. */
export function createStore(initial: State): Store {
  let state = initial;
  const listeners: Listener[] = [];
  return {
    get: () => state,
    set(patch) {
      const previous = state;
      state = { ...state, ...patch };
      if (patch.platform !== undefined) save('platform', state.platform);
      if (patch.theme !== undefined) save('theme', state.theme);
      for (const listener of listeners) listener(state, previous);
    },
    subscribe(listener) {
      listeners.push(listener);
    },
  };
}
