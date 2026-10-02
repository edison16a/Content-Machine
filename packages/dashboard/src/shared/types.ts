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
}

/** Display names, kept here so the generator and client agree. */
export const PLATFORM_NAMES: Record<DashboardPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

/** id of the script tag holding the JSON data. */
export const DATA_ELEMENT_ID = 'cm-data';
