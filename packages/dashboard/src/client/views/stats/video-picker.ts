import type { Context } from '../../context.js';
import { h, img } from '../../lib/dom.js';
import { itemLabel } from '../../lib/format.js';
import { icon } from '../../lib/icons.js';
import { matchesQuery } from '../../lib/search.js';
import { byId } from '../../lib/selectors.js';

interface Choice {
  value: number | 'all';
  label: string;
  thumb: string | null;
}

let pickerCount = 0;

/**
 * A dropdown with search for narrowing the statistics to one video. It is a
 * button that opens a panel with a search box and a list: type to filter,
 * arrow keys to move, Enter to pick, Escape or a click outside to close.
 * `update` refreshes the list in place, so a background refresh never
 * closes it while you are typing.
 */
export function videoPicker(ctx: Context): { element: HTMLElement; update: () => void } {
  pickerCount += 1;
  const listId = `video-picker-${pickerCount}`;
  const label = h('span', { class: 'picker-label' });
  const button = h(
    'button',
    {
      type: 'button',
      class: 'picker-button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': 'Video',
    },
    label,
    icon('chevronDown', 'icon picker-chevron'),
  );
  const search = h('input', {
    type: 'text',
    class: 'picker-search',
    placeholder: 'Search videos',
    role: 'combobox',
    'aria-controls': listId,
    'aria-expanded': 'true',
    'aria-autocomplete': 'list',
    autocomplete: 'off',
  });
  const list = h('ul', { class: 'picker-list', role: 'listbox', id: listId });
  const none = h('p', { class: 'picker-empty', text: 'No videos match.', hidden: true });
  const panel = h(
    'div',
    { class: 'picker-panel', hidden: true },
    h('div', { class: 'picker-search-row' }, icon('search', 'icon picker-search-icon'), search),
    list,
    none,
  );
  const element = h('div', { class: 'picker' }, button, panel);
  let shown: Choice[] = [];
  let active = 0;

  const choices = (): Choice[] => [
    { value: 'all', label: 'All videos', thumb: null },
    ...byId(ctx.data.items).map((item) => ({
      value: item.id,
      label: `${itemLabel(item.id)} ${item.postTitle}`,
      thumb: item.thumb,
    })),
  ];

  const highlight = (index: number): void => {
    active = Math.max(0, Math.min(shown.length - 1, index));
    for (const [i, node] of [...list.children].entries()) {
      node.classList.toggle('is-active', i === active);
      if (i === active) {
        search.setAttribute('aria-activedescendant', node.id);
        node.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const renderList = (): void => {
    const current = ctx.store.get().statsItem;
    shown = choices().filter((choice) => matchesQuery(choice.label, search.value));
    list.replaceChildren(
      ...shown.map((choice, i) =>
        h(
          'li',
          {
            id: `${listId}-${i}`,
            role: 'option',
            class: 'picker-option',
            'aria-selected': String(choice.value === current),
            on: {
              pointerdown: (event) => event.preventDefault(),
              click: () => pick(choice),
              pointermove: () => highlight(i),
            },
          },
          choice.thumb === null
            ? h('span', { class: 'picker-thumb picker-all' }, icon('grid'))
            : img(choice.thumb, '', 'picker-thumb'),
          h('span', { class: 'picker-text', text: choice.label }),
          choice.value === current ? icon('check', 'icon picker-check') : null,
        ),
      ),
    );
    none.hidden = shown.length > 0;
    highlight(
      Math.max(
        0,
        shown.findIndex((choice) => choice.value === current),
      ),
    );
  };

  const outside = (event: PointerEvent): void => {
    if (event.target instanceof Node && !element.contains(event.target)) close(false);
  };
  const open = (): void => {
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    search.value = '';
    renderList();
    search.focus();
    document.addEventListener('pointerdown', outside);
  };
  const close = (refocus: boolean): void => {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    if (refocus) button.focus();
  };
  const pick = (choice: Choice): void => {
    close(true);
    ctx.store.set({ statsItem: choice.value });
  };

  button.addEventListener('click', () => (panel.hidden ? open() : close(true)));
  search.addEventListener('input', renderList);
  search.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => highlight(active + 1),
      ArrowUp: () => highlight(active - 1),
      Enter: () => {
        const choice = shown[active];
        if (choice !== undefined) pick(choice);
      },
      Escape: () => close(true),
      Tab: () => close(false),
    };
    const handler = keys[event.key];
    if (handler === undefined) return;
    if (event.key !== 'Tab') event.preventDefault();
    event.stopPropagation();
    handler();
  });

  const update = (): void => {
    const current = ctx.store.get().statsItem;
    label.textContent = choices().find((choice) => choice.value === current)?.label ?? 'All videos';
    if (!panel.hidden) renderList();
  };
  update();
  return { element, update };
}
