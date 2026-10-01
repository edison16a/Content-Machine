import { z } from 'zod';
import { captionsSchema } from './metadata.js';
import {
  handlesSchema,
  localDateSchema,
  projectNameSchema,
  schemaVersion,
  slotTimeSchema,
  slotsSchema,
  staggerSchema,
  statusSchema,
  timeZoneSchema,
  weekStartSchema,
} from './common.js';

/** Where one video stands on one platform. */
export const platformEntrySchema = z.object({
  /** Wall-clock time in the project's time zone, slot time plus stagger. */
  time: slotTimeSchema,
  /** The same moment as an ISO 8601 string with its UTC offset. */
  iso: z.string(),
  status: statusSchema,
  note: z.string().default(''),
});
export type PlatformEntry = z.output<typeof platformEntrySchema>;

export const scheduleItemSchema = z.object({
  id: z.number().int().min(1),
  video: z.string(),
  thumb: z.string(),
  duration: z.number().positive(),
  postTitle: z.string(),
  captions: captionsSchema,
  source: z.string(),
  sourceStart: z.number().min(0),
  sourceEnd: z.number().positive(),
  note: z.string().default(''),
  date: localDateSchema,
  slot: z.number().int().min(0),
  platforms: z.object({
    tiktok: platformEntrySchema,
    instagram: platformEntrySchema,
    youtube: platformEntrySchema,
  }),
});
export type ScheduleItem = z.output<typeof scheduleItemSchema>;

/** `plan/schedule.json`: owned by the tool, never edited by hand. */
export const scheduleSchema = z.object({
  schemaVersion,
  project: projectNameSchema,
  channel: z.string(),
  timezone: timeZoneSchema,
  weekStartsOn: weekStartSchema,
  slots: slotsSchema,
  stagger: staggerSchema,
  handles: handlesSchema.partial().default({}),
  updatedAt: z.string(),
  items: z.array(scheduleItemSchema),
});
export type Schedule = z.output<typeof scheduleSchema>;
