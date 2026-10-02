import { h, img } from '../../lib/dom.js';
import { icon, type IconName } from '../../lib/icons.js';
import { matchesQuery } from '../../lib/search.js';

export interface DropdownOption {
  value: string;
  label: string;
  /** A quieter second line, like the project or the number of videos. */
  detail?: string;
  /** A poster to show beside the label; `mark` is used when there is none. */
  thumb?: string;
  mark?: IconName;
}

export interface DropdownSpec {
  /** Read by screen readers as the control's name. */
  name: string;
  /** Adds a search box above the list. */
  searchable: boolean;
  options: () => DropdownOption[];
  selected: () => string;
  onPick: (value: string) => void;
}

let dropdownCount = 0;

function optionMark(option: DropdownOption): HTMLElement {
  if (option.thumb !== undefined) return img(option.thumb, '', 'picker-thumb');
  return h('span', { class: 'picker-thumb picker-all' }, icon(option.mark ?? 'grid'));
}

/**
 * A custom styled dropdown: a button that opens a panel with an optional
 * search box and a list. Type to filter, arrow keys to move, Enter to pick,
 * Escape or a click outside to close. `update` refreshes it in place, so a
 * background refresh never closes it while someone is using it.
 */
export function dropdown(spec: DropdownSpec): { element: HTMLElement; update: () => void } {
  dropdownCount += 1;
  const listId = `dropdown-${dropdownCount}`;
  const label = h('span', { class: 'picker-label' });
  const button = h(
    'button',
    {
      type: 'button',
      class: 'picker-button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-label': spec.name,
    },
    label,
    icon('chevronDown', 'icon picker-chevron'),
  );
  const search = h('input', {
    type: 'text',
    class: 'picker-search',
    placeholder: 'Search',
    role: 'combobox',
    'aria-controls': listId,
    'aria-expanded': 'true',
    'aria-autocomplete': 'list',
    autocomplete: 'off',
  });
  // Without a search box the list itself takes focus and the keys.
  const list = h('ul', {
    class: 'picker-list',
    role: 'listbox',
    id: listId,
    tabindex: spec.searchable ? -1 : 0,
    'aria-label': spec.name,
  });
  const none = h('p', { class: 'picker-empty', text: 'Nothing matches.', hidden: true });
  const panel = h(
    'div',
    { class: 'picker-panel', hidden: true },
    spec.searchable
      ? h('div', { class: 'picker-search-row' }, icon('search', 'icon picker-search-icon'), search)
      : null,
    list,
    none,
  );
  const element = h('div', { class: 'picker' }, button, panel);
  const keyTarget: HTMLElement = spec.searchable ? search : list;
  let shown: DropdownOption[] = [];
  let active = 0;

  const highlight = (index: number): void => {
    active = Math.max(0, Math.min(shown.length - 1, index));
    for (const [i, node] of [...list.children].entries()) {
      node.classList.toggle('is-active', i === active);
      if (i === active) {
        keyTarget.setAttribute('aria-activedescendant', node.id);
        node.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const renderList = (): void => {
    const current = spec.selected();
    shown = spec
      .options()
      .filter((option) =>
        matchesQuery(`${option.label} ${option.detail ?? ''}`, spec.searchable ? search.value : ''),
      );
    list.replaceChildren(
      ...shown.map((option, i) =>
        h(
          'li',
          {
            id: `${listId}-${i}`,
            role: 'option',
            class: 'picker-option',
            'aria-selected': String(option.value === current),
            on: {
              pointerdown: (event) => event.preventDefault(),
              click: () => pick(option),
              pointermove: () => highlight(i),
            },
          },
          optionMark(option),
          h(
            'span',
            { class: 'picker-text' },
            h('span', { class: 'picker-option-label', text: option.label }),
            option.detail === undefined
              ? null
              : h('span', { class: 'picker-detail', text: option.detail }),
          ),
          option.value === current ? icon('check', 'icon picker-check') : null,
        ),
      ),
    );
    none.hidden = shown.length > 0;
    highlight(
      Math.max(
        0,
        shown.findIndex((option) => option.value === current),
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
    keyTarget.focus();
    document.addEventListener('pointerdown', outside);
  };
  const close = (refocus: boolean): void => {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    if (refocus) button.focus();
  };
  const pick = (option: DropdownOption): void => {
    close(true);
    spec.onPick(option.value);
  };

  button.addEventListener('click', () => (panel.hidden ? open() : close(true)));
  search.addEventListener('input', renderList);
  keyTarget.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => highlight(active + 1),
      ArrowUp: () => highlight(active - 1),
      Enter: () => {
        const option = shown[active];
        if (option !== undefined) pick(option);
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
    const current = spec.selected();
    const options = spec.options();
    label.textContent =
      options.find((option) => option.value === current)?.label ?? options[0]?.label ?? '';
    if (!panel.hidden) renderList();
  };
  update();
  return { element, update };
}
