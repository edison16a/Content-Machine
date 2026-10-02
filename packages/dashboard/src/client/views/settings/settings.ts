import type { DashboardData } from '../../../shared/types.js';
import type { Context } from '../../context.js';
import { h } from '../../lib/dom.js';
import { icon } from '../../lib/icons.js';
import { dropdown } from '../common/dropdown.js';
import { projectOptions } from './project-options.js';

/** Three clicks on the gear within this long open the admin panel. */
const SECRET_CLICKS = 3;
const SECRET_WINDOW_MS = 1200;

export interface Settings {
  element: HTMLElement;
  update: () => void;
}

/**
 * The gear in the header and its panel. The panel picks which project the
 * dashboard shows (all of them by default). Clicking the gear three times
 * quickly opens the admin panel instead: a small hidden extra, not a lock.
 */
export function renderSettings(
  ctx: Context,
  projects: () => readonly DashboardData[],
  actions: { pickProject: (selection: string) => void; openAdmin: () => void },
): Settings {
  const button = h(
    'button',
    {
      type: 'button',
      class: 'icon-button',
      'aria-label': 'Settings',
      title: 'Settings',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
    },
    icon('settings'),
  );
  const projectPicker = dropdown({
    name: 'Project',
    searchable: false,
    options: () => projectOptions(projects()),
    selected: () => ctx.store.get().project,
    onPick: actions.pickProject,
  });
  // A project's own dashboard.html holds one project, so there is nothing
  // to choose there and the picker is left out.
  const panel = h(
    'div',
    { class: 'settings-panel', role: 'dialog', 'aria-label': 'Settings', hidden: true },
    h('h2', { class: 'settings-title', text: 'Settings' }),
    ctx.live
      ? h('label', { class: 'settings-label', for: projectPicker.button.id, text: 'Project' })
      : null,
    ctx.live ? projectPicker.element : null,
    h('p', {
      class: 'settings-note',
      text: ctx.live
        ? 'All projects shows every video on one calendar, with statistics for all of them.'
        : 'This page shows one project. Open index.html to see every project together.',
    }),
  );
  const element = h('div', { class: 'settings' }, button, panel);

  const outside = (event: PointerEvent): void => {
    if (event.target instanceof Node && !element.contains(event.target)) close();
  };
  const keys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !panel.hidden) {
      close();
      button.focus();
    }
  };
  const open = (): void => {
    projectPicker.update();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keys);
    if (ctx.live) projectPicker.button.focus();
  };
  // Tabbing out of the panel closes it. A missing relatedTarget means a
  // click on something that cannot take focus, like the note, so it stays.
  element.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (!panel.hidden && next instanceof Node && !element.contains(next)) close();
  });
  function close(): void {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('keydown', keys);
  }

  let clicks: number[] = [];
  button.addEventListener('click', (event) => {
    clicks = [...clicks, event.timeStamp].filter((t) => event.timeStamp - t < SECRET_WINDOW_MS);
    if (clicks.length >= SECRET_CLICKS) {
      clicks = [];
      close();
      actions.openAdmin();
      return;
    }
    if (panel.hidden) open();
    else close();
  });

  return { element, update: projectPicker.update };
}
