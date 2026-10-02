import type { Command } from 'commander';
import { SCHEMA_NAMES, UserError, isSchemaName, jsonSchemaFor } from '@content-machine/core';
import type { CommandContext } from '../context.js';

export function runSchema(ctx: CommandContext, name: string | undefined): void {
  if (name === undefined) {
    ctx.out.result('schema', { schemas: SCHEMA_NAMES }, () => [
      'Available schemas:',
      ...SCHEMA_NAMES.map((n) => `  ${n}`),
    ]);
    return;
  }
  if (!isSchemaName(name)) {
    throw new UserError('E_USAGE', `There is no schema called "${name}".`, {
      hint: `Use one of: ${SCHEMA_NAMES.join(', ')}.`,
    });
  }
  const schema = jsonSchemaFor(name);
  ctx.out.result('schema', schema, () => [JSON.stringify(schema, null, 2)]);
}

export function registerSchema(program: Command, context: () => CommandContext): void {
  program
    .command('schema [name]')
    .description('Print the JSON Schema for a file format (plan, metadata, schedule, ...).')
    .action((name: string | undefined) => {
      runSchema(context(), name);
    });
}
