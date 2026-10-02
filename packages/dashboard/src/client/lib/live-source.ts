import {
  DATA_ELEMENT_ID,
  LIVE_DATA_FILE,
  LIVE_DATA_GLOBAL,
  type DashboardData,
  type LiveData,
} from '../../shared/types.js';
import { load, save } from './storage.js';

/** How often the live index rereads its data file. It is a small local file. */
export const POLL_MS = 4000;

/**
 * Where the page gets its data. A project's dashboard.html is a snapshot with
 * the data baked in. The root index.html is live: it reads
 * projects/dashboard-data.js and keeps rereading it.
 */
export type Source =
  { kind: 'snapshot'; projects: DashboardData[] } | { kind: 'live'; projects: DashboardData[] };

function isLiveData(value: unknown): value is LiveData {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { projects?: unknown }).projects)
  );
}

function liveGlobal(): LiveData | undefined {
  const value: unknown = (window as unknown as Record<string, unknown>)[LIVE_DATA_GLOBAL];
  return isLiveData(value) ? value : undefined;
}

export function readSource(): Source {
  const node = document.getElementById(DATA_ELEMENT_ID);
  if (node !== null) {
    return { kind: 'snapshot', projects: [JSON.parse(node.textContent || '{}') as DashboardData] };
  }
  return { kind: 'live', projects: liveGlobal()?.projects ?? [] };
}

/**
 * Reloads the page so a newer client takes over, but at most once per build.
 * Without the guard a stale browser cache could reload forever.
 */
function reloadOnce(build: string): boolean {
  if (load('reloaded-for') === build) return false;
  save('reloaded-for', build);
  window.location.reload();
  return true;
}

/**
 * Re-runs the data script on a timer and calls `onChange` when the projects
 * differ from last time. Browsers block fetch() on file:// pages, but a
 * fresh <script> tag still loads, so this works straight from Finder or
 * Explorer with no server. The query string defeats caching.
 */
export function watchLive(onChange: (projects: DashboardData[]) => void, every = POLL_MS): void {
  let build = liveGlobal()?.build;
  let last = JSON.stringify(liveGlobal()?.projects ?? []);
  let count = 0;
  const poll = (): void => {
    const script = document.createElement('script');
    count += 1;
    script.src = `${LIVE_DATA_FILE}?v=${Date.now()}-${count}`;
    const next = (): void => {
      script.remove();
      window.setTimeout(poll, every);
    };
    script.addEventListener('error', next);
    script.addEventListener('load', () => {
      const data = liveGlobal();
      if (data !== undefined) {
        if (build === undefined) build = data.build;
        else if (data.build !== build && reloadOnce(data.build)) return;
        const text = JSON.stringify(data.projects);
        if (text !== last) {
          last = text;
          onChange(data.projects);
        }
      }
      next();
    });
    document.head.append(script);
  };
  window.setTimeout(poll, every);
}
