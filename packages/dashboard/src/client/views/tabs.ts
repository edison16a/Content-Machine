import { DASHBOARD_PLATFORMS, PLATFORM_NAMES, type DashboardPlatform } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';

/**
 * Platform tabs with their official logos. The accent underline slides to the
 * active tab; everything else on the page follows the selected platform.
 */
export function renderTabs(ctx: Context): { element: HTMLElement; update: () => void } {
  const { data, store } = ctx;
  const underline = h('span', { class: 'tab-underline', 'aria-hidden': 'true' });
  const tabs = new Map<DashboardPlatform, HTMLButtonElement>();
  const list = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Platform' });
  for (const platform of DASHBOARD_PLATFORMS) {
    const logo = data.logos.platforms[platform];
    const tab = h(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'tab',
        'data-platform': platform,
        on: { click: () => store.set({ platform }) },
      },
      logo === null ? null : img(logo, '', 'tab-logo'),
      h('span', { text: PLATFORM_NAMES[platform] }),
    );
    tabs.set(platform, tab);
    list.append(tab);
  }
  list.append(underline);
  list.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.stopPropagation();
    const index = DASHBOARD_PLATFORMS.indexOf(store.get().platform);
    const next =
      DASHBOARD_PLATFORMS[(index + (event.key === 'ArrowRight' ? 1 : 2)) % 3] ?? 'tiktok';
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
    for (const [platform, tab] of tabs) {
      const selected = platform === current;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-active', selected);
    }
    place();
  };
  new ResizeObserver(place).observe(list);
  return { element: list, update };
}
