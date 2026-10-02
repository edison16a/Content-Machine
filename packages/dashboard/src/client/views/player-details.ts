import { DASHBOARD_PLATFORMS, PLATFORM_NAMES, type DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { focusPlatform } from '../state.js';
import { longDate, monthDay } from '../lib/dates.js';
import { copyText, flashLabel, h, img } from '../lib/dom.js';
import { absolutePath, time12 } from '../lib/format.js';
import { icon, type IconName } from '../lib/icons.js';
import { statusBadge } from './badge.js';

function actionButton(
  label: string,
  name: IconName,
  onClick: (button: HTMLButtonElement) => void,
): HTMLButtonElement {
  const button = h(
    'button',
    { type: 'button', class: 'button button-sm' },
    icon(name),
    h('span', { class: 'label', text: label }),
  );
  button.addEventListener('click', () => onClick(button));
  return button;
}

function copyAction(label: string, text: () => string): HTMLButtonElement {
  return actionButton(label, 'copy', (button) => {
    void copyText(text()).then((ok) => flashLabel(button, ok ? 'Copied' : 'Copy failed'));
  });
}

function platformRows(ctx: Context, item: DashboardItem): HTMLElement {
  return h(
    'ul',
    { class: 'platform-rows' },
    ...DASHBOARD_PLATFORMS.map((platform) => {
      const entry = item.platforms[platform];
      const logo = ctx.data.logos.platforms[platform];
      return h(
        'li',
        { class: 'platform-row' },
        logo === null ? h('span', {}) : img(logo, '', 'row-logo'),
        h('span', { class: 'row-time', text: `${monthDay(item.date)}, ${time12(entry.time)}` }),
        statusBadge(entry.status),
      );
    }),
  );
}

/**
 * The side of the player: what it is, when it posts, the caption to paste,
 * where it stands on each platform, and the two things you can do with it.
 */
export function playerDetails(ctx: Context, item: DashboardItem): HTMLElement {
  const platform = focusPlatform(ctx.store.get().platform);
  const caption = item.captions[platform];
  // The folder that holds the video, relative to the page: "videos/" or
  // "projects/demo/videos/" on the live index.
  const folder = item.video.slice(0, item.video.lastIndexOf('/') + 1) || './';
  return h(
    'div',
    { class: 'details' },
    h('h2', { id: 'player-title', text: item.postTitle }),
    h('p', {
      class: 'when',
      text: `${longDate(item.date)} at ${time12(item.platforms[platform].time)}`,
    }),
    h(
      'section',
      { class: 'panel' },
      h('p', { class: 'caption', text: caption === '' ? 'No caption yet.' : caption }),
      copyAction(`Copy ${PLATFORM_NAMES[platform]} caption`, () => caption),
    ),
    platformRows(ctx, item),
    h(
      'div',
      { class: 'detail-actions' },
      h(
        'a',
        {
          class: 'button button-sm',
          href: folder,
          target: '_blank',
          rel: 'noopener',
          title: 'Opens the folder with this video in a new tab',
        },
        icon('folder'),
        h('span', { class: 'label', text: 'Open folder' }),
      ),
      copyAction('Copy file path', () => absolutePath(item.video, window.location.href)),
    ),
  );
}
