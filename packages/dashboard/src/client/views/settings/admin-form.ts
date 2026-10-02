import {
  DASHBOARD_PLATFORMS,
  PLATFORM_NAMES,
  type DashboardPlatform,
} from '../../../shared/types.js';
import type { Context } from '../../context.js';
import { h, img } from '../../lib/dom.js';
import { count, money, parseAmount } from '../../lib/numbers.js';
import { overrideIncome, splitViews, type Override } from '../../lib/override.js';
import { rebalance, toPercentages } from '../../lib/split.js';

export interface AdminForm {
  element: HTMLElement;
  /** The views field, which takes focus when the panel opens. */
  viewsInput: HTMLInputElement;
  fill: (start: Override) => void;
  /** The typed numbers, or undefined (with a message shown) when the views field is not a number. */
  read: () => Override | undefined;
}

type Split = Override['split'];

/**
 * The fields of the admin panel: total views, a slider per platform that
 * always add up to 100%, and each platform's views and estimated income,
 * updated as you type or slide. Until a slider moves, the exact starting
 * split is used, so applying untouched numbers changes nothing.
 */
export function adminForm(ctx: Context): AdminForm {
  const viewsInput = h('input', {
    type: 'text',
    inputmode: 'numeric',
    class: 'admin-input',
    id: 'admin-views',
  });
  const error = h('p', { class: 'admin-error', role: 'alert', hidden: true });
  const total = h('strong', { class: 'admin-total' });
  const sliders = new Map<DashboardPlatform, HTMLInputElement>();
  const cells = new Map<
    DashboardPlatform,
    { share: HTMLElement; views: HTMLElement; income: HTMLElement }
  >();
  let percentages: Split = { tiktok: 50, instagram: 25, youtube: 25 };
  let exact: Split | undefined;

  const rows = DASHBOARD_PLATFORMS.map((platform) => {
    const slider = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      step: 1,
      class: 'admin-slider',
      'aria-label': `${PLATFORM_NAMES[platform]} share`,
    });
    slider.addEventListener('input', () => {
      exact = undefined;
      percentages = rebalance(percentages, platform, Number(slider.value));
      preview();
    });
    const row = {
      share: h('span', { class: 'admin-share' }),
      views: h('span', { class: 'admin-num' }),
      income: h('span', { class: 'admin-num' }),
    };
    sliders.set(platform, slider);
    cells.set(platform, row);
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
      row.share,
      row.views,
      row.income,
    );
  });

  const read = (): Override | undefined => {
    const views = parseAmount(viewsInput.value);
    if (views === undefined || views < 0) return undefined;
    return { views: Math.round(views), split: exact ?? percentages };
  };

  function preview(): void {
    for (const platform of DASHBOARD_PLATFORMS) {
      const slider = sliders.get(platform);
      if (slider === undefined) continue;
      slider.value = String(percentages[platform]);
      slider.setAttribute('aria-valuetext', `${percentages[platform]}%`);
      const row = cells.get(platform);
      if (row !== undefined) row.share.textContent = `${percentages[platform]}%`;
    }
    const override = read();
    error.hidden = override !== undefined;
    error.textContent = 'Type a number of views, like 30000 or 30k.';
    if (override === undefined) return;
    const views = splitViews(override);
    const income = overrideIncome(override, ctx.data.stats.rates);
    for (const platform of DASHBOARD_PLATFORMS) {
      const row = cells.get(platform);
      if (row === undefined) continue;
      row.views.textContent = count(views[platform]);
      row.income.textContent = money(income.perPlatform[platform]);
    }
    total.textContent = money(income.total);
  }
  viewsInput.addEventListener('input', preview);

  const fill = (start: Override): void => {
    viewsInput.value = String(start.views);
    exact = start.split;
    percentages = toPercentages(start.split);
    preview();
  };

  const element = h(
    'div',
    { class: 'admin-form' },
    h('label', { class: 'settings-label', for: 'admin-views', text: 'Total views' }),
    viewsInput,
    error,
    h('div', { class: 'admin-rows' }, ...rows),
    h('div', { class: 'admin-sum' }, h('span', { text: 'Estimated income' }), total),
  );
  /** Like `read`, but redraws the form so it says why when the views field is wrong. */
  const readChecked = (): Override | undefined => {
    const override = read();
    if (override === undefined) preview();
    return override;
  };
  return { element, viewsInput, fill, read: readChecked };
}
