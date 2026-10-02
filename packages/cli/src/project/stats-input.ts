import {
  PLATFORMS,
  UserError,
  parseJsonText,
  statsImportSchema,
  type MatchCandidate,
  type Platform,
  type Schedule,
  type StatsImportRow,
} from '@content-machine/core';
import type { CommandContext } from '../context.js';

/** The flags for recording one reading by hand. */
export interface StatsFlags {
  platform?: Platform;
  title?: string;
  item?: number;
  postedOn?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  import?: string;
}

/** Every scheduled video, in the shape the title matcher needs. */
export function candidatesFrom(schedule: Schedule): MatchCandidate[] {
  return schedule.items.map((item) => ({
    id: item.id,
    postTitle: item.postTitle,
    captions: { ...item.captions },
    // The stored time carries the project's offset, so its first ten
    // characters are the local posting date.
    dates: Object.fromEntries(
      PLATFORMS.map((platform) => [platform, item.platforms[platform].iso.slice(0, 10)]),
    ) as Record<Platform, string>,
  }));
}

/**
 * Turns the command line into import rows: either a JSON file of many rows
 * (what Claude writes after reading each analytics page) or one row from
 * flags. Both go through the same schema, so they are checked the same way.
 */
export async function rowsFrom(ctx: CommandContext, flags: StatsFlags): Promise<StatsImportRow[]> {
  if (flags.import !== undefined) {
    return parseJsonText(statsImportSchema, await ctx.fs.readText(flags.import), flags.import);
  }
  if (flags.platform === undefined || flags.views === undefined) {
    throw new UserError('E_USAGE', 'Recording a reading needs --platform and --views.', {
      hint: 'Example: npm run cm -- stats tiny-house --platform tiktok --title "He Missed The Jump" --views 1200 --likes 90',
    });
  }
  const row = {
    platform: flags.platform,
    views: flags.views,
    likes: flags.likes,
    comments: flags.comments,
    shares: flags.shares,
    item: flags.item,
    title: flags.title,
    postedOn: flags.postedOn,
  };
  const defined = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
  return parseJsonText(statsImportSchema, JSON.stringify([defined]), 'the stats flags');
}
