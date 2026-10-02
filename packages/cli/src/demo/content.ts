import type { Captions, PlanSource } from '@content-machine/core';

/**
 * Everything in the demo is made up: fictional channels and titles over
 * synthetic gradient video with a tone track. No real footage, ever.
 */
export interface DemoSource extends PlanSource {
  title: string;
  accent: string;
  colors: string[];
  toneHz: number;
  /** Planned part boundaries in seconds; the last one is the video's end. */
  cuts: number[];
  notes: string[];
  hashtags: Captions;
}

export const DEMO_ACCOUNT = 'demo';
export const DEMO_TIMEZONE = 'America/Los_Angeles';
export const DEMO_HANDLES = {
  tiktok: 'your.tiktok',
  instagram: 'your.instagram',
  youtube: '@your-channel',
};

export const SEQUENTIAL_SOURCES: DemoSource[] = [
  {
    file: 'tiny-house.mp4',
    channel: 'Example Channel',
    platform: 'youtube',
    title: 'How We Built A Tiny House In 30 Days',
    accent: '30 Days',
    colors: ['0F766E', 'F59E0B', '1E3A8A'],
    toneHz: 220,
    cuts: [24, 47, 73, 96, 122, 145, 170, 192, 218, 241, 266, 290],
    notes: [
      'the plan and the budget',
      'clearing the lot',
      'pouring the foundation',
      'the trailer arrives',
      'framing the walls',
      'raising the roof',
      'windows go in',
      'wiring and plumbing',
      'insulation day',
      'the kitchen build',
      'moving in the loft',
      'the final walkthrough',
    ],
    hashtags: {
      tiktok: '#tinyhouse #diybuild #offgrid',
      instagram: '#tinyhouse #tinyliving #diybuild #homebuild',
      youtube: '#tinyhouse #diy',
    },
  },
  {
    file: 'camper-van.mp4',
    channel: 'Example Channel',
    platform: 'youtube',
    title: 'We Restored A 1968 Camper Van',
    accent: '1968',
    colors: ['7C2D12', 'FBBF24', '0C4A6E'],
    toneHz: 260,
    cuts: [22, 46, 69, 93, 116, 140, 163, 188, 210, 235, 258, 282],
    notes: [
      'the barn find',
      'how bad the rust is',
      'stripping the interior',
      'cutting out the floor',
      'new metal goes in',
      'the engine will not start',
      'it starts',
      'paint day',
      'the first drive',
      'building the bed',
      'the pop top',
      'road trip',
    ],
    hashtags: {
      tiktok: '#vanlife #restoration #classiccar',
      instagram: '#vanlife #restoration #campervan #classiccar',
      youtube: '#vanlife #restoration',
    },
  },
];

export const CLIP_SOURCE = {
  file: 'stream.mp4',
  channel: 'Example Streamer',
  platform: 'twitch' as const,
  duration: 120,
  colors: ['4C1D95', 'DB2777', '0EA5E9'],
  toneHz: 300,
  clips: [
    {
      start: 8,
      end: 23,
      title: 'He Missed The Jump By One Inch',
      accent: 'One Inch',
      note: 'reaction peaks at 0:19',
    },
    {
      start: 44,
      end: 58,
      title: 'Nobody Expected The Final Round',
      accent: 'Final Round',
      note: 'the comeback',
    },
    {
      start: 82,
      end: 96,
      title: 'Chat Called It Before He Did',
      accent: 'Chat',
      note: 'chat predicts the ending',
    },
  ],
};

/** Captions in the house structure: one line of context, the credit, then a few tags. */
export function demoCaptions(context: string, credit: string, tags: Captions): Captions {
  const body = (platformTags: string): string => `${context}\nCredit: ${credit}\n${platformTags}`;
  return {
    tiktok: body(tags.tiktok),
    instagram: body(tags.instagram),
    youtube: body(tags.youtube),
  };
}
