import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

/** Top bar: the Content Machine mark and name, a theme toggle and GitHub. */
export function renderHeader(ctx: Context): { element: HTMLElement; update: () => void } {
  const { data, store } = ctx;
  const themeButton = h('button', {
    type: 'button',
    class: 'icon-button',
    on: { click: () => store.set({ theme: store.get().theme === 'dark' ? 'light' : 'dark' }) },
  });
  const element = h(
    'header',
    { class: 'topbar' },
    h(
      'div',
      { class: 'brand' },
      img(data.logos.brand, '', 'brand-logo'),
      h('h1', { text: 'Content Machine' }),
    ),
    h(
      'div',
      { class: 'actions' },
      themeButton,
      h(
        'a',
        { class: 'button', href: data.repoUrl, target: '_blank', rel: 'noopener' },
        icon('github'),
        h('span', { class: 'label', text: 'View on GitHub' }),
      ),
    ),
  );
  const update = (): void => {
    const dark = store.get().theme === 'dark';
    themeButton.replaceChildren(icon(dark ? 'sun' : 'moon'));
    themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeButton.title = dark ? 'Light mode' : 'Dark mode';
    document.documentElement.dataset.theme = store.get().theme;
  };
  update();
  return { element, update };
}
