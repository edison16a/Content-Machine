import type { Platform, Stats, StatsImportRow, StatsSnapshot } from '../schemas/index.js';
import { matchTitle, type MatchCandidate } from './match.js';

/** What happened to one imported row, so the CLI can say exactly what to fix. */
export type RowOutcome =
  | { row: number; kind: 'recorded'; platform: Platform; itemId: number }
  | { row: number; kind: 'unmatched'; platform: Platform; title: string }
  | { row: number; kind: 'ambiguous'; platform: Platform; title: string; itemIds: number[] }
  | { row: number; kind: 'unknown-item'; platform: Platform; itemId: number };

export interface RecordInput {
  project: string;
  existing: Stats | undefined;
  rows: readonly StatsImportRow[];
  candidates: readonly MatchCandidate[];
  /** When the readings were taken, unless a row says otherwise. */
  now: string;
}

/** Resolves a row to an item id: an explicit id wins, otherwise the title is matched. */
function resolve(
  row: StatsImportRow,
  index: number,
  candidates: readonly MatchCandidate[],
): RowOutcome {
  const base = { row: index + 1, platform: row.platform };
  if (row.item !== undefined) {
    return candidates.some((c) => c.id === row.item)
      ? { ...base, kind: 'recorded', itemId: row.item }
      : { ...base, kind: 'unknown-item', itemId: row.item };
  }
  const title = row.title ?? '';
  const match = matchTitle(title, row.platform, candidates, row.postedOn);
  if (match.kind === 'matched') return { ...base, kind: 'recorded', itemId: match.itemId };
  if (match.kind === 'ambiguous')
    return { ...base, kind: 'ambiguous', title, itemIds: match.itemIds };
  return { ...base, kind: 'unmatched', title };
}

/**
 * Appends one reading per matched row. Earlier readings are kept as they
 * are: they are the history behind the graphs. Rows that do not match are
 * reported and left out, never guessed.
 */
export function recordStats(input: RecordInput): { stats: Stats; outcomes: RowOutcome[] } {
  const outcomes = input.rows.map((row, index) => resolve(row, index, input.candidates));
  const added: StatsSnapshot[] = [];
  for (const [index, outcome] of outcomes.entries()) {
    const row = input.rows[index];
    if (outcome.kind !== 'recorded' || row === undefined) continue;
    const candidate = input.candidates.find((c) => c.id === outcome.itemId);
    added.push({
      at: row.at ?? input.now,
      platform: row.platform,
      itemId: outcome.itemId,
      title: row.title ?? candidate?.postTitle ?? '',
      views: row.views,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
    });
  }
  const previous = input.existing?.snapshots ?? [];
  return {
    stats: { schemaVersion: 1, project: input.project, snapshots: [...previous, ...added] },
    outcomes,
  };
}
