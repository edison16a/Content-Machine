import { z } from 'zod';
import { configSchema, localConfigSchema } from './config.js';
import { ledgerSchema } from './ledger.js';
import { metadataSchema } from './metadata.js';
import { planSchema } from './plan.js';
import { projectSchema } from './project.js';
import { checkReportSchema, renderLogSchema } from './render-log.js';
import { scheduleSchema } from './schedule.js';

/** Every on-disk JSON format, by the name used in `docs/schemas/<name>.schema.json`. */
export const SCHEMAS = {
  project: projectSchema,
  plan: planSchema,
  metadata: metadataSchema,
  schedule: scheduleSchema,
  ledger: ledgerSchema,
  config: configSchema,
  'local-config': localConfigSchema,
  'render-log': renderLogSchema,
  check: checkReportSchema,
} as const;

export type SchemaName = keyof typeof SCHEMAS;

export const SCHEMA_NAMES = Object.keys(SCHEMAS) as SchemaName[];

export function isSchemaName(name: string): name is SchemaName {
  return Object.hasOwn(SCHEMAS, name);
}

/**
 * JSON Schema for one format, describing what an author may write (inputs,
 * so fields with defaults are optional).
 */
export function jsonSchemaFor(name: SchemaName): Record<string, unknown> {
  const generated = z.toJSONSchema(SCHEMAS[name], { io: 'input', unrepresentable: 'any' });
  return {
    $id: `https://github.com/edison16a/Content-Machine/docs/schemas/${name}.schema.json`,
    title: `Content Machine ${name}`,
    ...generated,
  };
}
