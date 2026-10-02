import { z } from 'zod';
import {
  handlesSchema,
  hexColorSchema,
  schemaVersion,
  slotsSchema,
  staggerSchema,
  timeZoneSchema,
  weekStartSchema,
} from './common.js';

export const brandSchema = z.object({
  font: z.string().min(1),
  textColor: hexColorSchema,
  accentColor: hexColorSchema,
});
export type Brand = z.infer<typeof brandSchema>;

export const layoutConstantsSchema = z.object({
  canvasWidth: z.number().int().positive(),
  canvasHeight: z.number().int().positive(),
  safeTop: z.number().int().min(0),
  safeBottom: z.number().int().positive(),
  gap: z.number().int().min(0),
});
export type LayoutConstants = z.infer<typeof layoutConstantsSchema>;

/**
 * Estimated payout in US dollars per 1,000 views, per platform. These only
 * feed the income estimate on the dashboard; nobody is paid from them.
 */
export const ratesSchema = z.object({
  tiktok: z.number().min(0),
  instagram: z.number().min(0),
  youtube: z.number().min(0),
});
export type Rates = z.infer<typeof ratesSchema>;

/** `config/defaults.json`, committed. Shared starting point for every project. */
export const configSchema = z.object({
  schemaVersion,
  slots: slotsSchema,
  stagger: staggerSchema,
  weekStartsOn: weekStartSchema,
  timezone: timeZoneSchema.optional(),
  account: z.string().min(1),
  handles: handlesSchema,
  brand: brandSchema,
  layout: layoutConstantsSchema,
  maxDurationSeconds: z.number().positive().max(59.98),
  repoUrl: z.url(),
  rates: ratesSchema,
});
export type Config = z.output<typeof configSchema>;

/** `config/local.json`, gitignored. Any subset of the defaults. */
export const localConfigSchema = z.object({
  schemaVersion: schemaVersion.optional(),
  slots: slotsSchema.optional(),
  stagger: staggerSchema.partial().optional(),
  weekStartsOn: weekStartSchema.optional(),
  timezone: timeZoneSchema.optional(),
  account: z.string().min(1).optional(),
  handles: handlesSchema.partial().optional(),
  brand: brandSchema.partial().optional(),
  rates: ratesSchema.partial().optional(),
});
export type LocalConfig = z.output<typeof localConfigSchema>;
