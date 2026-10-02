import { fileURLToPath } from 'node:url';
import {
  UserError,
  fixedClock,
  type Clock,
  type FileSystem,
  type ProcessRunner,
} from '@content-machine/core';
import { NodeFileSystem, NodeProcessRunner, systemClock } from '@content-machine/render';
import { loadConfig, type ResolvedConfig } from './config/load.js';
import { Output, type OutputOptions } from './io/output.js';

/** The repo root: this file sits three levels below it in both src/ and dist/. */
export const DEFAULT_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export interface GlobalOptions {
  root?: string;
  json?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  now?: string;
}

/** Everything a command needs. Tests build one with fakes or temp folders. */
export interface CommandContext {
  root: string;
  fs: FileSystem;
  runner: ProcessRunner;
  clock: Clock;
  out: Output;
  config: () => Promise<ResolvedConfig>;
}

function clockFrom(now: string | undefined): Clock {
  if (now === undefined) return systemClock;
  try {
    return fixedClock(now);
  } catch {
    throw new UserError('E_USAGE', `--now "${now}" is not a valid ISO date.`, {
      hint: 'Use a value like 2026-10-01T12:00:00Z.',
    });
  }
}

export function createContext(options: GlobalOptions, output?: Output): CommandContext {
  const fs = new NodeFileSystem();
  const root = options.root ?? DEFAULT_ROOT;
  const outputOptions: OutputOptions = {
    json: options.json ?? false,
    verbose: options.verbose ?? false,
    quiet: options.quiet ?? false,
  };
  let config: Promise<ResolvedConfig> | undefined;
  return {
    root,
    fs,
    runner: new NodeProcessRunner(),
    clock: clockFrom(options.now),
    out: output ?? new Output(outputOptions),
    config: () => (config ??= loadConfig(fs, root)),
  };
}
