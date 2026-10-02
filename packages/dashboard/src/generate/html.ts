import { DATA_ELEMENT_ID, type DashboardData } from '../shared/types.js';

/**
 * JSON that is safe inside a <script> tag: no "</script>", no HTML comment
 * openers, and no line separators that old parsers choke on.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Inline code must not close its own tag early. */
function guard(code: string, tag: 'script' | 'style'): string {
  return code.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

/**
 * Sets the theme before the first paint so dark mode users never see a white
 * flash. Mirrors the storage key and fallback used by the client.
 */
const THEME_BOOT =
  "(function(){var t=null;try{t=localStorage.getItem('content-machine:theme')}catch(e){}" +
  "if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" +
  'document.documentElement.dataset.theme=t})();';

export interface HtmlInput {
  data: DashboardData;
  js: string;
  css: string;
}

/**
 * The whole dashboard as one HTML file: inline CSS, inline JS, embedded data
 * and logos. Videos and posters load by relative path from next to it.
 */
export function renderDashboardHtml(input: HtmlInput): string {
  const title = `${input.data.project} | Content Machine`;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="generator" content="Content Machine">',
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="icon" href="${escapeHtml(input.data.logos.brand)}">`,
    `<script>${THEME_BOOT}</script>`,
    `<style>${guard(input.css, 'style')}</style>`,
    '</head>',
    '<body>',
    '<div id="app"></div>',
    '<noscript><p style="padding:24px">This dashboard needs JavaScript to show the calendar and play videos.</p></noscript>',
    `<script type="application/json" id="${DATA_ELEMENT_ID}">${jsonForScript(input.data)}</script>`,
    `<script>${guard(input.js, 'script')}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
