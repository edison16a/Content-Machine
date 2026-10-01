import { z } from 'zod';
import { schemaVersion } from './common.js';

/** Captions per platform. Each platform gets its own wording. */
export const captionsSchema = z.object({
  tiktok: z.string(),
  instagram: z.string(),
  youtube: z.string(),
});
export type Captions = z.infer<typeof captionsSchema>;

/** YouTube rejects titles of 100 characters or more. */
export const MAX_POST_TITLE_LENGTH = 99;

export const metadataItemSchema = z.object({
  id: z.number().int().min(1),
  postTitle: z
    .string()
    .min(1)
    .max(MAX_POST_TITLE_LENGTH, 'Post titles must be under 100 characters for YouTube.'),
  captions: captionsSchema,
});
export type MetadataItem = z.infer<typeof metadataItemSchema>;

/** `plan/metadata.json`: post titles and captions, one entry per item id. */
export const metadataSchema = z.object({
  schemaVersion,
  items: z.array(metadataItemSchema),
});
export type Metadata = z.output<typeof metadataSchema>;
