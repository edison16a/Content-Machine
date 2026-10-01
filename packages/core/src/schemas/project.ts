import { z } from 'zod';
import {
  handlesSchema,
  projectNameSchema,
  schemaVersion,
  slotsSchema,
  sourcePlatformSchema,
  staggerSchema,
  timeZoneSchema,
  weekStartSchema,
} from './common.js';

/** `projects/<name>/project.json`: per-project settings that override config. */
export const projectSchema = z.object({
  schemaVersion,
  name: projectNameSchema,
  channel: z.string().default(''),
  sourcePlatform: sourcePlatformSchema.default('youtube'),
  account: z.string().min(1).default('default'),
  timezone: timeZoneSchema,
  weekStartsOn: weekStartSchema.default('monday'),
  slots: slotsSchema,
  stagger: staggerSchema,
  handles: handlesSchema.default({ tiktok: '', instagram: '', youtube: '' }),
});

export type Project = z.output<typeof projectSchema>;
