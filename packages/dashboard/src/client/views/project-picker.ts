import type { DashboardData } from '../../shared/types.js';
import type { Context } from '../context.js';
import { h } from '../lib/dom.js';

/**
 * A plain <select> for switching projects on the live index. It hides itself
 * when there is only one project, so the common case stays uncluttered.
 */
export function renderProjectPicker(
  ctx: Context,
  onPick: (name: string) => void,
): { element: HTMLElement; update: (projects: readonly DashboardData[]) => void } {
  const select = h('select', {
    class: 'project-select',
    'aria-label': 'Project',
    on: { change: () => onPick(select.value) },
  });
  const element = h('label', { class: 'project-picker', hidden: true }, select);
  const update = (projects: readonly DashboardData[]): void => {
    select.replaceChildren(
      ...projects.map((project) =>
        h('option', { value: project.project, text: projectLabel(project) }),
      ),
    );
    select.value = ctx.data.project;
    element.hidden = projects.length < 2;
  };
  return { element, update };
}

/** "tiny-house (Example Channel)", or just the folder name when there is no channel. */
function projectLabel(project: DashboardData): string {
  return project.channel === '' ? project.project : `${project.project} (${project.channel})`;
}
