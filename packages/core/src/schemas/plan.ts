import { z } from 'zod';
import { fileNameSchema, hexColorSchema, schemaVersion, sourcePlatformSchema } from './common.js';

export const PLAN_MODES = ['sequential', 'clip'] as const;
export const planModeSchema = z.enum(PLAN_MODES);
export type PlanMode = z.infer<typeof planModeSchema>;

/** One long input video. In Sequential mode its title goes on every part. */
export const planSourceSchema = z.object({
  file: fileNameSchema,
  channel: z.string().min(1),
  platform: sourcePlatformSchema,
  title: z.string().min(1).optional(),
  accent: z.string().min(1).optional(),
});
export type PlanSource = z.infer<typeof planSourceSchema>;

/**
 * One output video. `id` is permanent: it names `videos/NNN.mp4` and is never
 * renumbered once rendered, so plans can only grow by appending.
 */
export const planItemSchema = z.object({
  id: z.number().int().min(1).max(999),
  source: fileNameSchema,
  start: z.number().min(0),
  end: z.number().positive(),
  note: z.string().optional(),
  title: z.string().min(1).optional(),
  accent: z.string().min(1).optional(),
  accentColor: hexColorSchema.optional(),
});
export type PlanItem = z.infer<typeof planItemSchema>;

/** `plan/plan.json`: the cut decisions Claude writes. */
export const planSchema = z.object({
  schemaVersion,
  mode: planModeSchema,
  accentColor: hexColorSchema.default('#FF8A1F'),
  sources: z.array(planSourceSchema).min(1),
  items: z.array(planItemSchema),
});
export type Plan = z.output<typeof planSchema>;
