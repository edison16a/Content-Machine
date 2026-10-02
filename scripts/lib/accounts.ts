import { z } from 'zod';

const account = z.object({ handle: z.string(), url: z.string() });
export const accountsSchema = z.object({ tiktok: account, instagram: account, youtube: account });
export type Accounts = z.infer<typeof accountsSchema>;

export const START = '<!-- ACCOUNTS:START -->';
export const END = '<!-- ACCOUNTS:END -->';

const STYLE: Record<keyof Accounts, { label: string; color: string; logo: string }> = {
  tiktok: { label: 'TikTok', color: '000000', logo: 'tiktok' },
  instagram: { label: 'Instagram', color: 'E4405F', logo: 'instagram' },
  youtube: { label: 'YouTube', color: 'FF0000', logo: 'youtube' },
};

/** shields.io static badge text: dashes and underscores are doubled, the rest URL-encoded. */
export function badgeText(text: string): string {
  return encodeURIComponent(text.replace(/-/g, '--').replace(/_/g, '__'));
}

export function isPlaceholder(accounts: Accounts): boolean {
  return Object.values(accounts).some((a) => a.handle === '' || a.handle.startsWith('YOUR_'));
}

/** The Markdown that goes between the README markers. */
export function accountsBlock(accounts: Accounts): string {
  const badges = (Object.keys(STYLE) as Array<keyof Accounts>).map((key) => {
    const { label, color, logo } = STYLE[key];
    const handle = accounts[key].handle.startsWith('@') || key === 'instagram' ? accounts[key].handle : `@${accounts[key].handle}`;
    const image = `https://img.shields.io/badge/${badgeText(label)}-${badgeText(handle)}-${color}?style=for-the-badge&logo=${logo}&logoColor=white`;
    return `[![${label}: ${handle}](${image})](${accounts[key].url})`;
  });
  const lines = ['**Real accounts running on Content Machine:**', '', badges.join(' ')];
  if (isPlaceholder(accounts)) {
    lines.push('', '_These are placeholders. Put your handles and links in `docs/accounts.json`, then run `npm run docs:accounts`._');
  }
  return lines.join('\n');
}

/** Replaces everything between the markers, keeping the markers. */
export function replaceBlock(readme: string, block: string): string {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start < 0 || end < start) throw new Error(`README.md needs ${START} and ${END} markers.`);
  return `${readme.slice(0, start + START.length)}\n${block}\n${readme.slice(end)}`;
}
