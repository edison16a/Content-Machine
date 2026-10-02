/**
 * The data embedded in dashboard.html. Shared by the generator (Node) and the
 * client (browser), so it is plain types with no imports.
 */

export const DASHBOARD_PLATFORMS = ['tiktok', 'instagram', 'youtube'] as const;
export type DashboardPlatform = (typeof DASHBOARD_PLATFORMS)[number];

export const DASHBOARD_STATUSES = ['queued', 'scheduled', 'posted', 'failed'] as const;
export type DashboardStatus = (typeof DASHBOARD_STATUSES)[number];

export interface DashboardEntry {
  time: string;
  iso: string;
  status: DashboardStatus;
  note: string;
}

export interface DashboardItem {
  id: number;
  /** Relative to dashboard.html, e.g. "videos/001.mp4". */
  video: string;
  thumb: string;
  duration: number;
  postTitle: string;
  captions: Record<DashboardPlatform, string>;
  source: string;
  sourceStart: number;
  sourceEnd: number;
  note: string;
  date: string;
  slot: number;
  platforms: Record<DashboardPlatform, DashboardEntry>;
}

export interface DashboardLogos {
  /** The Content Machine mark, as an SVG data URI. */
  brand: string;
  platforms: Record<DashboardPlatform, string | null>;
  /** Logo of the platform the long videos come from, if known. */
  source: string | null;
}

/** What the statistics section measures, in the order it shows them. */
export const STAT_METRICS = ['views', 'income', 'likes', 'comments', 'shares'] as const;
export type StatMetric = (typeof STAT_METRICS)[number];

/** One recorded reading, as plan/stats.json stores it, minus the platform's title. */
export interface DashboardSnapshot {
  at: string;
  platform: DashboardPlatform;
  itemId: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface DashboardStats {
  /** Estimated US dollars paid per 1,000 views, from config. */
  rates: Record<DashboardPlatform, number>;
  snapshots: DashboardSnapshot[];
  /** True while made-up test data is shown instead of real readings (`testdata on`). */
  sample: boolean;
}

export interface DashboardData {
  project: string;
  channel: string;
  sourcePlatform: string;
  timezone: string;
  weekStartsOn: 'monday' | 'sunday';
  slots: string[];
  stagger: Record<DashboardPlatform, number>;
  handles: Partial<Record<DashboardPlatform, string>>;
  updatedAt: string;
  items: DashboardItem[];
  logos: DashboardLogos;
  repoUrl: string;
  stats: DashboardStats;
}

/** Display names, kept here so the generator and client agree. */
export const PLATFORM_NAMES: Record<DashboardPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

/** id of the script tag holding the JSON data. */
export const DATA_ELEMENT_ID = 'cm-data';

/**
 * The live index (index.html at the repo root) reads every project from one
 * script file instead of embedded JSON. A classic <script src> is the only
 * way a page opened from file:// can pick up new data without a server,
 * since browsers block fetch() there.
 */
export const LIVE_DATA_GLOBAL = '__CONTENT_MACHINE__';

/** Where that file lives, relative to the repo root and to index.html. */
export const LIVE_DATA_FILE = 'projects/dashboard-data.js';

export interface LiveData {
  /**
   * Fingerprint of the dashboard client that wrote this file. When it
   * changes, the open page reloads itself to pick up the new client.
   */
  build: string;
  updatedAt: string;
  /** Media paths in here are relative to the repo root. */
  projects: DashboardData[];
}
