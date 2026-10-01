import type { ErrorCode, Issue } from '../errors/index.js';

/** Collects problems and warnings while a plan is checked. */
export class IssueList {
  readonly errors: Issue[] = [];
  readonly warnings: Issue[] = [];

  error(code: ErrorCode, message: string, itemId?: number): void {
    this.errors.push(itemId === undefined ? { code, message } : { code, message, itemId });
  }

  warn(code: ErrorCode, message: string, itemId?: number): void {
    this.warnings.push(itemId === undefined ? { code, message } : { code, message, itemId });
  }
}

/** Seconds with two decimals for messages, like "47.30s". */
export function secs(value: number): string {
  return `${value.toFixed(2)}s`;
}
