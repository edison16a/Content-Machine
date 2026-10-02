import type { DashboardData, DashboardItem } from '../shared/types.js';
import type { Store } from './state.js';

/** What every view gets: the embedded data, the store and a way to open the player. */
export interface Context {
  data: DashboardData;
  store: Store;
  now: () => Date;
  openItem: (item: DashboardItem, opener?: HTMLElement) => void;
  /** True while the player modal is open (hover previews stay quiet then). */
  playerOpen: () => boolean;
}
