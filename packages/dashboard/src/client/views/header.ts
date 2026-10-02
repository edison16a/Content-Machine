import type { Context } from '../context.js';
import { h, img } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

/** Top bar: brand, project and channel on the left; theme and GitHub on the right. */
export function renderHeader(ctx: Context): { element: HTMLElement; update: () => void } {
  const { data, store } = ctx;
  const themeButton = h('button', {
    type: 'button',
    class: 'icon-button',
    on: { click: () => store.set({ theme: store.get().theme === 'dark' ? 'light' : 'dark' }) },
  });
  const channel =
    data.channel === ''
      ? null
      : h(
          'span',
          { class: 'channel' },
          data.logos.source === null ? null : img(data.logos.source, '', 'channel-logo'),
          data.channel,
        );
  const element = h(
    'header',
    { class: 'topbar' },
    h(
      'div',
      { class: 'brand' },
      img(data.logos.brand, 'Content Machine', 'brand-logo'),
      h(
        'div',
        { class: 'brand-text' },
        h('span', { class: 'eyebrow', text: 'Content Machine' }),
        h('h1', { text: data.project }),
      ),
      channel,
    ),
    h(
      'div',
      { class: 'actions' },
      themeButton,
      h(
        'a',
        { class: 'button button-outline', href: data.repoUrl, target: '_blank', rel: 'noopener' },
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
