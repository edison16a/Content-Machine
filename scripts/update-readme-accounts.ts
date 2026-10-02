/**
 * Rewrites the Results block at the top of README.md from docs/accounts.json.
 * Usage: edit docs/accounts.json, then run `npm run docs:accounts`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { accountsBlock, accountsSchema, replaceBlock } from './lib/accounts.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const accounts = accountsSchema.parse(
  JSON.parse(await readFile(`${root}docs/accounts.json`, 'utf8')),
);
const readme = await readFile(`${root}README.md`, 'utf8');
await writeFile(`${root}README.md`, replaceBlock(readme, accountsBlock(accounts)));
console.log('Updated the Results block in README.md');
