import type { Schedule } from '@content-machine/core';
import type { DashboardData, DashboardLogos, DashboardStats } from '../shared/types.js';

export interface DashboardExtras {
  sourcePlatform: string;
  logos: DashboardLogos;
  repoUrl: string;
  stats: DashboardStats;
}

/**
 * Maps schedule.json to the data the page embeds. Only what the page shows
 * is copied, so the HTML never carries anything unexpected.
 */
export function toDashboardData(schedule: Schedule, extras: DashboardExtras): DashboardData {
  return {
    project: schedule.project,
    channel: schedule.channel,
    sourcePlatform: extras.sourcePlatform,
    timezone: schedule.timezone,
    weekStartsOn: schedule.weekStartsOn,
    slots: [...schedule.slots],
    stagger: { ...schedule.stagger },
    handles: Object.fromEntries(
      Object.entries(schedule.handles).filter(([, v]) => v !== undefined && v !== ''),
    ),
    updatedAt: schedule.updatedAt,
    items: schedule.items.map((item) => ({
      id: item.id,
      video: item.video,
      thumb: item.thumb,
      duration: item.duration,
      postTitle: item.postTitle,
      captions: { ...item.captions },
      source: item.source,
      sourceStart: item.sourceStart,
      sourceEnd: item.sourceEnd,
      note: item.note,
      date: item.date,
      slot: item.slot,
      platforms: {
        tiktok: { ...item.platforms.tiktok },
        instagram: { ...item.platforms.instagram },
        youtube: { ...item.platforms.youtube },
      },
    })),
    logos: extras.logos,
    repoUrl: extras.repoUrl,
    stats: extras.stats,
  };
}
