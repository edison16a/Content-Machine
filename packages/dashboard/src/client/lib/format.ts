import type { DashboardStatus } from '../../shared/types.js';

/** "17:15" becomes "5:15 PM". */
export function time12(time: string): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Seconds as m:ss or h:mm:ss, rounded down. */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Video length, rounded to the nearest second. */
export function duration(seconds: number): string {
  return clock(Math.round(seconds));
}

export function itemLabel(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

export const STATUS_LABELS: Record<DashboardStatus, string> = {
  queued: 'Queued',
  scheduled: 'Scheduled',
  posted: 'Posted',
  failed: 'Failed',
};

/** "Oct 1, 4:20 PM" in the project's time zone. */
export function stamp(isoString: string, timeZone: string): string {
  const value = new Date(isoString);
  if (Number.isNaN(value.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

/**
 * Turns a relative video path into something a person can paste: a file
 * system path when opened from disk, otherwise the full URL.
 */
export function absolutePath(relative: string, base: string): string {
  const url = new URL(relative, base);
  if (url.protocol !== 'file:') return url.href;
  const path = decodeURIComponent(url.pathname);
  return /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path;
}

/** Slot time for a platform: the base slot plus that platform's stagger. */
export function platformSlotTime(base: string, stagger: number): string {
  const [h0 = 0, m0 = 0] = base.split(':').map(Number);
  const total = (((h0 * 60 + m0 + stagger) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
