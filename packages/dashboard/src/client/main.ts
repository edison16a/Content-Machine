import { mountApp, type App } from './app.js';
import { replace } from './lib/dom.js';
import { readSource, watchLive } from './lib/live-source.js';
import { chooseProject, projectFromHash } from './lib/projects.js';
import { load } from './lib/storage.js';
import { waitingState } from './views/waiting.js';

/**
 * Starts the dashboard. A project's dashboard.html shows its baked in data.
 * The root index.html shows every project and keeps rereading the data
 * file, so it can stay open forever and still be current.
 */
function boot(): void {
  const source = readSource();
  const live = source.kind === 'live';
  const root = document.getElementById('app') ?? document.body;
  const wanted = projectFromHash(window.location.hash) ?? load('project') ?? undefined;
  let app: App | undefined;

  const start = (projects: typeof source.projects): void => {
    const first = chooseProject(projects, wanted);
    if (first === undefined) {
      replace(root, waitingState());
      return;
    }
    app = mountApp(root, first, { live, projects });
  };

  start(source.projects);
  if (live) {
    watchLive((projects) => {
      if (app === undefined) start(projects);
      else app.setProjects(projects);
    });
  }
  document.documentElement.classList.add('is-ready');
}

boot();
