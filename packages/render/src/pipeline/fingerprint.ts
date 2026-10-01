import { createHash } from 'node:crypto';
import type { Brand } from '@content-machine/core';
import { OVERLAY_VERSION } from '../overlays/prepare.js';

/** Bump when the render pipeline changes how outputs look or sound. */
export const RENDER_VERSION = 'render-v1';

export interface FingerprintInput {
  planKey: string;
  start: number;
  end: number;
  brand: Brand;
  hw: boolean;
  sourceSize: number;
  sourceMtimeMs: number;
}

/**
 * Everything that shapes an output, hashed. Same fingerprint means the file
 * on disk is already correct and the render can be skipped.
 */
export function fingerprint(input: FingerprintInput): string {
  return createHash('sha256')
    .update(JSON.stringify([RENDER_VERSION, OVERLAY_VERSION, input]))
    .digest('hex')
    .slice(0, 24);
}
