import { z } from 'zod';
import { platformSchema, projectNameSchema, schemaVersion } from './common.js';

const count = z.number().int().min(0);

/** An ISO 8601 timestamp with a zone, like "2026-10-02T17:00:00Z". */
export const isoTimestampSchema = z.iso.datetime({ offset: true });

/**
 * One reading of one video's numbers on one platform. Readings are only ever
 * appended, so the file doubles as the history the dashboard graphs.
 */
export const statsSnapshotSchema = z.object({
  at: isoTimestampSchema,
  platform: platformSchema,
  itemId: z.number().int().positive(),
  /** The title as it appeared on the platform, kept so a match can be checked later. */
  title: z.string(),
  views: count,
  likes: count,
  comments: count,
  shares: count,
});
export type StatsSnapshot = z.output<typeof statsSnapshotSchema>;

/** `plan/stats.json`: owned by the `stats` command. Never edit it by hand. */
export const statsSchema = z.object({
  schemaVersion,
  project: projectNameSchema,
  snapshots: z.array(statsSnapshotSchema),
});
export type Stats = z.output<typeof statsSchema>;

/**
 * What `stats --import` reads: one row per video per platform, usually
 * copied off each platform's analytics page. A row names its video by
 * `item` id or by `title`, which is matched against the post titles.
 */
export const statsImportRowSchema = z
  .object({
    platform: platformSchema,
    item: z.number().int().positive().optional(),
    title: z.string().min(1).optional(),
    views: count,
    likes: count.default(0),
    comments: count.default(0),
    shares: count.default(0),
    at: isoTimestampSchema.optional(),
  })
  .refine((row) => row.item !== undefined || row.title !== undefined, {
    message: 'Give each row an item id or a title.',
  });
export type StatsImportRow = z.output<typeof statsImportRowSchema>;

export const statsImportSchema = z.array(statsImportRowSchema).min(1);
