import type { z } from 'zod';
import { ValidationError, type Issue } from '../errors/index.js';

/** Formats a zod issue path like `items[3].start`. */
function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((out, key) => {
    if (typeof key === 'number') return `${out}[${key}]`;
    const name = String(key);
    return out === '' ? name : `${out}.${name}`;
  }, '');
}

/** Pulls the plan item id out of a path like `items[3]` when the data has one. */
function itemIdAt(value: unknown, path: readonly PropertyKey[]): number | undefined {
  if (path[0] !== 'items' || typeof path[1] !== 'number') return undefined;
  if (typeof value !== 'object' || value === null || !('items' in value)) return undefined;
  const items: unknown = value.items;
  if (!Array.isArray(items)) return undefined;
  const item: unknown = items[path[1]];
  if (typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'number') {
    return item.id;
  }
  return undefined;
}

/**
 * Validates parsed data against a schema. On failure every zod issue becomes
 * one of our Issues, so the user sees all problems at once with their paths.
 */
export function parseWith<S extends z.ZodType>(schema: S, value: unknown, label: string): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues: Issue[] = result.error.issues.map((issue) => {
    const path = formatPath(issue.path);
    const itemId = itemIdAt(value, issue.path);
    return {
      code: 'E_SCHEMA',
      message: path === '' ? issue.message : `${path}: ${issue.message}`,
      ...(path === '' ? {} : { path }),
      ...(itemId === undefined ? {} : { itemId }),
    };
  });
  throw new ValidationError('E_SCHEMA', `${label} is not valid (${issues.length} problem(s)).`, {
    hint: `Fix the listed fields in ${label}. The JSON Schema is in docs/schemas/.`,
    issues,
  });
}

/** Parses JSON text, then validates it. Bad JSON gets its own error code. */
export function parseJsonText<S extends z.ZodType>(schema: S, text: string, label: string): z.output<S> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ValidationError('E_JSON_PARSE', `${label} is not valid JSON: ${reason}`, {
      hint: 'Check for a missing comma, quote or bracket near the reported position.',
      cause: error,
    });
  }
  return parseWith(schema, value, label);
}
