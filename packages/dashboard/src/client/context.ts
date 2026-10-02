import type { DashboardData, DashboardItem } from '../shared/types.js';
import type { Store } from './state.js';

/** What every view gets: the project on screen, the store and a way to open the player. */
export interface Context {
  /**
   * The project on screen. The live index swaps this when new data arrives
   * or you pick another project, so views read it at render time and never
   * keep their own copy.
   */
  data: DashboardData;
  /** True on the root index.html, which updates itself. */
  live: boolean;
  store: Store;
  now: () => Date;
  openItem: (item: DashboardItem, opener?: HTMLElement) => void;
  /** True while the player modal is open (hover previews stay quiet then). */
  playerOpen: () => boolean;
}
