import { fileURLToPath } from 'node:url';

/**
 * The repo's `assets/` folder. This file sits at the same depth in `src/` and
 * `dist/`, so the relative path works both in tests and in the built CLI.
 */
export const ASSETS_DIR = fileURLToPath(new URL('../../../../assets/', import.meta.url));

export const FONT_PATH = `${ASSETS_DIR}fonts/Poppins-ExtraBold.ttf`;
export const ICONS_DIR = `${ASSETS_DIR}icons/`;
export const BRAND_DIR = `${ASSETS_DIR}brand/`;
