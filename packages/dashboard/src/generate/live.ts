import { createHash } from 'node:crypto';
import {
  LIVE_DATA_GLOBAL,
  type DashboardData,
  type DashboardItem,
  type LiveData,
} from '../shared/types.js';
import type { ClientBundle } from './bundle.js';
import { jsonForScript } from './html.js';

/**
 * A short fingerprint of the client code. The open page compares it between
 * polls and reloads when it changes, so an upgrade shows up without anyone
 * touching the browser.
 */
export function clientBuildId(bundle: ClientBundle): string {
  return createHash('sha256').update(bundle.js).update(bundle.css).digest('hex').slice(0, 12);
}

/**
 * Project dashboards load media relative to their own folder. The live index
 * sits at the repo root, so every path gets the project folder in front.
 */
export function withMediaBase(data: DashboardData, base: string): DashboardData {
  const prefix = (path: string): string => `${base}${path}`;
  const items: DashboardItem[] = data.items.map((item) => ({
    ...item,
    video: prefix(item.video),
    thumb: prefix(item.thumb),
  }));
  return { ...data, items };
}

/** The text of projects/dashboard-data.js: one assignment the page can re-run. */
export function renderLiveData(data: LiveData): string {
  return `window.${LIVE_DATA_GLOBAL} = ${jsonForScript(data)};\n`;
}
