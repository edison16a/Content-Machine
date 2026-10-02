import { join } from 'node:path';
import {
  configSchema,
  localConfigSchema,
  parseJsonText,
  type Config,
  type FileSystem,
} from '@content-machine/core';

/** Settings after merging config/defaults.json with config/local.json. */
export type ResolvedConfig = Config & { timezone: string };

/** The time zone this computer is set to, used when nothing else says. */
export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Overlays only the keys a partial override actually sets. */
export function overlay<T extends object>(
  base: T,
  patch: { [K in keyof T]?: T[K] | undefined } | undefined,
): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value !== undefined) (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

/**
 * Loads committed defaults, then layers the gitignored local overrides on
 * top. project.json, written from these at `new`, overrides both later.
 */
export async function loadConfig(fs: FileSystem, root: string): Promise<ResolvedConfig> {
  const defaultsPath = join(root, 'config', 'defaults.json');
  const defaults = parseJsonText(
    configSchema,
    await fs.readText(defaultsPath),
    'config/defaults.json',
  );
  const localPath = join(root, 'config', 'local.json');
  const local = (await fs.exists(localPath))
    ? parseJsonText(localConfigSchema, await fs.readText(localPath), 'config/local.json')
    : {};
  return {
    ...defaults,
    slots: local.slots ?? defaults.slots,
    stagger: overlay(defaults.stagger, local.stagger),
    weekStartsOn: local.weekStartsOn ?? defaults.weekStartsOn,
    account: local.account ?? defaults.account,
    handles: overlay(defaults.handles, local.handles),
    brand: overlay(defaults.brand, local.brand),
    rates: overlay(defaults.rates, local.rates),
    timezone: local.timezone ?? defaults.timezone ?? systemTimeZone(),
  };
}
