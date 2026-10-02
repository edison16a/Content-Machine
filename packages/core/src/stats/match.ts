import type { Platform } from '../schemas/index.js';

/** What a video is known by: its post title and the caption on each platform. */
export interface MatchCandidate {
  id: number;
  postTitle: string;
  captions: Record<Platform, string>;
  /** Local posting date per platform, "YYYY-MM-DD". */
  dates: Record<Platform, string>;
}

export type MatchResult =
  { kind: 'matched'; itemId: number } | { kind: 'ambiguous'; itemIds: number[] } | { kind: 'none' };

/**
 * Lowercase words only. Platforms add or drop emojis, hashtags, mentions,
 * punctuation and accents, so none of those can count when comparing.
 */
export function normalizeTitle(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[#@][\p{L}\p{N}_]+/gu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Shortest text we accept as a prefix match; shorter would match too much. */
const MIN_PREFIX = 12;
/** Share of the recorded words that must appear in a candidate for a loose match. */
const MIN_OVERLAP = 0.8;
/** A loose match on one or two words ("The", "Part two") would match almost anything. */
const MIN_WORDS = 3;

function wordOverlap(recorded: string, candidate: string): number {
  const words = recorded.split(' ').filter(Boolean);
  if (words.length < MIN_WORDS) return 0;
  const have = new Set(candidate.split(' '));
  return words.filter((word) => have.has(word)).length / words.length;
}

/**
 * How well a recorded title fits one candidate text, from 3 (identical) to
 * 0 (no match). Platforms cut long titles short ("How We Built A Tiny
 * Ho..."), and TikTok shows the caption instead of a title, so a prefix of
 * either one counts as nearly as good as an exact match.
 */
function score(recorded: string, text: string): number {
  if (text === '') return 0;
  if (recorded === text) return 3;
  const shorter = recorded.length < text.length ? recorded : text;
  const longer = shorter === recorded ? text : recorded;
  if (shorter.length >= MIN_PREFIX && longer.startsWith(shorter)) return 2;
  return wordOverlap(recorded, text) >= MIN_OVERLAP ? 1 : 0;
}

/**
 * Finds the video a recorded title belongs to. The best scoring tier wins.
 * Sequential parts all share one title, so when several videos tie, the
 * posting date narrows it down; if that is not enough the result says which
 * ids tied, so the caller can ask for an item id instead of guessing.
 */
export function matchTitle(
  title: string,
  platform: Platform,
  candidates: readonly MatchCandidate[],
  postedOn?: string,
): MatchResult {
  const recorded = normalizeTitle(title);
  if (recorded === '') return { kind: 'none' };
  let best = 0;
  let ids: number[] = [];
  for (const candidate of candidates) {
    const value = Math.max(
      score(recorded, normalizeTitle(candidate.postTitle)),
      score(recorded, normalizeTitle(candidate.captions[platform])),
    );
    if (value > best) {
      best = value;
      ids = [candidate.id];
    } else if (value === best && value > 0) {
      ids.push(candidate.id);
    }
  }
  if (postedOn !== undefined && ids.length > 1) {
    const dated = ids.filter(
      (id) => candidates.find((c) => c.id === id)?.dates[platform] === postedOn,
    );
    if (dated.length > 0) ids = dated;
  }
  if (ids.length === 1 && ids[0] !== undefined) return { kind: 'matched', itemId: ids[0] };
  return ids.length === 0 ? { kind: 'none' } : { kind: 'ambiguous', itemIds: ids };
}
