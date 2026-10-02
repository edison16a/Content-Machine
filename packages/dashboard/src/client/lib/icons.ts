/**
 * Small stroke icons on a 24px grid, plus the official GitHub mark. They are
 * fixed strings written here, never built from data, so innerHTML is safe.
 */
const STROKE =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  chevronLeft: `<path ${STROKE} d="M15 18l-6-6 6-6"/>`,
  chevronRight: `<path ${STROKE} d="M9 18l6-6-6-6"/>`,
  sun: `<circle ${STROKE} cx="12" cy="12" r="4"/><path ${STROKE} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  moon: `<path ${STROKE} d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>`,
  check: `<path ${STROKE} d="M5 12.5l4.5 4.5L19 7.5"/>`,
  clock: `<circle ${STROKE} cx="12" cy="12" r="9"/><path ${STROKE} d="M12 7v5l3 2"/>`,
  close: `<path ${STROKE} d="M6 6l12 12M18 6L6 18"/>`,
  alert: `<circle ${STROKE} cx="12" cy="12" r="9"/><path ${STROKE} d="M12 7.5v5.5M12 16.5v.01"/>`,
  copy: `<rect ${STROKE} x="9" y="9" width="11" height="11" rx="2"/><path ${STROKE} d="M5 15V5a1 1 0 0 1 1-1h9"/>`,
  download: `<path ${STROKE} d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>`,
  today: `<rect ${STROKE} x="3.5" y="5" width="17" height="15" rx="2"/><path ${STROKE} d="M3.5 10h17M8 3v4M16 3v4"/>`,
  target: `<circle ${STROKE} cx="12" cy="12" r="8"/><circle ${STROKE} cx="12" cy="12" r="3"/>`,
  previous: `<path ${STROKE} d="M18 6l-8 6 8 6zM6 6v12"/>`,
  next: `<path ${STROKE} d="M6 6l8 6-8 6zM18 6v12"/>`,
  film: `<rect ${STROKE} x="3.5" y="3.5" width="17" height="17" rx="3"/><path ${STROKE} d="M8 3.5v17M16 3.5v17M3.5 9h4.5M3.5 15h4.5M16 9h4.5M16 15h4.5"/>`,
  github:
    '<path fill="currentColor" fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** An inline SVG icon, hidden from screen readers (the control has the label). */
export function icon(name: IconName, className = 'icon'): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('aria-hidden', 'true');
  const viewBox = name === 'github' ? '0 0 16 16' : '0 0 24 24';
  span.innerHTML = `<svg viewBox="${viewBox}" width="100%" height="100%">${PATHS[name]}</svg>`;
  return span;
}
