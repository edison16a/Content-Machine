import { ValidationError, type ErrorCode, type Issue } from '../errors/index.js';
import type { Plan } from '../schemas/index.js';
import { checkIds, checkSources, checkTiming, type SourceDurations } from './common-rules.js';
import { IssueList } from './issues.js';
import { checkClip, checkSequential } from './mode-rules.js';

export interface PlanReport {
  errors: Issue[];
  warnings: Issue[];
}

/** Checks a parsed plan against the source durations. Returns every problem. */
export function validatePlan(plan: Plan, durations: SourceDurations): PlanReport {
  const issues = new IssueList();
  checkIds(plan, issues);
  checkSources(plan, durations, issues);
  for (const item of plan.items) checkTiming(plan, item, durations, issues);
  if (plan.mode === 'sequential') checkSequential(plan, durations, issues);
  else checkClip(plan, issues);
  return { errors: issues.errors, warnings: issues.warnings };
}

/** Picks the error code: the shared code when all issues agree, else the generic one. */
export function summaryCode(issues: readonly Issue[], fallback: ErrorCode): ErrorCode {
  const first = issues[0]?.code;
  return first !== undefined && issues.every((issue) => issue.code === first) ? first : fallback;
}

/** Like validatePlan but throws a ValidationError listing every problem. */
export function assertValidPlan(plan: Plan, durations: SourceDurations): PlanReport {
  const report = validatePlan(plan, durations);
  if (report.errors.length > 0) {
    throw new ValidationError(
      summaryCode(report.errors, 'E_PLAN_INVALID'),
      `The plan has ${report.errors.length} problem(s).`,
      { hint: 'Fix each listed item in plan/plan.json, then run the command again.', issues: report.errors },
    );
  }
  return report;
}
