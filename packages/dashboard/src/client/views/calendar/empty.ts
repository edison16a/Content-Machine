import { h } from '../../lib/dom.js';
import { icon } from '../../lib/icons.js';
import { ALL_PROJECTS } from '../../lib/merge.js';

/** Shown instead of the calendar when nothing has been scheduled. */
export function emptyState(project: string): HTMLElement {
  // An empty project name is the live index before any project exists;
  // ALL_PROJECTS is every project together, so no single name fits the command.
  const text =
    project === ''
      ? 'Ask Claude to make your first videos. Keep this page open: it fills in by itself.'
      : project === ALL_PROJECTS
        ? 'Render and schedule videos in any project, then this calendar fills in: npm run cm -- schedule <project>'
        : `Render and schedule videos, then this calendar fills in: npm run cm -- schedule ${project}`;
  return h(
    'div',
    { class: 'empty' },
    icon('film', 'icon icon-xl'),
    h('h2', { text: project === '' ? 'No projects yet' : 'Nothing scheduled yet' }),
    h('p', { text }),
  );
}
