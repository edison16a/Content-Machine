import { ValidationError, type Issue } from '../errors/index.js';
import type { Platform, Schedule, Status } from '../schemas/index.js';

/**
 * Allowed status moves. Posting is one way (queued, scheduled, posted); any
 * state can fail, and a failure can be retried by going back to queued.
 */
const ALLOWED: Readonly<Record<Status, readonly Status[]>> = {
  queued: ['scheduled', 'failed'],
  scheduled: ['posted', 'failed'],
  posted: ['failed'],
  failed: ['queued'],
};

export function canTransition(from: Status, to: Status): boolean {
  return ALLOWED[from].includes(to);
}

/** One recorded status change, as written to schedule-history.log. */
export interface StatusChange {
  at: string;
  itemId: number;
  platform: Platform;
  from: Status;
  to: Status;
  note: string;
}

export interface StatusRequest {
  itemIds: readonly number[];
  platforms: readonly Platform[];
  status: Status;
  note: string;
  at: string;
}

/**
 * Applies a status change to every requested item and platform. All or
 * nothing: if any move is not allowed, nothing changes and every bad move is
 * listed. Setting a status an entry already has is a quiet no-op.
 */
export function applyStatus(
  schedule: Schedule,
  request: StatusRequest,
): { schedule: Schedule; changes: StatusChange[] } {
  const issues: Issue[] = [];
  const changes: StatusChange[] = [];
  const next = structuredClone(schedule);
  for (const itemId of request.itemIds) {
    const item = next.items.find((candidate) => candidate.id === itemId);
    if (item === undefined) {
      issues.push({
        code: 'E_ITEM_NOT_FOUND',
        message: `Item ${itemId} is not in the schedule.`,
        itemId,
      });
      continue;
    }
    for (const platform of request.platforms) {
      const entry = item.platforms[platform];
      if (entry.status === request.status) continue;
      if (!canTransition(entry.status, request.status)) {
        issues.push({
          code: 'E_STATUS_TRANSITION',
          message: `Item ${itemId} on ${platform} cannot go from ${entry.status} to ${request.status}.`,
          itemId,
        });
        continue;
      }
      changes.push({
        at: request.at,
        itemId,
        platform,
        from: entry.status,
        to: request.status,
        note: request.note,
      });
      entry.status = request.status;
      if (request.note !== '') entry.note = request.note;
    }
  }
  if (issues.length > 0) {
    throw new ValidationError(
      issues[0]?.code ?? 'E_STATUS_TRANSITION',
      `${issues.length} status change(s) refused.`,
      {
        hint: 'Allowed: queued to scheduled to posted, anything to failed, failed back to queued.',
        issues,
      },
    );
  }
  return { schedule: next, changes };
}

/** One line for plan/schedule-history.log. Tab separated so it greps well. */
export function formatHistoryLine(change: StatusChange): string {
  const note = change.note.replace(/\s+/g, ' ').trim();
  return [
    change.at,
    `item=${change.itemId}`,
    `platform=${change.platform}`,
    `from=${change.from}`,
    `to=${change.to}`,
    `note=${note}`,
  ].join('\t');
}
