import type { Command } from 'commander';
import { UserError } from '@content-machine/core';
import { previewItem } from '@content-machine/render';
import type { CommandContext } from '../context.js';
import { loadPlan } from '../project/files.js';
import { display, openProject, parsePositiveInt, parseSeconds } from './shared.js';

export async function runPreview(
  ctx: CommandContext,
  name: string,
  flags: { item?: number; time: number },
): Promise<string> {
  const { paths } = await openProject(ctx, name);
  const config = await ctx.config();
  const plan = await loadPlan(ctx.fs, paths);
  const itemId = flags.item ?? plan.items[0]?.id;
  if (itemId === undefined)
    throw new UserError('E_ITEM_NOT_FOUND', 'The plan has no items yet.', {
      hint: 'Add items to plan/plan.json first.',
    });
  const path = await previewItem(
    { fs: ctx.fs, runner: ctx.runner },
    { plan, itemId, at: flags.time, dirs: paths, brand: config.brand },
  );
  ctx.out.result('preview', { item: itemId, at: flags.time, image: path }, () => [
    `Preview of item ${itemId} at ${flags.time}s: ${display(ctx, path)}`,
  ]);
  return path;
}

export function registerPreview(program: Command, context: () => CommandContext): void {
  program
    .command('preview <project>')
    .description('Render one frame with overlays to work/preview.png (no video encoding).')
    .option('--item <id>', 'item to preview (default: the first)', parsePositiveInt)
    .option('--time <seconds>', 'seconds into the item', parseSeconds, 2)
    .action((name: string, flags: { item?: number; time: number }) =>
      runPreview(context(), name, flags).then(() => undefined),
    );
}
