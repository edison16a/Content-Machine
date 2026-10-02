import { mkdtemp, rm, writeFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ValidationError } from '@content-machine/core';
import { withLock } from '../src/io/lock.js';
import { Capture } from './helpers.js';

describe('Output', () => {
  it('prints human results and logs to separate streams', () => {
    const c = new Capture();
    c.out.info('working');
    c.out.warn('careful');
    c.out.debug('hidden');
    c.out.result('x', { a: 1 }, () => ['done']);
    expect(c.stdout).toBe('done\n');
    expect(c.stderr).toBe('working\nWarning: careful\n');
  });

  it('prints JSON results and errors with codes', () => {
    const c = new Capture(true);
    c.out.result('x', { a: 1 }, () => ['ignored']);
    expect(JSON.parse(c.stdout)).toEqual({ ok: true, command: 'x', data: { a: 1 } });
    const fail = new Capture(true);
    const code = fail.out.failure(
      new ValidationError('E_PLAN_GAP', 'Gap', {
        hint: 'Close it',
        issues: [{ code: 'E_PLAN_GAP', message: 'm', itemId: 2 }],
      }),
    );
    expect(code).toBe(3);
    expect(JSON.parse(fail.stdout)).toMatchObject({
      ok: false,
      error: { code: 'E_PLAN_GAP', hint: 'Close it' },
    });
  });

  it('treats unknown errors as exit 1', () => {
    const c = new Capture();
    expect(c.out.failure(new Error('boom'))).toBe(1);
    expect(c.stderr).toContain('Error [E_UNEXPECTED]: boom');
    const json = new Capture(true);
    expect(json.out.failure('weird')).toBe(1);
    expect(JSON.parse(json.stdout)).toMatchObject({ error: { code: 'E_UNEXPECTED' } });
  });
});

describe('withLock', () => {
  it('serializes concurrent work and cleans up', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-lock-'));
    const lock = join(dir, 'x.lock');
    const order: string[] = [];
    const task = (name: string) =>
      withLock(lock, async () => {
        order.push(`${name}-start`);
        await new Promise((r) => setTimeout(r, 50));
        order.push(`${name}-end`);
      });
    await Promise.all([task('a'), task('b')]);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
    await writeFile(lock, 'old');
    const old = new Date(Date.now() - 10 * 60_000);
    await utimes(lock, old, old);
    expect(await withLock(lock, () => Promise.resolve('took over'))).toBe('took over');
    await rm(dir, { recursive: true, force: true });
  });
});
