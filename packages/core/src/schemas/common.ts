import { z } from 'zod';

/** Current on-disk format version. Every JSON file written by the tool carries it. */
export const SCHEMA_VERSION = 1;
export const schemaVersion = z.literal(SCHEMA_VERSION);

/** The three platforms Content Machine posts to, in display order. */
export const PLATFORMS = ['tiktok', 'instagram', 'youtube'] as const;
export const platformSchema = z.enum(PLATFORMS);
export type Platform = z.infer<typeof platformSchema>;

/** Where the long source video came from. Drives the logo on the credit line. */
export const SOURCE_PLATFORMS = [
  'youtube',
  'twitch',
  'kick',
  'tiktok',
  'instagram',
  'x',
  'facebook',
  'other',
] as const;
export const sourcePlatformSchema = z.enum(SOURCE_PLATFORMS);
export type SourcePlatform = z.infer<typeof sourcePlatformSchema>;

export const STATUSES = ['queued', 'scheduled', 'posted', 'failed'] as const;
export const statusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof statusSchema>;

export const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
export const projectNameSchema = z
  .string()
  .max(64, 'Project names are at most 64 characters.')
  .regex(PROJECT_NAME_PATTERN, 'Use lowercase letters, digits and hyphens, starting with a letter or digit.');

/** "HH:MM" on a 24 hour clock. */
export const slotTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24 hour HH:MM.');

/** A calendar date with no time zone, "YYYY-MM-DD". */
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #FF8A1F.');

/** True when the runtime knows this IANA time zone name. */
export function isValidTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: name });
    return name.length > 0;
  } catch {
    return false;
  }
}

export const timeZoneSchema = z
  .string()
  .refine(isValidTimeZone, 'Use an IANA time zone such as America/Los_Angeles.');

/**
 * A bare file name inside a project folder. Rejecting separators and dot
 * segments here is what stops a plan from reading files outside `source/`.
 */
export const fileNameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine(
    (name) => !/[/\\\0]/.test(name) && name !== '.' && name !== '..',
    'Use a plain file name with no folders.',
  );

export const weekStartSchema = z.enum(['monday', 'sunday']);
export type WeekStart = z.infer<typeof weekStartSchema>;

const staggerMinutes = z.number().int().min(0).max(180);
export const staggerSchema = z.object({
  tiktok: staggerMinutes,
  instagram: staggerMinutes,
  youtube: staggerMinutes,
});
export type Stagger = z.infer<typeof staggerSchema>;

export const handlesSchema = z.object({
  tiktok: z.string().default(''),
  instagram: z.string().default(''),
  youtube: z.string().default(''),
});
export type Handles = z.infer<typeof handlesSchema>;

/** Daily posting times. At least one, unique, ascending. */
export const slotsSchema = z
  .array(slotTimeSchema)
  .min(1)
  .max(12)
  .refine((slots) => slots.every((t, i) => i === 0 || t > (slots[i - 1] ?? '')), {
    message: 'Slots must be unique and in ascending order.',
  });
