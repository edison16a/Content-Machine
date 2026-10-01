import { join } from 'node:path';
import { createCanvas, loadImage, type Image } from '@napi-rs/canvas';
import { siFacebook, siInstagram, siKick, siTiktok, siTwitch, siX, siYoutube } from 'simple-icons';
import type { FileSystem, SourcePlatform } from '@content-machine/core';
import { ICONS_DIR } from '../io/assets.js';

interface SimpleIcon {
  hex: string;
  path: string;
}

/** Brand SVGs from simple-icons, used only when no file is in assets/icons. */
const SIMPLE_ICONS: Partial<Record<SourcePlatform, SimpleIcon>> = {
  youtube: siYoutube,
  tiktok: siTiktok,
  instagram: siInstagram,
  twitch: siTwitch,
  kick: siKick,
  x: siX,
  facebook: siFacebook,
};

export type LogoSource =
  { kind: 'file'; path: string } | { kind: 'simple-icons'; svg: string } | { kind: 'none' };

/** Very dark brand colors (X is black) would vanish on dark video, so use white. */
function readableHex(hex: string): string {
  const value = Number.parseInt(hex, 16);
  const luminance =
    0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255);
  return luminance < 40 ? 'FFFFFF' : hex;
}

export function simpleIconSvg(icon: SimpleIcon): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256">` +
    `<path fill="#${readableHex(icon.hex)}" d="${icon.path}"/></svg>`
  );
}

/**
 * Finds a logo without ever drawing one ourselves: a file in assets/icons
 * first, then the official simple-icons SVG, else nothing.
 */
export async function resolveLogo(
  fs: FileSystem,
  platform: SourcePlatform,
  iconsDir: string = ICONS_DIR,
): Promise<LogoSource> {
  for (const ext of ['png', 'svg']) {
    const path = join(iconsDir, `${platform}.${ext}`);
    if (await fs.exists(path)) return { kind: 'file', path };
  }
  const icon = SIMPLE_ICONS[platform];
  return icon === undefined ? { kind: 'none' } : { kind: 'simple-icons', svg: simpleIconSvg(icon) };
}

/** Loads a resolved logo as a canvas image, or undefined when there is none. */
export async function loadLogo(fs: FileSystem, source: LogoSource): Promise<Image | undefined> {
  if (source.kind === 'none') return undefined;
  const bytes =
    source.kind === 'file' ? await fs.readBytes(source.path) : new TextEncoder().encode(source.svg);
  return loadImage(Buffer.from(bytes));
}

/**
 * A PNG data URI of the logo at `height` CSS pixels (drawn at 2x for sharp
 * screens). The dashboard embeds these so it never makes a network request.
 */
export async function logoDataUri(
  fs: FileSystem,
  platform: SourcePlatform,
  height: number,
  iconsDir?: string,
): Promise<string | undefined> {
  const image = await loadLogo(fs, await resolveLogo(fs, platform, iconsDir));
  if (image === undefined) return undefined;
  const scale = 2;
  const h = height * scale;
  const w = Math.round((image.width / image.height) * h);
  const canvas = createCanvas(w, h);
  canvas.getContext('2d').drawImage(image, 0, 0, w, h);
  const png = await canvas.encode('png');
  return `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
}
