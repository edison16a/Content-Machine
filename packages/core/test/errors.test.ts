import { describe, expect, it } from 'vitest';
import {
  ContentMachineError,
  ERROR_CODES,
  ExitCode,
  MissingDependencyError,
  ToolError,
  UserError,
  ValidationError,
  fixedClock,
  isContentMachineError,
} from '@content-machine/core';

describe('error hierarchy', () => {
  it('maps each class to its exit code', () => {
    expect(new UserError('E_USAGE', 'x').exitCode).toBe(ExitCode.usage);
    expect(new ValidationError('E_PLAN_GAP', 'x').exitCode).toBe(ExitCode.validation);
    expect(new MissingDependencyError('E_FFMPEG_MISSING', 'x').exitCode).toBe(4);
    expect(new ToolError('E_FFMPEG_FAILED', 'x').exitCode).toBe(5);
  });

  it('serializes to JSON with hint and issues', () => {
    const error = new ValidationError('E_PLAN_GAP', 'Gap', {
      hint: 'Close it.',
      issues: [{ code: 'E_PLAN_GAP', message: 'gap', itemId: 2 }],
      cause: new Error('inner'),
    });
    expect(error.toJSON()).toEqual({
      code: 'E_PLAN_GAP',
      message: 'Gap',
      hint: 'Close it.',
      issues: [{ code: 'E_PLAN_GAP', message: 'gap', itemId: 2 }],
    });
    expect(error.name).toBe('ValidationError');
    expect(error.cause).toBeInstanceOf(Error);
    expect(new UserError('E_USAGE', 'u').toJSON()).not.toHaveProperty('hint');
  });

  it('recognises its own errors', () => {
    expect(isContentMachineError(new ToolError('E_CHECK_FAILED', 'x'))).toBe(true);
    expect(isContentMachineError(new Error('x'))).toBe(false);
    expect(new UserError('E_USAGE', 'x')).toBeInstanceOf(ContentMachineError);
  });

  it('has unique codes', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });
});

describe('fixedClock', () => {
  it('always returns the same instant', () => {
    const clock = fixedClock('2026-10-01T12:00:00Z');
    expect(clock.now().toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(clock.now()).not.toBe(clock.now());
  });

  it('rejects garbage', () => {
    expect(() => fixedClock('soon')).toThrow(RangeError);
  });
});
