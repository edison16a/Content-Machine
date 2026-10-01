import type { Plan, PlanItem, PlanSource } from '../schemas/index.js';

/** Everything the renderer needs to draw one item's text. */
export interface ResolvedText {
  title: string;
  accent: string;
  accentColor: string;
  channel: string;
  platform: PlanSource['platform'];
}

export function findSource(plan: Plan, file: string): PlanSource | undefined {
  return plan.sources.find((source) => source.file === file);
}

/**
 * Resolves the on-video text for an item. Sequential parts take the title and
 * accent from their source so every part reads the same; clips carry their own.
 */
export function resolveItemText(plan: Plan, item: PlanItem): ResolvedText | undefined {
  const source = findSource(plan, item.source);
  if (source === undefined) return undefined;
  const title = plan.mode === 'sequential' ? source.title : item.title;
  const accent = plan.mode === 'sequential' ? source.accent : item.accent;
  if (title === undefined || accent === undefined) return undefined;
  return {
    title,
    accent,
    accentColor: item.accentColor ?? plan.accentColor,
    channel: source.channel,
    platform: source.platform,
  };
}

/**
 * A stable string for the parts of an item that are frozen once rendered:
 * the cut and the text. Used to refuse silent edits to published videos.
 */
export function planKeyFor(plan: Plan, item: PlanItem): string {
  const text = resolveItemText(plan, item);
  return JSON.stringify([
    item.source,
    item.start,
    item.end,
    text?.title ?? null,
    text?.accent ?? null,
    text?.accentColor ?? null,
  ]);
}
