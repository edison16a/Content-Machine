import { isContentMachineError, type ContentMachineError } from '@content-machine/core';

export interface OutputOptions {
  json: boolean;
  verbose: boolean;
  quiet: boolean;
}

type Stream = { write: (text: string) => unknown };

/**
 * Where the CLI talks. Results go to stdout (JSON with --json, plain text
 * otherwise); progress and logs always go to stderr so Claude can parse
 * stdout reliably.
 */
export class Output {
  constructor(
    readonly options: OutputOptions,
    private readonly stdout: Stream = process.stdout,
    private readonly stderr: Stream = process.stderr,
  ) {}

  /** Progress lines like "Rendering 001.mp4". Hidden by --quiet. */
  info(message: string): void {
    if (!this.options.quiet) this.stderr.write(`${message}\n`);
  }

  /** Detail only shown with --verbose. */
  debug(message: string): void {
    if (this.options.verbose) this.stderr.write(`${message}\n`);
  }

  warn(message: string): void {
    if (!this.options.quiet) this.stderr.write(`Warning: ${message}\n`);
  }

  /** The command's result: structured data for --json, readable lines otherwise. */
  result(command: string, data: unknown, human: () => string[]): void {
    if (this.options.json) {
      this.stdout.write(`${JSON.stringify({ ok: true, command, data }, null, 2)}\n`);
      return;
    }
    const lines = human();
    if (lines.length > 0) this.stdout.write(`${lines.join('\n')}\n`);
  }

  /** Reports a failure and returns the exit code to use. */
  failure(error: unknown): number {
    const known: ContentMachineError | undefined = isContentMachineError(error) ? error : undefined;
    if (this.options.json) {
      const payload = known?.toJSON() ?? {
        code: 'E_UNEXPECTED',
        message: describe(error),
        issues: [],
      };
      this.stdout.write(`${JSON.stringify({ ok: false, error: payload }, null, 2)}\n`);
    } else {
      this.stderr.write(
        `Error [${known?.code ?? 'E_UNEXPECTED'}]: ${known?.message ?? describe(error)}\n`,
      );
      for (const issue of known?.issues ?? []) this.stderr.write(`  - ${issue.message}\n`);
      if (known?.hint !== undefined) this.stderr.write(`How to fix: ${known.hint}\n`);
    }
    if (known === undefined && error instanceof Error && error.stack !== undefined)
      this.debug(error.stack);
    return known?.exitCode ?? 1;
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
