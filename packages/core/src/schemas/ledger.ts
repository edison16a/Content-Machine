import { z } from 'zod';
import { localDateSchema, projectNameSchema, schemaVersion } from './common.js';

/** One taken posting slot. Slots are shared per account across projects. */
export const ledgerEntrySchema = z.object({
  account: z.string().min(1),
  date: localDateSchema,
  slot: z.number().int().min(0),
  project: projectNameSchema,
  itemId: z.number().int().min(1),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

/** `schedule-ledger.json` at the repo root. Gitignored machine state. */
export const ledgerSchema = z.object({
  schemaVersion,
  entries: z.array(ledgerEntrySchema),
});
export type Ledger = z.infer<typeof ledgerSchema>;
