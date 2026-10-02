import type { DashboardData } from '../../../shared/types.js';
import { ALL_PROJECTS } from '../../lib/merge.js';
import { inPostingOrder } from '../../lib/selectors.js';
import type { DropdownOption } from '../common/dropdown.js';

const count = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The choices in Settings: every project together (the default), then each
 * project with its first video's poster so it is easy to recognise.
 */
export function projectOptions(projects: readonly DashboardData[]): DropdownOption[] {
  const videos = projects.reduce((sum, project) => sum + project.items.length, 0);
  return [
    {
      value: ALL_PROJECTS,
      label: 'All projects',
      detail: `${count(videos, 'video')}, ${count(projects.length, 'project')}`,
      mark: 'grid',
    },
    ...[...projects]
      .sort((a, b) => a.project.localeCompare(b.project))
      .map((project) => {
        const first = inPostingOrder(project.items)[0];
        const channel = project.channel === '' ? '' : `${project.channel}, `;
        return {
          value: project.project,
          label: project.project,
          detail: `${channel}${count(project.items.length, 'video')}`,
          ...(first === undefined ? { mark: 'film' as const } : { thumb: first.thumb }),
        };
      }),
  ];
}
