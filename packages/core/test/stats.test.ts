import { describe, expect, it } from 'vitest';
import {
  matchTitle,
  normalizeTitle,
  recordStats,
  statsImportSchema,
  type MatchCandidate,
} from '@content-machine/core';

function candidate(
  id: number,
  postTitle: string,
  date = '2026-10-02',
  tiktok = '',
): MatchCandidate {
  return {
    id,
    postTitle,
    captions: { tiktok, instagram: '', youtube: '' },
    dates: { tiktok: date, instagram: date, youtube: date },
  };
}

const clips = [
  candidate(1, 'MrBeast $10 Million Puzzle Challenge'),
  candidate(
    2,
    'He Missed The Jump By One Inch',
    '2026-10-02',
    'He missed by ONE inch 😱 #parkour #fail',
  ),
  candidate(3, 'The Final Clue Nobody Could Solve'),
];

describe('normalizeTitle', () => {
  it('drops case, accents, emojis, hashtags, mentions and punctuation', () => {
    expect(normalizeTitle('Crème BRÛLÉE!!! 🔥 #food @chef')).toBe('creme brulee');
  });
});

describe('matchTitle', () => {
  it('matches exact titles after normalizing', () => {
    expect(matchTitle('mrbeast $10 million puzzle challenge!', 'youtube', clips)).toEqual({
      kind: 'matched',
      itemId: 1,
    });
  });

  it('matches titles the platform cut short, and TikTok captions', () => {
    expect(matchTitle('The Final Clue Nobody Co...', 'youtube', clips)).toMatchObject({
      itemId: 3,
    });
    expect(matchTitle('He missed by ONE inch 😱', 'tiktok', clips)).toMatchObject({ itemId: 2 });
  });

  it('allows a few missing words', () => {
    expect(matchTitle('Missed The Jump By One Inch', 'youtube', clips)).toMatchObject({
      itemId: 2,
    });
  });

  it('refuses short or unrelated titles', () => {
    expect(matchTitle('The', 'youtube', clips)).toEqual({ kind: 'none' });
    expect(matchTitle('Cooking pasta at home', 'youtube', clips)).toEqual({ kind: 'none' });
    expect(matchTitle('🔥🔥', 'youtube', clips)).toEqual({ kind: 'none' });
  });

  it('uses the posting date to tell Sequential parts apart', () => {
    const parts = [
      candidate(1, 'How We Built A Tiny House', '2026-10-01'),
      candidate(2, 'How We Built A Tiny House', '2026-10-02'),
    ];
    expect(matchTitle('How We Built A Tiny House', 'tiktok', parts)).toEqual({
      kind: 'ambiguous',
      itemIds: [1, 2],
    });
    expect(matchTitle('How We Built A Tiny House', 'tiktok', parts, '2026-10-02')).toEqual({
      kind: 'matched',
      itemId: 2,
    });
    expect(matchTitle('How We Built A Tiny House', 'tiktok', parts, '2026-12-25')).toMatchObject({
      kind: 'ambiguous',
    });
  });
});

describe('recordStats', () => {
  it('appends matched rows and reports the rest', () => {
    const rows = statsImportSchema.parse([
      { platform: 'tiktok', title: 'He missed by ONE inch', views: 1200, likes: 90 },
      { platform: 'youtube', item: 3, views: 50, at: '2026-10-01T10:00:00Z' },
      { platform: 'youtube', item: 99, views: 1 },
      { platform: 'instagram', title: 'Something else entirely', views: 5 },
    ]);
    const existing = {
      schemaVersion: 1 as const,
      project: 'clips',
      snapshots: [
        {
          at: '2026-09-30T10:00:00Z',
          platform: 'tiktok' as const,
          itemId: 2,
          title: 'old',
          views: 10,
          likes: 1,
          comments: 0,
          shares: 0,
        },
      ],
    };
    const { stats, outcomes } = recordStats({
      project: 'clips',
      existing,
      rows,
      candidates: clips,
      now: '2026-10-02T12:00:00Z',
    });
    expect(outcomes.map((o) => o.kind)).toEqual([
      'recorded',
      'recorded',
      'unknown-item',
      'unmatched',
    ]);
    expect(stats.snapshots).toHaveLength(3);
    expect(stats.snapshots[1]).toMatchObject({
      at: '2026-10-02T12:00:00Z',
      itemId: 2,
      views: 1200,
      likes: 90,
      comments: 0,
    });
    expect(stats.snapshots[2]).toMatchObject({
      at: '2026-10-01T10:00:00Z',
      title: 'The Final Clue Nobody Could Solve',
    });
  });

  it('requires an item id or a title on every row', () => {
    expect(statsImportSchema.safeParse([{ platform: 'tiktok', views: 1 }]).success).toBe(false);
    expect(statsImportSchema.safeParse([]).success).toBe(false);
  });
});
