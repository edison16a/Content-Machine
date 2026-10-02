import { SCHEMA_VERSION, type Metadata, type Plan, type PlanItem } from '@content-machine/core';
import { CLIP_SOURCE, SEQUENTIAL_SOURCES, demoCaptions } from './content.js';

/** The Sequential demo plan and its captions: two videos, 24 parts. */
export function sequentialDemo(): { plan: Plan; metadata: Metadata } {
  const items: PlanItem[] = [];
  const meta: Metadata['items'] = [];
  for (const source of SEQUENTIAL_SOURCES) {
    source.cuts.forEach((end, i) => {
      const id = items.length + 1;
      const note = source.notes[i] ?? '';
      items.push({
        id,
        source: source.file,
        start: i === 0 ? 0 : (source.cuts[i - 1] ?? 0),
        end,
        note,
      });
      meta.push({
        id,
        postTitle: source.title,
        captions: demoCaptions(
          `${note.charAt(0).toUpperCase()}${note.slice(1)}.`,
          source.channel,
          source.hashtags,
        ),
      });
    });
  }
  const sources = SEQUENTIAL_SOURCES.map(({ file, channel, platform, title, accent }) => ({
    file,
    channel,
    platform,
    title,
    accent,
  }));
  return {
    plan: {
      schemaVersion: SCHEMA_VERSION,
      mode: 'sequential',
      accentColor: '#FF8A1F',
      sources,
      items,
    },
    metadata: { schemaVersion: SCHEMA_VERSION, items: meta },
  };
}

/** The Clip demo: three moments from a fictional stream. */
export function clipDemo(): { plan: Plan; metadata: Metadata } {
  const tags = {
    tiktok: '#gaming #clips #streamer',
    instagram: '#gaming #clips #streamer #twitch',
    youtube: '#gaming #shorts',
  };
  const items = CLIP_SOURCE.clips.map((clip, i) => ({
    id: i + 1,
    source: CLIP_SOURCE.file,
    ...clip,
  }));
  return {
    plan: {
      schemaVersion: SCHEMA_VERSION,
      mode: 'clip',
      accentColor: '#FF8A1F',
      sources: [
        { file: CLIP_SOURCE.file, channel: CLIP_SOURCE.channel, platform: CLIP_SOURCE.platform },
      ],
      items,
    },
    metadata: {
      schemaVersion: SCHEMA_VERSION,
      items: items.map((item) => ({
        id: item.id,
        postTitle: item.title,
        captions: demoCaptions(
          `${item.note.charAt(0).toUpperCase()}${item.note.slice(1)}.`,
          CLIP_SOURCE.channel,
          tags,
        ),
      })),
    },
  };
}
