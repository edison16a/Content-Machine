import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { UserError } from '@content-machine/core';

/**
 * The bundled client lives in packages/dashboard/dist/client. This file is two
 * levels below the package root in both src/ and dist/, so one relative path
 * works for tests and for the built CLI.
 */
const BUNDLE_DIR = fileURLToPath(new URL('../../dist/client/', import.meta.url));

export interface ClientBundle {
  js: string;
  css: string;
}

let cached: ClientBundle | undefined;

/** Reads the prebuilt client bundle once per process. */
export async function loadClientBundle(dir: string = BUNDLE_DIR): Promise<ClientBundle> {
  if (cached !== undefined && dir === BUNDLE_DIR) return cached;
  try {
    const [js, css] = await Promise.all([
      readFile(`${dir}client.js`, 'utf8'),
      readFile(`${dir}client.css`, 'utf8'),
    ]);
    const bundle = { js, css };
    if (dir === BUNDLE_DIR) cached = bundle;
    return bundle;
  } catch (error) {
    throw new UserError('E_FILE_NOT_FOUND', 'The dashboard client has not been built yet.', {
      hint: 'Run "npm run build" in the repository root, then try again.',
      cause: error,
    });
  }
}
