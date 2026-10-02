import type { Context } from '../../context.js';
import { h } from '../../lib/dom.js';
import { icon } from '../../lib/icons.js';
import { ALL_PROJECTS } from '../../lib/merge.js';
import { clearOverride, loadOverride, saveOverride, startingOverride } from '../../lib/override.js';
import { adminForm } from './admin-form.js';

export interface AdminPanel {
  element: HTMLElement;
  open: () => void;
  isOpen: () => boolean;
}

/** Everything in the panel that can take focus, in order, for keeping Tab inside it. */
function focusables(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>('button, input')].filter(
    (node) => !node.hasAttribute('disabled') && node.offsetParent !== null,
  );
}

/**
 * The admin panel, opened by clicking Settings three times. Type a number of
 * views and slide how they split across platforms to see the estimated
 * income, then "Show these numbers" makes the statistics use them as the
 * current totals in this browser. It is deliberately simple and unlocked:
 * the numbers are only for the person looking at the page, and recorded
 * statistics never change.
 */
export function createAdminPanel(ctx: Context, onChange: () => void): AdminPanel {
  const form = adminForm(ctx);
  const scopeNote = h('p', { class: 'settings-note' });
  const apply = h('button', { type: 'button', class: 'button', text: 'Show these numbers' });
  const reset = h('button', { type: 'button', class: 'text-button', text: 'Use recorded numbers' });
  const closeButton = h(
    'button',
    { type: 'button', class: 'icon-button', 'aria-label': 'Close' },
    icon('close'),
  );
  const panel = h(
    'div',
    { class: 'admin-panel' },
    h(
      'div',
      { class: 'admin-head' },
      h('h2', { id: 'admin-title', text: 'Custom numbers' }),
      closeButton,
    ),
    scopeNote,
    form.element,
    h('div', { class: 'admin-actions' }, reset, apply),
  );
  const element = h(
    'div',
    {
      class: 'admin',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'admin-title',
      hidden: true,
    },
    h('div', { class: 'player-backdrop', on: { click: () => close() } }),
    panel,
  );
  let opener: HTMLElement | null = null;

  // Escape closes, Enter in the views field applies, and Tab stays inside.
  const keys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter' && event.target === form.viewsInput && !event.isComposing) {
      event.preventDefault();
      apply.click();
    } else if (event.key === 'Tab') {
      const nodes = focusables(panel);
      const first = nodes[0];
      const last = nodes.at(-1);
      if (first === undefined || last === undefined) return;
      const inside = event.target instanceof Node && panel.contains(event.target);
      if (event.shiftKey && (event.target === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (event.target === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  function close(): void {
    if (element.hidden) return;
    element.hidden = true;
    document.removeEventListener('keydown', keys);
    opener?.focus();
    opener = null;
  }
  const open = (): void => {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scope = ctx.store.get().project;
    form.fill(startingOverride(loadOverride(scope), ctx.data.stats));
    const name = scope === ALL_PROJECTS ? 'all projects' : scope;
    scopeNote.textContent = `For ${name}. Only saved in this browser.`;
    element.hidden = false;
    document.addEventListener('keydown', keys);
    form.viewsInput.focus();
    form.viewsInput.select();
  };

  apply.addEventListener('click', () => {
    const override = form.read();
    if (override === undefined) {
      form.viewsInput.focus();
      return;
    }
    // A fresh seed per Apply: the same numbers give a new month each time.
    const seed = Math.random().toString(36).slice(2);
    saveOverride(ctx.store.get().project, { ...override, seed });
    close();
    onChange();
  });
  reset.addEventListener('click', () => {
    clearOverride(ctx.store.get().project);
    close();
    onChange();
  });
  closeButton.addEventListener('click', close);
  return { element, open, isOpen: () => !element.hidden };
}
