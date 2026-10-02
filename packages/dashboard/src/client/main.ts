import type { DashboardData } from '../shared/types.js';
import { mountApp, type App } from './app.js';
import { readSource, watchLive } from './lib/live-source.js';
import { chooseProject, placeholderProject, projectFromHash } from './lib/projects.js';
import { load } from './lib/storage.js';

/**
 * Starts the dashboard. A project's dashboard.html shows its baked in data.
 * The root index.html shows every project and keeps rereading the data
 * file, so it can stay open forever and still be current. With no projects
 * yet it still shows the whole dashboard, empty, and fills in by itself.
 */
function boot(): void {
  const source = readSource();
  const live = source.kind === 'live';
  const root = document.getElementById('app') ?? document.body;
  const wanted = projectFromHash(window.location.hash) ?? load('project') ?? undefined;
  // The first poll fires a few seconds after start, long after `app` exists.
  const watch = live
    ? watchLive((projects: DashboardData[]) => app.setProjects(projects))
    : { refresh: () => Promise.resolve() };
  const first = chooseProject(source.projects, wanted) ?? placeholderProject();
  const app: App = mountApp(root, first, {
    live,
    projects: source.projects,
    refresh: watch.refresh,
  });
  document.documentElement.classList.add('is-ready');
}

boot();
