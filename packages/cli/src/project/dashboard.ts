import { join } from 'node:path';
import { buildSchedule, type Project, type Schedule } from '@content-machine/core';
import { generateDashboard, type DashboardLogos } from '@content-machine/dashboard';
import { BRAND_DIR, logoDataUri } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import type { ProjectPaths } from './paths.js';

const logoCache = new Map<string, Promise<DashboardLogos>>();

/** Logos as data URIs, so the dashboard file needs nothing from the network. */
async function dashboardLogos(
  ctx: CommandContext,
  sourcePlatform: Project['sourcePlatform'],
): Promise<DashboardLogos> {
  const brandSvg = await ctx.fs.readBytes(join(BRAND_DIR, 'content-machine.svg'));
  const uri = async (platform: Project['sourcePlatform'], height: number): Promise<string | null> =>
    (await logoDataUri(ctx.fs, platform, height)) ?? null;
  return {
    brand: `data:image/svg+xml;base64,${Buffer.from(brandSvg).toString('base64')}`,
    platforms: {
      tiktok: await uri('tiktok', 20),
      instagram: await uri('instagram', 20),
      youtube: await uri('youtube', 20),
    },
    source: await uri(sourcePlatform, 14),
  };
}

/**
 * Regenerates dashboard.html from the schedule (or an empty calendar when
 * nothing is scheduled yet). Every command that changes what the dashboard
 * shows calls this, so it is never stale and never edited by hand.
 */
export async function writeDashboard(
  ctx: CommandContext,
  paths: ProjectPaths,
  project: Project,
  schedule: Schedule | undefined,
): Promise<string> {
  const config = await ctx.config();
  const data =
    schedule ??
    buildSchedule({
      project,
      items: [],
      assignments: [],
      previous: undefined,
      updatedAt: ctx.clock.now().toISOString(),
    });
  let logos = logoCache.get(project.sourcePlatform);
  if (logos === undefined) {
    logos = dashboardLogos(ctx, project.sourcePlatform);
    logoCache.set(project.sourcePlatform, logos);
  }
  const html = await generateDashboard(data, {
    sourcePlatform: project.sourcePlatform,
    logos: await logos,
    repoUrl: config.repoUrl,
  });
  await ctx.fs.writeText(paths.dashboard, html);
  return paths.dashboard;
}
