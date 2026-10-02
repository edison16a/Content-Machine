import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Brand, FileSystem, Layout, ResolvedText } from '@content-machine/core';
import { OVERLAY_PADDING } from './canvas.js';
import { renderCredit } from './credit.js';
import { loadLogo, resolveLogo } from './logos.js';
import { renderBandShadow } from './shadow.js';
import { renderTitle } from './title.js';

/** Bump when overlay drawing changes so cached PNGs are redrawn. */
export const OVERLAY_VERSION = 'overlay-v3';

export interface PreparedOverlays {
  titlePath: string;
  creditPath: string;
  shadowPath: string | undefined;
  /** Canvas y where each PNG's top-left goes (padding already applied). */
  titleY: number;
  creditY: number;
  warnings: string[];
}

function hash(parts: readonly unknown[]): string {
  return createHash('sha256')
    .update(JSON.stringify([OVERLAY_VERSION, ...parts]))
    .digest('hex')
    .slice(0, 20);
}

/** Writes a PNG into the cache unless an identical one is already there. */
async function cached(
  fs: FileSystem,
  dir: string,
  key: string,
  draw: () => Promise<Uint8Array>,
): Promise<string> {
  const path = join(dir, `${key}.png`);
  if (!(await fs.exists(path))) await fs.writeBytes(path, await draw());
  return path;
}

/**
 * Builds (or reuses) the title, credit and band shadow PNGs for one item.
 * Identical titles share one cached file, which keeps re-renders fast.
 */
export async function prepareOverlays(
  fs: FileSystem,
  input: { text: ResolvedText; brand: Brand; layout: Layout; cacheDir: string; iconsDir?: string },
): Promise<PreparedOverlays> {
  const { text, brand, layout } = input;
  const dir = join(input.cacheDir, 'overlays');
  const warnings: string[] = [];
  const titleSpec = {
    title: text.title,
    accent: text.accent,
    accentColor: text.accentColor,
    textColor: brand.textColor,
  };
  const titlePath = await cached(
    fs,
    dir,
    `title-${hash([titleSpec])}`,
    async () => (await renderTitle(titleSpec)).png,
  );
  const logoSource = await resolveLogo(fs, text.platform, input.iconsDir);
  if (logoSource.kind === 'none')
    warnings.push(`No logo for ${text.platform}; the credit shows the channel name only.`);
  const creditPath = await cached(
    fs,
    dir,
    `credit-${hash([text.channel, text.platform, logoSource, brand.textColor])}`,
    async () => {
      const image = await renderCredit({
        channel: text.channel,
        logo: await loadLogo(fs, logoSource),
        textColor: brand.textColor,
      });
      return image.png;
    },
  );
  const shadowPath =
    layout.kind === 'band'
      ? await cached(fs, dir, `shadow-${hash([layout.foreground, layout.canvas])}`, () =>
          renderBandShadow(layout),
        )
      : undefined;
  return {
    titlePath,
    creditPath,
    shadowPath,
    titleY: layout.title.y - OVERLAY_PADDING,
    creditY: layout.credit.y - OVERLAY_PADDING,
    warnings,
  };
}
