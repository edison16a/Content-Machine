import { h } from '../lib/dom.js';
import { icon } from '../lib/icons.js';

/**
 * What the live index shows before any project exists. It keeps checking in
 * the background, so the calendar appears on its own once Claude makes the
 * first project.
 */
export function waitingState(): HTMLElement {
  return h(
    'div',
    { class: 'empty waiting' },
    icon('film', 'icon icon-xl'),
    h('h2', { text: 'No projects yet' }),
    h('p', {
      text: 'Ask Claude to make your first videos. Keep this page open: it fills in by itself.',
    }),
  );
}
