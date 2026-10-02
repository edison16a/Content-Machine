import { UserError } from '../errors/index.js';

/**
 * Checks that what the user pasted is a web link before we hand it to
 * yt-dlp. yt-dlp also accepts search terms and local paths, and we want
 * neither: a typo should fail here with a clear message, not start a search.
 */
export function parseVideoUrl(input: string): string {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new UserError('E_USAGE', `"${trimmed}" is not a link.`, {
      hint: 'Paste the full address, starting with https://',
    });
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new UserError('E_USAGE', `"${trimmed}" is not a web link.`, {
      hint: 'Paste the full address, starting with https://',
    });
  }
  return url.href;
}
