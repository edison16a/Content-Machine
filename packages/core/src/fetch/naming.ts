/** Long enough to stay readable, short enough for every file system. */
const MAX_STEM = 60;

/** Lowercase letters, digits and single hyphens, trimmed to a sane length. */
function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_STEM)
    .replace(/-+$/g, '');
}

/** The pattern a downloaded file's name must match: safe in shells and URLs. */
export const STEM_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Picks the file name (without extension) for a downloaded video. We use the
 * title so people recognise the file in Finder, and fall back to the site's
 * id when the title has nothing usable, like an all emoji title.
 */
export function downloadStem(title: string | null | undefined, id: string): string {
  return slug(title ?? '') || slug(id) || 'video';
}
