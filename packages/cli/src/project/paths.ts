import { isAbsolute, join, relative, resolve } from 'node:path';
import { UserError, projectNameSchema } from '@content-machine/core';
import { projectDirs, type ProjectDirs } from '@content-machine/render';

/** Every file and folder in a project, in one place so nothing drifts. */
export interface ProjectPaths extends ProjectDirs {
  name: string;
  planDir: string;
  projectJson: string;
  readme: string;
  dashboard: string;
  plan: string;
  metadata: string;
  schedule: string;
  /** Recorded views, likes and so on, appended by the `stats` command. */
  stats: string;
  /** Made-up readings from `testdata on`, kept apart so `off` never touches real ones. */
  sampleStats: string;
  history: string;
  report: string;
  renderLog: string;
  checkReport: string;
  scheduleLock: string;
}

/** Validates a project name. Only lowercase letters, digits and hyphens. */
export function assertProjectName(name: string): string {
  const result = projectNameSchema.safeParse(name);
  if (!result.success) {
    throw new UserError('E_INVALID_PROJECT_NAME', `"${name}" is not a valid project name.`, {
      hint: 'Use lowercase letters, digits and hyphens, starting with a letter or digit, like "tiny-house".',
    });
  }
  return result.data;
}

/**
 * Joins `parts` under `base` and refuses anything that would land outside it,
 * such as "../" segments or absolute paths smuggled in through user input.
 */
export function safeJoin(base: string, ...parts: string[]): string {
  const target = resolve(base, ...parts);
  const rel = relative(resolve(base), target);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new UserError('E_PATH_TRAVERSAL', `The path ${parts.join('/')} points outside ${base}.`, {
      hint: 'Use a plain file name inside the project folder.',
    });
  }
  return target;
}

export function projectPaths(root: string, name: string): ProjectPaths {
  const dir = safeJoin(join(root, 'projects'), assertProjectName(name));
  const planDir = join(dir, 'plan');
  return {
    ...projectDirs(dir),
    name,
    planDir,
    projectJson: join(dir, 'project.json'),
    readme: join(dir, 'README.txt'),
    dashboard: join(dir, 'dashboard.html'),
    plan: join(planDir, 'plan.json'),
    metadata: join(planDir, 'metadata.json'),
    schedule: join(planDir, 'schedule.json'),
    stats: join(planDir, 'stats.json'),
    sampleStats: join(planDir, 'sample-stats.json'),
    history: join(planDir, 'schedule-history.log'),
    report: join(planDir, 'report.md'),
    renderLog: join(dir, 'work', 'render-log.json'),
    checkReport: join(dir, 'work', 'check.json'),
    scheduleLock: join(planDir, '.schedule.lock'),
  };
}

/** The repo-wide ledger of taken slots and its lock. */
export function ledgerPaths(root: string): { ledger: string; lock: string } {
  return {
    ledger: join(root, 'schedule-ledger.json'),
    lock: join(root, 'schedule-ledger.json.lock'),
  };
}
