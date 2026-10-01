import { ValidationError, type Issue } from '../errors/index.js';
import type { Plan } from '../schemas/index.js';
import { planKeyFor } from './resolve.js';

/** What an item looked like when it was rendered. */
export interface LockedItem {
  id: number;
  planKey: string;
}

/**
 * Lists rendered items that the plan has since changed or dropped. Published
 * ids are append-only, so these are refused unless the user passes --force.
 */
export function findLockedChanges(plan: Plan, locked: readonly LockedItem[]): Issue[] {
  const issues: Issue[] = [];
  for (const record of locked) {
    const item = plan.items.find((candidate) => candidate.id === record.id);
    if (item === undefined) {
      issues.push({
        code: 'E_PLAN_LOCKED',
        message: `Item ${record.id} was rendered but is missing from the plan. Ids are never removed or renumbered.`,
        itemId: record.id,
      });
    } else if (planKeyFor(plan, item) !== record.planKey) {
      issues.push({
        code: 'E_PLAN_LOCKED',
        message: `Item ${record.id} was already rendered and its cut or title changed.`,
        itemId: record.id,
      });
    }
  }
  return issues;
}

/** Throws when locked items changed. Pass `force` to allow it deliberately. */
export function assertNoLockedChanges(
  plan: Plan,
  locked: readonly LockedItem[],
  force: boolean,
): void {
  const issues = findLockedChanges(plan, locked);
  if (issues.length > 0 && !force) {
    throw new ValidationError('E_PLAN_LOCKED', `${issues.length} rendered item(s) changed.`, {
      hint: 'Append new items with new ids instead. To re-render on purpose, run render with --force.',
      issues,
    });
  }
}
