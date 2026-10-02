import { Command, CommanderError } from 'commander';
import { ExitCode } from '@content-machine/core';
import { registerAutoplan } from './commands/autoplan.js';
import { registerCheck } from './commands/check.js';
import { registerDashboard } from './commands/dashboard.js';
import { registerDemo } from './commands/demo.js';
import { registerDoctor } from './commands/doctor.js';
import { registerMark } from './commands/mark.js';
import { registerNew } from './commands/new.js';
import { registerPreview } from './commands/preview.js';
import { registerRender } from './commands/render.js';
import { registerSchedule } from './commands/schedule.js';
import { registerSchema } from './commands/schema.js';
import { registerStatus } from './commands/status.js';
import { registerTranscript } from './commands/transcript.js';
import { createContext, type CommandContext, type GlobalOptions } from './context.js';
import { Output } from './io/output.js';

/** Builds the commander program with every command and the global options. */
export function buildProgram(
  makeContext: (options: GlobalOptions) => CommandContext = createContext,
): Command {
  const program = new Command('content-machine')
    .description('Turn one long video into a steady, scheduled stream of short vertical videos.')
    .option('--root <dir>', 'Content Machine folder (default: this repository)')
    .option('--json', 'print structured JSON on stdout (logs stay on stderr)')
    .option('--verbose', 'print extra detail')
    .option('--quiet', 'print only results and errors')
    .option('--now <iso>', 'pretend it is this time (for demos and tests)')
    .showHelpAfterError()
    .exitOverride();
  let context: CommandContext | undefined;
  const get = (): CommandContext => (context ??= makeContext(program.opts<GlobalOptions>()));
  for (const register of [
    registerDoctor,
    registerNew,
    registerTranscript,
    registerRender,
    registerPreview,
    registerCheck,
    registerSchedule,
    registerMark,
    registerDashboard,
    registerStatus,
    registerAutoplan,
    registerDemo,
    registerSchema,
  ]) {
    register(program, get);
  }
  return program;
}

/** Parses arguments, runs the command and returns the exit code. Never throws. */
export async function run(
  argv: readonly string[],
  makeContext?: (options: GlobalOptions) => CommandContext,
): Promise<number> {
  const program = buildProgram(makeContext);
  try {
    await program.parseAsync([...argv], { from: 'user' });
    return ExitCode.ok;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.code === 'commander.helpDisplayed' ||
        error.code === 'commander.version' ||
        error.exitCode === 0
        ? ExitCode.ok
        : ExitCode.usage;
    }
    const options = program.opts<GlobalOptions>();
    const out = new Output({
      json: options.json ?? false,
      verbose: options.verbose ?? false,
      quiet: options.quiet ?? false,
    });
    return out.failure(error);
  }
}
