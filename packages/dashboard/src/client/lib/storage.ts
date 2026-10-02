/**
 * localStorage wrapped in try/catch. Private windows, blocked storage and some
 * file:// setups throw on access; the dashboard must still work, just without
 * remembering preferences.
 */
const PREFIX = 'content-machine:';

export function load(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Preferences are a convenience; losing them is fine.
  }
}

export function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing stored, or storage is blocked; either way it is gone.
  }
}

/** Reads a stored value only if it is one of the allowed options. */
export function loadChoice<T extends string>(key: string, options: readonly T[], fallback: T): T {
  const value = load(key);
  return options.find((option) => option === value) ?? fallback;
}

export function loadNumber(key: string, fallback: number, min: number, max: number): number {
  const value = Number(load(key));
  return load(key) !== null && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}
