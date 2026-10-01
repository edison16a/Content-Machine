import { spawn } from 'node:child_process';
import type { ProcessResult, ProcessRunner } from '@content-machine/core';

/** Exit code reported when the program itself could not be found. */
export const COMMAND_NOT_FOUND = 127;

/**
 * Runs programs with spawn and an argument array, never a shell, so file
 * names with spaces or quotes are passed through untouched.
 */
export class NodeProcessRunner implements ProcessRunner {
  run(command: string, args: readonly string[]): Promise<ProcessResult> {
    return new Promise((resolve) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
      child.on('error', (error: NodeJS.ErrnoException) => {
        const missing = error.code === 'ENOENT';
        resolve({
          code: missing ? COMMAND_NOT_FOUND : 1,
          stdout: '',
          stderr: missing ? `command not found: ${command}` : error.message,
        });
      });
      child.on('close', (code) => {
        resolve({
          code: code ?? 1,
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
        });
      });
    });
  }
}
