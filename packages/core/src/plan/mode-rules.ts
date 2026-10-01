import type { Plan, PlanItem } from '../schemas/index.js';
import { checkAccent, type SourceDurations } from './common-rules.js';
import { IssueList, secs } from './issues.js';
import { CONTIGUITY_TOLERANCE, SOURCE_END_TOLERANCE } from './rules.js';

function itemsBySource(plan: Plan): Map<string, PlanItem[]> {
  const groups = new Map<string, PlanItem[]>();
  for (const item of plan.items) {
    const group = groups.get(item.source) ?? [];
    group.push(item);
    groups.set(item.source, group);
  }
  return groups;
}

/** Sequential text lives on the source so it cannot drift between parts. */
function checkSequentialText(plan: Plan, issues: IssueList): void {
  for (const source of plan.sources) {
    if (source.title === undefined || source.accent === undefined) {
      issues.error('E_PLAN_INVALID', `Source ${source.file} needs a title and an accent in Sequential mode.`);
    } else {
      checkAccent(`Source ${source.file}`, source.title, source.accent, issues);
    }
  }
  for (const item of plan.items) {
    if (item.title !== undefined || item.accent !== undefined) {
      issues.error('E_PLAN_INVALID', `Item ${item.id}: Sequential parts take their title from the source.`, item.id);
    }
  }
}

/**
 * Sequential parts of a source must tile it exactly: first starts at 0, each
 * starts where the previous ended, the last ends at the source's end.
 */
export function checkSequential(plan: Plan, durations: SourceDurations, issues: IssueList): void {
  checkSequentialText(plan, issues);
  for (const [file, items] of itemsBySource(plan)) {
    const first = items[0];
    if (first !== undefined && first.start > CONTIGUITY_TOLERANCE) {
      issues.error('E_PLAN_GAP', `Item ${first.id} starts at ${secs(first.start)}; the first part must start at 0.`, first.id);
    }
    items.forEach((item, index) => {
      const previous = items[index - 1];
      if (previous === undefined) return;
      const delta = item.start - previous.end;
      if (delta > CONTIGUITY_TOLERANCE) {
        issues.error('E_PLAN_GAP', `Gap of ${secs(delta)} between items ${previous.id} and ${item.id}.`, item.id);
      } else if (delta < -CONTIGUITY_TOLERANCE) {
        issues.error('E_PLAN_OVERLAP', `Items ${previous.id} and ${item.id} overlap by ${secs(-delta)}.`, item.id);
      }
    });
    const last = items[items.length - 1];
    const duration = durations[file];
    if (last !== undefined && duration !== undefined && duration - last.end > SOURCE_END_TOLERANCE) {
      issues.error(
        'E_PLAN_GAP',
        `Item ${last.id} ends at ${secs(last.end)} but ${file} runs to ${secs(duration)}; cover the whole video.`,
        last.id,
      );
    }
  }
}

/** Clips need their own text, and clips from one source must not overlap. */
export function checkClip(plan: Plan, issues: IssueList): void {
  for (const item of plan.items) {
    if (item.title === undefined || item.accent === undefined) {
      issues.error('E_PLAN_INVALID', `Item ${item.id} needs its own title and accent in Clip mode.`, item.id);
    } else {
      checkAccent(`Item ${item.id}`, item.title, item.accent, issues, item.id);
    }
  }
  for (const items of itemsBySource(plan).values()) {
    const sorted = [...items].sort((a, b) => a.start - b.start);
    sorted.forEach((item, index) => {
      const previous = sorted[index - 1];
      if (previous !== undefined && item.start < previous.end - CONTIGUITY_TOLERANCE) {
        issues.error('E_PLAN_OVERLAP', `Clips ${previous.id} and ${item.id} overlap.`, item.id);
      }
    });
  }
}
