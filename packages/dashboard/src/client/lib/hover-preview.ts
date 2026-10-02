/**
 * Silent in-place previews on hover. Only one plays at a time, only on
 * devices that can hover, and never while the player is open.
 */
const DELAY_MS = 400;
let active: { video: HTMLVideoElement; timer: number } | undefined;

export function stopPreview(): void {
  if (active === undefined) return;
  window.clearTimeout(active.timer);
  active.video.pause();
  active.video.removeAttribute('src');
  active.video.load();
  active.video.remove();
  active = undefined;
}

export function attachHoverPreview(
  card: HTMLElement,
  frame: HTMLElement,
  src: string,
  blocked: () => boolean,
): void {
  if (!window.matchMedia('(hover: hover)').matches) return;
  card.addEventListener('pointerenter', () => {
    if (blocked()) return;
    stopPreview();
    const video = document.createElement('video');
    video.className = 'preview';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    const timer = window.setTimeout(() => {
      if (blocked()) return;
      video.src = src;
      frame.append(video);
      video.play().catch(() => undefined);
    }, DELAY_MS);
    active = { video, timer };
  });
  card.addEventListener('pointerleave', stopPreview);
}
