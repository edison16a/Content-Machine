import { DASHBOARD_PLATFORMS, PLATFORM_NAMES, type DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { longDate, monthDay } from '../lib/dates.js';
import { copyText, flashLabel, h, img } from '../lib/dom.js';
import { absolutePath, clock, itemLabel, time12 } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { statusBadge } from './badge.js';

function copyButton(label: string, iconName: 'copy', text: () => string): HTMLButtonElement {
  const button = h(
    'button',
    { type: 'button', class: 'button button-outline button-sm' },
    icon(iconName),
    h('span', { class: 'label', text: label }),
  );
  button.addEventListener('click', () => {
    void copyText(text()).then((ok) => {
      flashLabel(button, ok ? 'Copied' : 'Copy failed');
    });
  });
  return button;
}

function platformRows(ctx: Context, item: DashboardItem): HTMLElement {
  const rows = DASHBOARD_PLATFORMS.map((platform) => {
    const entry = item.platforms[platform];
    const logo = ctx.data.logos.platforms[platform];
    return h(
      'li',
      { class: 'platform-row' },
      logo === null ? null : img(logo, '', 'row-logo'),
      h('span', { class: 'row-name', text: PLATFORM_NAMES[platform] }),
      h('span', { class: 'row-time', text: `${monthDay(item.date)}, ${time12(entry.time)}` }),
      statusBadge(entry.status),
      entry.note === '' ? null : h('span', { class: 'row-note', text: entry.note }),
    );
  });
  return h('ul', { class: 'platform-rows' }, ...rows);
}

/**
 * The right-hand side of the player: title, when it posts on the selected
 * platform, that platform's caption, every platform's status, and where the
 * cut came from.
 */
export function playerDetails(ctx: Context, item: DashboardItem): HTMLElement {
  const { platform } = ctx.store.get();
  const entry = item.platforms[platform];
  const caption = item.captions[platform];
  const fileName = item.video.split('/').pop() ?? item.video;
  return h(
    'div',
    { class: 'details' },
    h('span', { class: 'eyebrow', text: itemLabel(item.id) }),
    h('h2', { id: 'player-title', text: item.postTitle }),
    h('p', {
      class: 'when',
      text: `${longDate(item.date)} at ${time12(entry.time)} on ${PLATFORM_NAMES[platform]}`,
    }),
    h(
      'section',
      { class: 'panel' },
      h(
        'div',
        { class: 'panel-head' },
        h('h3', { text: `${PLATFORM_NAMES[platform]} caption` }),
        copyButton('Copy caption', 'copy', () => caption),
      ),
      h('p', { class: 'caption', text: caption === '' ? 'No caption yet.' : caption }),
    ),
    h('section', { class: 'panel' }, h('h3', { text: 'Platforms' }), platformRows(ctx, item)),
    h(
      'dl',
      { class: 'facts' },
      h(
        'div',
        {},
        h('dt', { text: 'Source' }),
        h('dd', { text: `${item.source}, ${clock(item.sourceStart)} to ${clock(item.sourceEnd)}` }),
      ),
      item.note === ''
        ? null
        : h('div', {}, h('dt', { text: 'Cut note' }), h('dd', { text: item.note })),
    ),
    h(
      'div',
      { class: 'detail-actions' },
      h(
        'a',
        { class: 'button button-outline button-sm', href: item.video, download: fileName },
        icon('download'),
        h('span', { class: 'label', text: 'Download video' }),
      ),
      copyButton('Copy file path', 'copy', () => absolutePath(item.video, window.location.href)),
    ),
  );
}
