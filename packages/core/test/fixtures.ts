import type { Plan, PlanItem } from '@content-machine/core';

/** A valid two-part Sequential plan over a 100 second source. */
export function sequentialPlan(items?: PlanItem[]): Plan {
  return {
    schemaVersion: 1,
    mode: 'sequential',
    accentColor: '#FF8A1F',
    sources: [
      {
        file: 'video1.mp4',
        channel: 'Example Channel',
        platform: 'youtube',
        title: 'How We Built A Tiny House In 30 Days',
        accent: '30 Days',
      },
    ],
    items: items ?? [
      { id: 1, source: 'video1.mp4', start: 0, end: 47.3, note: 'premise' },
      { id: 2, source: 'video1.mp4', start: 47.3, end: 100 },
    ],
  };
}

/** A valid Clip plan with two clips. */
export function clipPlan(items?: PlanItem[]): Plan {
  return {
    schemaVersion: 1,
    mode: 'clip',
    accentColor: '#FF8A1F',
    sources: [{ file: 'stream.mp4', channel: 'Example Channel', platform: 'twitch' }],
    items: items ?? [
      {
        id: 1,
        source: 'stream.mp4',
        start: 10,
        end: 30,
        title: 'He Missed By One Inch',
        accent: 'One Inch',
      },
      {
        id: 2,
        source: 'stream.mp4',
        start: 40,
        end: 70,
        title: 'Nobody Expected This Ending',
        accent: 'Ending',
      },
    ],
  };
}
