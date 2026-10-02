import type { DashboardData } from '../../shared/types.js';

/** What `project` holds in the combined view of every project. */
export const ALL_PROJECTS = '*';

/**
 * Every project on one calendar. Items keep their own dates, times and
 * statuses; only their slot number is redone, because two projects can use
 * different slot times. The combined view's slots are every distinct time
 * across projects, in order, and each video lands on the row of its own
 * time. Settings that have to be single (time zone, week start, logos) come
 * from the project updated most recently, which is almost always the one in
 * use. Statistics are simply put together; each reading is keyed to its
 * project, so nothing collides.
 */
export function mergeProjects(projects: readonly DashboardData[]): DashboardData {
  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const base = sorted[0];
  if (base === undefined) throw new Error('mergeProjects needs at least one project');
  const slots = [...new Set(projects.flatMap((project) => project.slots))].sort();
  const items = projects.flatMap((project) =>
    project.items.map((item) => {
      // An item past the end of its project's slots goes to the first slot,
      // the same fallback the scheduler uses for its posting time.
      const time = project.slots[item.slot] ?? project.slots[0];
      return { ...item, slot: time === undefined ? 0 : slots.indexOf(time) };
    }),
  );
  return {
    ...base,
    project: ALL_PROJECTS,
    channel: '',
    slots,
    // Older projects first, so the newest project's handles win.
    handles: [...sorted]
      .reverse()
      .reduce<DashboardData['handles']>((all, project) => ({ ...all, ...project.handles }), {}),
    items,
    stats: {
      rates: base.stats.rates,
      sample: projects.some((project) => project.stats.sample),
      snapshots: projects.flatMap((project) => project.stats.snapshots),
    },
  };
}
