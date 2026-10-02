/**
 * Writes one JSON Schema per on-disk format to docs/schemas/. CI runs this and
 * fails if the committed files differ, so the docs never drift from the zod
 * schemas they come from.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SCHEMA_NAMES, jsonSchemaFor } from '@content-machine/core';

const outDir = fileURLToPath(new URL('../docs/schemas/', import.meta.url));

await mkdir(outDir, { recursive: true });
for (const name of SCHEMA_NAMES) {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...jsonSchemaFor(name),
  };
  await writeFile(`${outDir}${name}.schema.json`, `${JSON.stringify(schema, null, 2)}\n`);
}
console.log(`Wrote ${SCHEMA_NAMES.length} schemas to docs/schemas/`);
