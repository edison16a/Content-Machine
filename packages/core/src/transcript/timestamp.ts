/** Matches the clock stamps YouTube shows: 0:00, 12:34, 1:02:45. */
export const CLOCK_PATTERN = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;

/** Converts a YouTube style clock stamp to seconds, or undefined if it is not one. */
export function parseClock(stamp: string): number | undefined {
  const match = CLOCK_PATTERN.exec(stamp.trim());
  if (match === null) return undefined;
  const [, hours, minutes, seconds] = match;
  const secs = Number(seconds);
  if (secs >= 60) return undefined;
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + secs;
}

/**
 * Converts an SRT or WebVTT time ("00:01:02,500", "01:02.500") to seconds.
 * Hours are optional because WebVTT allows dropping them.
 */
export function parseCueTime(stamp: string): number | undefined {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})$/.exec(stamp.trim());
  if (match === null) return undefined;
  const [, hours, minutes, seconds, fraction = '0'] = match;
  const millis = Number(fraction.padEnd(3, '0'));
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + millis / 1000;
}

/** Formats seconds as m:ss or h:mm:ss for messages. */
export function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = String(whole % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
