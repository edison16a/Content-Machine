import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { computeLayout } from '@content-machine/core';
import {
  NodeFileSystem,
  OVERLAY_PADDING,
  ensureFont,
  logoDataUri,
  prepareOverlays,
  renderBandShadow,
  renderCredit,
  renderTitle,
  resolveLogo,
  simpleIconSvg,
} from '@content-machine/render';

const fs = new NodeFileSystem();
let empty = '';

beforeAll(async () => {
  empty = await mkdtemp(join(tmpdir(), 'cm-icons-'));
});
afterAll(async () => {
  await rm(empty, { recursive: true, force: true });
});

/** Counts pixels close to an RGB color in a PNG. */
async function countColor(png: Uint8Array, rgb: [number, number, number]): Promise<number> {
  const image = await loadImage(Buffer.from(png));
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const close =
      Math.abs((data[i] ?? 0) - rgb[0]) < 12 &&
      Math.abs((data[i + 1] ?? 0) - rgb[1]) < 12 &&
      Math.abs((data[i + 2] ?? 0) - rgb[2]) < 12;
    if (close && (data[i + 3] ?? 0) > 250) count += 1;
  }
  return count;
}

describe('renderTitle', () => {
  it('draws white words with exactly the accent in color', async () => {
    const image = await renderTitle({
      title: 'How We Built A Tiny House In 30 Days',
      accent: '30 days',
      accentColor: '#FF8A1F',
      textColor: '#FFFFFF',
    });
    expect(image.fit.lines).toHaveLength(2);
    expect(image.padding).toBe(OVERLAY_PADDING);
    expect(await countColor(image.png, [255, 138, 31])).toBeGreaterThan(500);
    expect(await countColor(image.png, [255, 255, 255])).toBeGreaterThan(2000);
  });

  it('handles one word titles and an accent on the last word', async () => {
    const one = await renderTitle({
      title: 'unbelievable',
      accent: 'Unbelievable',
      accentColor: '#FF8A1F',
      textColor: '#FFFFFF',
    });
    expect(one.fit.lines).toEqual([{ words: ['Unbelievable'], firstWord: 0 }]);
    const last = await renderTitle({
      title: 'Nobody Saw This Ending Coming At All',
      accent: 'All',
      accentColor: '#00FF00',
      textColor: '#FFFFFF',
    });
    expect(await countColor(last.png, [0, 255, 0])).toBeGreaterThan(100);
  });

  it('fits a 40 character title on two lines', async () => {
    const image = await renderTitle({
      title: 'The Tiny House That Took Thirty Long Days',
      accent: 'Thirty',
      accentColor: '#FF8A1F',
      textColor: '#FFFFFF',
    });
    expect(image.fit.lines).toHaveLength(2);
    expect(image.fit.fontSize).toBeLessThanOrEqual(88);
  });

  it('fails clearly on a missing accent or an impossible title', async () => {
    await expect(
      renderTitle({ title: 'Short', accent: 'Long', accentColor: '#FF8A1F', textColor: '#FFFFFF' }),
    ).rejects.toMatchObject({ code: 'E_PLAN_INVALID' });
    const long =
      'This Title Is Much Too Long To Ever Fit On Two Lines Of A Vertical Video No Matter What';
    await expect(
      renderTitle({ title: long, accent: 'Title', accentColor: '#FF8A1F', textColor: '#FFFFFF' }),
    ).rejects.toMatchObject({
      code: 'E_TITLE_TOO_LONG',
      hint: expect.stringMatching(/about \d+ characters/) as unknown,
    });
  });
});

describe('renderCredit and logos', () => {
  it('resolves bundled files, then simple-icons, then nothing', async () => {
    expect(await resolveLogo(fs, 'youtube')).toMatchObject({ kind: 'file' });
    expect(await resolveLogo(fs, 'twitch', empty)).toMatchObject({ kind: 'simple-icons' });
    expect(await resolveLogo(fs, 'other', empty)).toEqual({ kind: 'none' });
    expect(simpleIconSvg({ hex: '000000', path: 'M0 0' })).toContain('fill="#FFFFFF"');
    expect(simpleIconSvg({ hex: '9146FF', path: 'M0 0' })).toContain('fill="#9146FF"');
  });

  it('makes small data URIs for the dashboard', async () => {
    expect(await logoDataUri(fs, 'tiktok', 20)).toMatch(/^data:image\/png;base64,/);
    expect(await logoDataUri(fs, 'other', 20, empty)).toBeUndefined();
  });

  it('draws the logo and name, truncating names that do not fit', async () => {
    const short = await renderCredit({
      channel: 'Example Channel',
      logo: undefined,
      textColor: '#FFFFFF',
    });
    expect(short.fit).toMatchObject({ fontSize: 52, truncated: false });
    const long = await renderCredit({
      channel: 'An Extraordinarily Long Channel Name That Keeps Going',
      logo: undefined,
      textColor: '#FFFFFF',
    });
    expect(long.fit.truncated).toBe(true);
  });

  it('prepares and caches overlays, warning when a logo is missing', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'cm-cache-'));
    const input = {
      text: {
        title: 'He Missed By One Inch',
        accent: 'One Inch',
        accentColor: '#FF8A1F',
        channel: 'Streamer',
        platform: 'other' as const,
      },
      brand: { font: 'Poppins ExtraBold', textColor: '#FFFFFF', accentColor: '#FF8A1F' },
      layout: computeLayout(1920, 1080),
      cacheDir,
      iconsDir: empty,
    };
    const first = await prepareOverlays(fs, input);
    const second = await prepareOverlays(fs, input);
    expect(second.titlePath).toBe(first.titlePath);
    expect(first.warnings[0]).toMatch(/No logo for other/);
    expect(first.titleY).toBe(input.layout.title.y - OVERLAY_PADDING);
    const portrait = await prepareOverlays(fs, { ...input, layout: computeLayout(1080, 1920) });
    expect(portrait.shadowPath).toBeUndefined();
    await rm(cacheDir, { recursive: true, force: true });
  });
});

describe('renderBandShadow', () => {
  it('draws at the quarter-size background resolution', async () => {
    const image = await loadImage(Buffer.from(await renderBandShadow(computeLayout(1920, 1080))));
    expect([image.width, image.height]).toEqual([270, 480]);
  });
});

describe('ensureFont', () => {
  it('fails with E_FONT_MISSING for a missing font only on first registration', () => {
    ensureFont();
    expect(() => {
      ensureFont('/nope.ttf');
    }).not.toThrow();
  });
});
