import {
  MissingDependencyError,
  ToolError,
  type ProcessResult,
  type ProcessRunner,
} from '@content-machine/core';
import { COMMAND_NOT_FOUND } from '../io/node-process.js';

export type Tool = 'ffmpeg' | 'ffprobe';

const INSTALL_HINT =
  'Install ffmpeg (it includes ffprobe): on macOS run "brew install ffmpeg", on Debian or Ubuntu run "sudo apt install ffmpeg".';

/** Last lines of stderr, where ffmpeg puts the actual reason. */
export function tail(text: string, lines = 15): string {
  return text.trimEnd().split('\n').slice(-lines).join('\n');
}

/**
 * Runs ffmpeg or ffprobe and turns failures into typed errors: a missing
 * binary is exit 4 with install steps, a failed run is exit 5 with the tail
 * of ffmpeg's own log.
 */
export async function runTool(
  runner: ProcessRunner,
  tool: Tool,
  args: readonly string[],
): Promise<ProcessResult> {
  const result = await runner.run(tool, args);
  if (result.code === COMMAND_NOT_FOUND) {
    throw new MissingDependencyError(
      tool === 'ffmpeg' ? 'E_FFMPEG_MISSING' : 'E_FFPROBE_MISSING',
      `${tool} was not found on this computer.`,
      {
        hint: INSTALL_HINT,
      },
    );
  }
  if (result.code !== 0) {
    throw new ToolError(
      'E_FFMPEG_FAILED',
      `${tool} failed (exit ${result.code}):\n${tail(result.stderr)}`,
      {
        hint: 'Run the command again with --verbose for the full ffmpeg log.',
      },
    );
  }
  return result;
}
