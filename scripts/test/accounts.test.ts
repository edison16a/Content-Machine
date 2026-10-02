import { describe, expect, it } from 'vitest';
import { END, START, accountsBlock, badgeText, isPlaceholder, replaceBlock } from '../lib/accounts.js';

const real = {
  tiktok: { handle: 'my_brand', url: 'https://www.tiktok.com/@my_brand' },
  instagram: { handle: 'my.brand', url: 'https://www.instagram.com/my.brand' },
  youtube: { handle: '@my-brand', url: 'https://www.youtube.com/@my-brand' },
};

describe('README accounts block', () => {
  it('escapes shields.io badge text', () => {
    expect(badgeText('@my-brand_x')).toBe('%40my--brand__x');
  });

  it('builds three linked badges', () => {
    const block = accountsBlock(real);
    expect(block).toContain('[![TikTok: @my_brand](https://img.shields.io/badge/TikTok-%40my__brand-000000?style=for-the-badge&logo=tiktok&logoColor=white)](https://www.tiktok.com/@my_brand)');
    expect(block).toContain('Instagram: my.brand');
    expect(block).toContain('YouTube: @my-brand');
    expect(block).not.toContain('placeholders');
  });

  it('flags placeholders', () => {
    const placeholder = { ...real, youtube: { handle: 'YOUR_YOUTUBE_HANDLE', url: 'x' } };
    expect(isPlaceholder(placeholder)).toBe(true);
    expect(accountsBlock(placeholder)).toContain('These are placeholders');
  });

  it('replaces only the marked block', () => {
    const readme = `# Title\n${START}\nold\n${END}\nrest`;
    expect(replaceBlock(readme, 'new')).toBe(`# Title\n${START}\nnew\n${END}\nrest`);
    expect(() => replaceBlock('# nothing', 'x')).toThrow(/markers/);
  });
});
