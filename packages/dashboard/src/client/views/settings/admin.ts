import {
  DASHBOARD_PLATFORMS,
  PLATFORM_NAMES,
  type DashboardPlatform,
} from '../../../shared/types.js';
import type { Context } from '../../context.js';
import { h, img } from '../../lib/dom.js';
import { icon } from '../../lib/icons.js';
import { ALL_PROJECTS } from '../../lib/merge.js';
import { count, money, parseAmount } from '../../lib/numbers.js';
import {
  clearOverride,
  loadOverride,
  overrideIncome,
  saveOverride,
  splitViews,
  startingOverride,
  type Override,
} from '../../lib/override.js';

/**
 * The admin panel: type a number of views, slide how they split across the
 * platforms, and see the estimated income straight away. "Show these
 * numbers" makes the statistics use them as the current totals in this
 * browser. It is deliberately simple and unlocked: the numbers are only for
 * the person looking at the page, and recorded statistics never change.
 */
export function createAdminPanel(
  ctx: Context,
  onChange: () => void,
): { element: HTMLElement; open: () => void } {
  const viewsInput = h('input', {
    type: 'text',
    inputmode: 'numeric',
    class: 'admin-input',
    id: 'admin-views',
  });
  const error = h('p', { class: 'admin-error', role: 'alert', hidden: true });
  const sliders = new Map<DashboardPlatform, HTMLInputElement>();
  const rows = new Map<
    DashboardPlatform,
    { share: HTMLElement; views: HTMLElement; income: HTMLElement }
  >();
  const total = h('strong', { class: 'admin-total' });
  const scopeNote = h('p', { class: 'settings-note' });

  const platformRows = DASHBOARD_PLATFORMS.map((platform) => {
    const slider = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      class: 'admin-slider',
      'aria-label': `${PLATFORM_NAMES[platform]} share`,
    });
    const cells = {
      share: h('span', { class: 'admin-share' }),
      views: h('span', { class: 'admin-num' }),
      income: h('span', { class: 'admin-num' }),
    };
    sliders.set(platform, slider);
    rows.set(platform, cells);
    const logo = ctx.data.logos.platforms[platform];
    return h(
      'div',
      { class: 'admin-row' },
      h(
        'span',
        { class: 'admin-platform' },
        logo === null ? null : img(logo, '', 'row-logo'),
        PLATFORM_NAMES[platform],
      ),
      slider,
      cells.share,
      cells.views,
      cells.income,
    );
  });

  /** The form's current numbers, or undefined while the views field is not a number. */
  const read = (): Override | undefined => {
    const views = parseAmount(viewsInput.value);
    if (views === undefined || views < 0) return undefined;
    const split = Object.fromEntries(
      DASHBOARD_PLATFORMS.map((p) => [p, Number(sliders.get(p)?.value ?? 0)]),
    ) as Override['split'];
    return { views: Math.round(views), split };
  };

  const preview = (): void => {
    const override = read();
    error.hidden = override !== undefined;
    error.textContent = 'Type a number of views, like 30000 or 30k.';
    if (override === undefined) return;
    const views = splitViews(override);
    const income = overrideIncome(override, ctx.data.stats.rates);
    const weights = DASHBOARD_PLATFORMS.reduce((sum, p) => sum + override.split[p], 0);
    for (const platform of DASHBOARD_PLATFORMS) {
      const cells = rows.get(platform);
      if (cells === undefined) continue;
      const share = weights === 0 ? 100 / 3 : (override.split[platform] / weights) * 100;
      cells.share.textContent = `${share.toFixed(0)}%`;
      cells.views.textContent = `${count(views[platform])} views`;
      cells.income.textContent = money(income.perPlatform[platform]);
    }
    total.textContent = money(income.total);
  };
  viewsInput.addEventListener('input', preview);
  for (const slider of sliders.values()) slider.addEventListener('input', preview);

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
    h('label', { class: 'settings-label', for: 'admin-views', text: 'Total views' }),
    viewsInput,
    error,
    h('div', { class: 'admin-rows' }, ...platformRows),
    h('div', { class: 'admin-sum' }, h('span', { text: 'Estimated income' }), total),
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

  const keys = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };
  function close(): void {
    element.hidden = true;
    document.removeEventListener('keydown', keys);
  }
  const open = (): void => {
    const start = startingOverride(loadOverride(ctx.store.get().project), ctx.data.stats);
    viewsInput.value = String(start.views);
    for (const platform of DASHBOARD_PLATFORMS) {
      const weights = DASHBOARD_PLATFORMS.reduce((sum, p) => sum + start.split[p], 0);
      const share = weights === 0 ? 33 : Math.round((start.split[platform] / weights) * 100);
      const slider = sliders.get(platform);
      if (slider !== undefined) slider.value = String(share);
    }
    const scope = ctx.store.get().project;
    scopeNote.textContent = `Set what the statistics show right now for ${scope === ALL_PROJECTS ? 'all projects' : scope}. Saved in this browser only; your recorded numbers stay as they are.`;
    preview();
    element.hidden = false;
    document.addEventListener('keydown', keys);
    viewsInput.focus();
    viewsInput.select();
  };

  apply.addEventListener('click', () => {
    const override = read();
    if (override === undefined) {
      preview();
      viewsInput.focus();
      return;
    }
    saveOverride(ctx.store.get().project, override);
    close();
    onChange();
  });
  reset.addEventListener('click', () => {
    clearOverride(ctx.store.get().project);
    close();
    onChange();
  });
  closeButton.addEventListener('click', close);
  return { element, open };
}
