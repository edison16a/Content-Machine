/**
 * The three side effects the engine needs. Pure code receives these as
 * arguments so tests can swap in fakes; real implementations live in the
 * render package.
 */

/** Source of "now". Inject a fixed clock in tests and demos. */
export interface Clock {
  now(): Date;
}

/** File metadata the engine cares about. */
export interface FileStat {
  size: number;
  mtimeMs: number;
  isDirectory: boolean;
}

/** Minimal filesystem. Writes are atomic: temp file, then rename. */
export interface FileSystem {
  readText(path: string): Promise<string>;
  readBytes(path: string): Promise<Uint8Array>;
  writeText(path: string, data: string): Promise<void>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  appendText(path: string, data: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdirp(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStat>;
  remove(path: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  /** Moves a file, replacing the target. Used to publish finished outputs atomically. */
  rename(from: string, to: string): Promise<void>;
}

/** Result of a finished child process. Output is decoded as UTF-8. */
export interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a program with an argument array. There is deliberately no way to pass
 * a shell string, so user input can never be interpreted by a shell.
 */
export interface ProcessRunner {
  run(command: string, args: readonly string[]): Promise<ProcessResult>;
}

/** A clock frozen at one instant. Handy for `--now` and tests. */
export function fixedClock(iso: string): Clock {
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) {
    throw new RangeError(`Invalid ISO date: ${iso}`);
  }
  return { now: () => new Date(time.getTime()) };
}
