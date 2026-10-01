import { z } from 'zod';
import { fileNameSchema, schemaVersion } from './common.js';

/** Final cut times and fingerprint for one rendered item. */
export const renderLogEntrySchema = z.object({
  id: z.number().int().min(1),
  source: fileNameSchema,
  plannedStart: z.number().min(0),
  plannedEnd: z.number().positive(),
  start: z.number().min(0),
  end: z.number().positive(),
  startSnapped: z.boolean(),
  endSnapped: z.boolean(),
  /** The planned cut and text, frozen once rendered. Changing it needs --force. */
  planKey: z.string(),
  /** Hash of everything that shapes the output. A mismatch means re-render. */
  fingerprint: z.string(),
  output: z.string(),
  thumb: z.string(),
  renderedAt: z.string(),
});
export type RenderLogEntry = z.infer<typeof renderLogEntrySchema>;

/** `work/render-log.json`: what was rendered and with which exact cuts. */
export const renderLogSchema = z.object({
  schemaVersion,
  items: z.array(renderLogEntrySchema),
});
export type RenderLog = z.infer<typeof renderLogSchema>;

export const checkResultSchema = z.object({
  id: z.number().int().min(1),
  ok: z.boolean(),
  problems: z.array(z.string()),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  videoCodec: z.string().optional(),
  audioCodec: z.string().optional(),
});
export type CheckResult = z.infer<typeof checkResultSchema>;

/** `work/check.json`: the latest QA run. */
export const checkReportSchema = z.object({
  schemaVersion,
  ok: z.boolean(),
  checkedAt: z.string(),
  items: z.array(checkResultSchema),
  problems: z.array(z.string()),
  sheets: z.array(z.string()),
});
export type CheckReport = z.infer<typeof checkReportSchema>;
