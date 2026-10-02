import { InvalidArgumentError } from 'commander';
import {
  PLATFORMS,
  STATUSES,
  type Platform,
  type Project,
  type Status,
} from '@content-machine/core';
import type { CommandContext } from '../context.js';
import { loadProject } from '../project/files.js';
import { projectPaths, type ProjectPaths } from '../project/paths.js';

/** Resolves and loads a project by name, with a friendly error if it is missing. */
export async function openProject(
  ctx: CommandContext,
  name: string,
): Promise<{ paths: ProjectPaths; project: Project }> {
  const paths = projectPaths(ctx.root, name);
  return { paths, project: await loadProject(ctx.fs, paths) };
}

/** Parses "3", "1,4,7" or "2-5" into ids. "all" is handled by the caller. */
export function parseIds(value: string): number[] {
  const ids = new Set<number>();
  for (const part of value.split(',').map((p) => p.trim())) {
    const range = /^(\d+)-(\d+)$/.exec(part);
    if (range !== null) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      if (from > to) throw new InvalidArgumentError(`"${part}" is a backwards range.`);
      for (let id = from; id <= to; id += 1) ids.add(id);
    } else if (/^\d+$/.test(part)) {
      ids.add(Number(part));
    } else {
      throw new InvalidArgumentError(`"${part}" is not an item id. Use 3, 1,4,7 or 2-5.`);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

export function parsePlatforms(value: string): Platform[] {
  if (value === 'all') return [...PLATFORMS];
  const found = PLATFORMS.find((p) => p === value);
  if (found === undefined)
    throw new InvalidArgumentError(`Use one of: ${PLATFORMS.join(', ')}, all.`);
  return [found];
}

export function parseStatus(value: string): Status {
  const found = STATUSES.find((s) => s === value);
  if (found === undefined) throw new InvalidArgumentError(`Use one of: ${STATUSES.join(', ')}.`);
  return found;
}

export function parsePositiveInt(value: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1)
    throw new InvalidArgumentError('Use a whole number of 1 or more.');
  return number;
}

export function parseSeconds(value: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0)
    throw new InvalidArgumentError('Use a number of seconds, like 2 or 1.5.');
  return number;
}

/**
 * Money as the dashboard shows it: commas and six decimals. The estimate is
 * a fraction of a cent per view, and the decimals are what make it move.
 */
export function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
}

/** Relative path for messages, so output stays short and readable. */
export function display(ctx: CommandContext, path: string): string {
  return path.startsWith(ctx.root) ? path.slice(ctx.root.length).replace(/^\/+/, '') : path;
}
