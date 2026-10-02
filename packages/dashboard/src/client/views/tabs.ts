import { PLATFORM_NAMES } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { VIEWS, type View } from '../state.js';

/** The tab's mark: the official logo for a platform, a grid for All. */
function tabMark(ctx: Context, view: View): HTMLElement | null {
  if (view === 'all') return icon('grid', 'icon tab-icon');
  const logo = ctx.data.logos.platforms[view];
  return logo === null ? null : img(logo, '', 'tab-logo');
}

/**
 * All, then one tab per platform with its official logo. The accent
 * underline slides to the active tab; everything below follows it.
 */
export function renderTabs(ctx: Context): { element: HTMLElement; update: () => void } {
  const { store } = ctx;
  const underline = h('span', { class: 'tab-underline', 'aria-hidden': 'true' });
  const tabs = new Map<View, HTMLButtonElement>();
  const list = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Platform' });
  for (const view of VIEWS) {
    const tab = h(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'tab',
        'data-platform': view,
        on: { click: () => store.set({ platform: view }) },
      },
      tabMark(ctx, view),
      h('span', { text: view === 'all' ? 'All' : PLATFORM_NAMES[view] }),
    );
    tabs.set(view, tab);
    list.append(tab);
  }
  list.append(underline);
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.stopPropagation();
    const index = VIEWS.indexOf(store.get().platform);
    const step = event.key === 'ArrowRight' ? 1 : VIEWS.length - 1;
    const next = VIEWS[(index + step) % VIEWS.length] ?? 'all';
    store.set({ platform: next });
    tabs.get(next)?.focus();
  });
  const place = (): void => {
    const active = tabs.get(store.get().platform);
    if (active === undefined) return;
    underline.style.width = `${active.offsetWidth}px`;
    underline.style.transform = `translateX(${active.offsetLeft}px)`;
  };
  const update = (): void => {
    const current = store.get().platform;
    for (const [view, tab] of tabs) {
      const selected = view === current;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-active', selected);
    }
    place();
  };
  new ResizeObserver(place).observe(list);
  return { element: list, update };
}
