import type { Schedule } from '@content-machine/core';
import { loadClientBundle } from './bundle.js';
import { toDashboardData, type DashboardExtras } from './data.js';
import { renderDashboardHtml } from './html.js';

/** Builds the complete dashboard.html text for a schedule. */
export async function generateDashboard(
  schedule: Schedule,
  extras: DashboardExtras,
): Promise<string> {
  const bundle = await loadClientBundle();
  return renderDashboardHtml({ data: toDashboardData(schedule, extras), ...bundle });
}

export { loadClientBundle, type ClientBundle } from './bundle.js';
export { toDashboardData, type DashboardExtras } from './data.js';
export { escapeHtml, jsonForScript, renderDashboardHtml, type HtmlInput } from './html.js';
