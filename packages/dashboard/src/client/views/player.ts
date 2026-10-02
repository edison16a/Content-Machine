import type { DashboardItem } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h, replace } from '../lib/dom.js';
import { stopPreview } from '../lib/hover-preview.js';
import { icon } from '../lib/icons.js';
import { neighbor } from '../lib/selectors.js';
import { loadNumber, save, load } from '../lib/storage.js';
import { playerDetails } from './player-details.js';

export const MISSING_VIDEO =
  'Video not found. Keep dashboard.html in the project folder next to the videos folder.';

export interface Player {
  element: HTMLElement;
  open: (item: DashboardItem, opener?: HTMLElement) => void;
  close: () => void;
  isOpen: () => boolean;
  refresh: () => void;
}

/** The modal player. One <video> element is reused so only one video ever plays. */
export function createPlayer(ctx: Context): Player {
  const video = h('video', {
    controls: true,
    playsinline: true,
    preload: 'metadata',
    class: 'video',
  });
  video.volume = loadNumber('volume', 1, 0, 1);
  video.muted = load('muted') === 'true';
  video.addEventListener('volumechange', () => {
    save('volume', String(video.volume));
    save('muted', String(video.muted));
  });
  const bigPlay = h(
    'button',
    { type: 'button', class: 'big-play', 'aria-label': 'Play with sound', hidden: true },
    icon('play'),
  );
  const error = h(
    'div',
    { class: 'video-error', role: 'alert', hidden: true },
    icon('alert', 'icon icon-lg'),
    h('p', { text: MISSING_VIDEO }),
  );
  const details = h('div', { class: 'side-body' });
  const autoplay = h('input', { type: 'checkbox', class: 'switch-input', id: 'autoplay-next' });
  const close = h(
    'button',
    { type: 'button', class: 'icon-button', 'aria-label': 'Close player', title: 'Close (Esc)' },
    icon('close'),
  );
  const prev = h(
    'button',
    {
      type: 'button',
      class: 'icon-button',
      'aria-label': 'Previous video',
      title: 'Previous (Left arrow)',
    },
    icon('previous'),
  );
  const next = h(
    'button',
    {
      type: 'button',
      class: 'icon-button',
      'aria-label': 'Next video',
      title: 'Next (Right arrow)',
    },
    icon('next'),
  );
  const element = h(
    'div',
    {
      class: 'player',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'player-title',
      hidden: true,
    },
    h('div', { class: 'player-backdrop', on: { click: () => api.close() } }),
    h(
      'div',
      { class: 'player-panel' },
      h('div', { class: 'player-media' }, h('div', { class: 'frame' }, video, bigPlay, error)),
      h(
        'div',
        { class: 'player-side' },
        h('div', { class: 'side-top' }, h('div', { class: 'side-nav' }, prev, next), close),
        details,
        h(
          'label',
          { class: 'switch', for: 'autoplay-next' },
          autoplay,
          h('span', { class: 'switch-track', 'aria-hidden': 'true' }),
          h('span', { text: 'Auto-play next' }),
        ),
      ),
    ),
  );
  let current: DashboardItem | undefined;
  let opener: HTMLElement | undefined;

  const play = (): void => {
    bigPlay.hidden = true;
    video.play().catch(() => {
      if (error.hidden) bigPlay.hidden = false;
    });
  };
  const step = (dir: 1 | -1): void => {
    const item = current === undefined ? undefined : neighbor(ctx.data.items, current.id, dir);
    if (item !== undefined) api.open(item);
  };
  bigPlay.addEventListener('click', play);
  video.addEventListener('error', () => {
    if (!video.hasAttribute('src')) return;
    error.hidden = false;
    bigPlay.hidden = true;
  });
  video.addEventListener('ended', () => {
    if (ctx.store.get().autoplay) step(1);
  });
  autoplay.addEventListener('change', () => ctx.store.set({ autoplay: autoplay.checked }));
  close.addEventListener('click', () => api.close());
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  const api: Player = {
    element,
    isOpen: () => !element.hidden,
    open(item, from) {
      stopPreview();
      if (from !== undefined) opener = from;
      current = item;
      error.hidden = true;
      video.poster = item.thumb;
      video.src = item.video;
      prev.disabled = neighbor(ctx.data.items, item.id, -1) === undefined;
      next.disabled = neighbor(ctx.data.items, item.id, 1) === undefined;
      api.refresh();
      element.hidden = false;
      document.body.classList.add('no-scroll');
      if (!element.contains(document.activeElement)) close.focus();
      play();
    },
    close() {
      if (element.hidden) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
      element.hidden = true;
      document.body.classList.remove('no-scroll');
      opener?.focus();
      current = undefined;
    },
    refresh() {
      autoplay.checked = ctx.store.get().autoplay;
      if (current !== undefined) replace(details, playerDetails(ctx, current));
    },
  };
  bindKeys(api, video, step);
  return api;
}

/** Space, M, F, arrows and Esc while the player is open. */
function bindKeys(player: Player, video: HTMLVideoElement, step: (dir: 1 | -1) => void): void {
  document.addEventListener('keydown', (event) => {
    if (!player.isOpen() || event.altKey || event.ctrlKey || event.metaKey) return;
    const onVideo = event.target === video;
    const handlers: Record<string, () => void> = {
      ' ': () => (video.paused ? void video.play().catch(() => undefined) : video.pause()),
      m: () => (video.muted = !video.muted),
      f: () =>
        void (document.fullscreenElement === null
          ? video.requestFullscreen().catch(() => undefined)
          : document.exitFullscreen()),
      ArrowLeft: () => step(-1),
      ArrowRight: () => step(1),
      Escape: () => (document.fullscreenElement === null ? player.close() : undefined),
    };
    const handler = handlers[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (handler === undefined || (onVideo && event.key === ' ')) return;
    event.preventDefault();
    event.stopPropagation();
    handler();
  });
}
