import { ExitCode, type ErrorCode, type ExitCodeValue } from './codes.js';

/** One concrete problem, usually tied to a plan item or a JSON path. */
export interface Issue {
  code: ErrorCode;
  message: string;
  itemId?: number;
  path?: string;
}

interface ErrorOptions {
  hint?: string;
  issues?: readonly Issue[];
  cause?: unknown;
}

/**
 * Base class for every error Content Machine raises on purpose. The CLI turns
 * these into a friendly message plus a stable code and exit code, so anything
 * that is not a ContentMachineError is treated as a bug (exit 1).
 */
export class ContentMachineError extends Error {
  readonly code: ErrorCode;
  readonly exitCode: ExitCodeValue;
  /** One sentence telling the user how to fix the problem. */
  readonly hint: string | undefined;
  readonly issues: readonly Issue[];

  constructor(
    code: ErrorCode,
    message: string,
    exitCode: ExitCodeValue,
    options: ErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.exitCode = exitCode;
    this.hint = options.hint;
    this.issues = options.issues ?? [];
  }

  /** Plain object form used by `--json` output. */
  toJSON(): { code: ErrorCode; message: string; hint?: string; issues: readonly Issue[] } {
    return {
      code: this.code,
      message: this.message,
      ...(this.hint === undefined ? {} : { hint: this.hint }),
      issues: this.issues,
    };
  }
}

/** The user asked for something that cannot work as asked (exit 2). */
export class UserError extends ContentMachineError {
  constructor(code: ErrorCode, message: string, options: ErrorOptions = {}) {
    super(code, message, ExitCode.usage, options);
  }
}

/** A file, plan or config failed validation (exit 3). */
export class ValidationError extends ContentMachineError {
  constructor(code: ErrorCode, message: string, options: ErrorOptions = {}) {
    super(code, message, ExitCode.validation, options);
  }
}

/** A required tool such as ffmpeg or the bundled font is missing (exit 4). */
export class MissingDependencyError extends ContentMachineError {
  constructor(code: ErrorCode, message: string, options: ErrorOptions = {}) {
    super(code, message, ExitCode.missingDependency, options);
  }
}

/** An external tool ran but failed, or a render or check failed (exit 5). */
export class ToolError extends ContentMachineError {
  constructor(code: ErrorCode, message: string, options: ErrorOptions = {}) {
    super(code, message, ExitCode.renderOrCheckFailure, options);
  }
}

/** Narrowing helper that also works across duplicated module copies. */
export function isContentMachineError(value: unknown): value is ContentMachineError {
  return value instanceof ContentMachineError;
}
