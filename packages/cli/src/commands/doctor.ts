import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { Command } from 'commander';
import { MissingDependencyError, SOURCE_PLATFORMS, type ErrorCode } from '@content-machine/core';
import { FONT_PATH, detectTools, ensureFont, resolveLogo } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { YTDLP_INSTALL, ytDlpVersion } from '../download/ytdlp.js';

export interface Check {
  name: string;
  code?: ErrorCode;
  ok: boolean;
  required: boolean;
  detail: string;
  fix?: string;
}

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/opt/google/chrome/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];

/** Google Chrome is only needed for the dashboard browser tests (it plays H.264 and AAC). */
function findChrome(): string | undefined {
  const onPath = (process.env.PATH ?? '').split(delimiter).map((dir) => join(dir, 'google-chrome'));
  return [...CHROME_PATHS, ...onPath].find((path) => existsSync(path));
}

function fontCheck(): Check {
  try {
    ensureFont();
    return { name: 'Title font', ok: true, required: true, detail: 'Poppins ExtraBold loaded' };
  } catch {
    return {
      name: 'Title font',
      code: 'E_FONT_MISSING',
      ok: false,
      required: true,
      detail: `missing ${FONT_PATH}`,
      fix: 'Restore it with: git checkout -- assets/fonts',
    };
  }
}

export async function collectChecks(ctx: CommandContext): Promise<Check[]> {
  const major = Number(process.versions.node.split('.')[0]);
  const [tools, ytdlp] = await Promise.all([detectTools(ctx.runner), ytDlpVersion(ctx.runner)]);
  const install = 'macOS: brew install ffmpeg. Debian or Ubuntu: sudo apt install ffmpeg.';
  const chrome = findChrome();
  const logos: string[] = [];
  for (const platform of SOURCE_PLATFORMS) {
    const source = await resolveLogo(ctx.fs, platform);
    logos.push(
      `${platform} ${source.kind === 'file' ? 'file' : source.kind === 'simple-icons' ? 'simple-icons' : 'none'}`,
    );
  }
  return [
    {
      name: 'Node.js',
      ok: major >= 20,
      required: true,
      detail: `v${process.versions.node}`,
      fix: 'Install Node 20 or newer (nvm install 22).',
    },
    {
      name: 'ffmpeg',
      code: 'E_FFMPEG_MISSING',
      ok: tools.ffmpeg !== undefined,
      required: true,
      detail: tools.ffmpeg ?? 'not found',
      fix: install,
    },
    {
      name: 'ffprobe',
      code: 'E_FFPROBE_MISSING',
      ok: tools.ffprobe !== undefined,
      required: true,
      detail: tools.ffprobe ?? 'not found',
      fix: install,
    },
    {
      name: 'libx264',
      code: 'E_LIBX264_MISSING',
      ok: tools.libx264,
      required: true,
      detail: tools.libx264 ? 'available' : 'not in this ffmpeg build',
      fix: 'Install an ffmpeg build with libx264 (the Homebrew and apt builds have it).',
    },
    fontCheck(),
    {
      name: 'yt-dlp',
      code: 'E_YTDLP_MISSING',
      ok: ytdlp !== undefined,
      required: false,
      detail: ytdlp === undefined ? 'not found' : `version ${ytdlp}`,
      fix: `Only needed to download videos from a link. ${YTDLP_INSTALL}`,
    },
    {
      name: 'Hardware encoder',
      ok: tools.videotoolbox,
      required: false,
      detail: tools.videotoolbox ? 'h264_videotoolbox (use --hw)' : 'not available (only on macOS)',
    },
    {
      name: 'Google Chrome',
      ok: chrome !== undefined,
      required: false,
      detail: chrome ?? 'not found',
      fix: 'Only needed for the dashboard browser tests: npx playwright install chrome',
    },
    { name: 'Logos', ok: true, required: false, detail: logos.join(', ') },
  ];
}

export async function runDoctor(ctx: CommandContext): Promise<Check[]> {
  const checks = await collectChecks(ctx);
  ctx.out.result('doctor', { checks }, () =>
    checks.flatMap((c) => [
      `${c.ok ? 'ok  ' : c.required ? 'FAIL' : 'warn'}  ${c.name.padEnd(17)} ${c.detail}`,
      ...(c.ok || c.fix === undefined ? [] : [`      fix: ${c.fix}`]),
    ]),
  );
  const missing = checks.filter((c) => c.required && !c.ok);
  if (missing.length > 0) {
    throw new MissingDependencyError(
      missing[0]?.code ?? 'E_USAGE',
      `Missing: ${missing.map((c) => c.name).join(', ')}.`,
      {
        // ffmpeg and ffprobe share one fix; say it once.
        hint: [...new Set(missing.map((c) => c.fix).filter((f) => f !== undefined))].join(' '),
      },
    );
  }
  return checks;
}

export function registerDoctor(program: Command, context: () => CommandContext): void {
  program
    .command('doctor')
    .description(
      'Check Node, ffmpeg, libx264, the font, yt-dlp, Chrome and logos, with fixes for anything missing.',
    )
    .action(() => runDoctor(context()).then(() => undefined));
}
