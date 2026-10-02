import { describe, expect, it } from 'vitest';
import { assertProjectName, ledgerPaths, projectPaths, safeJoin } from '../src/project/paths.js';
import {
  parseIds,
  parsePlatforms,
  parsePositiveInt,
  parseSeconds,
  parseStatus,
} from '../src/commands/shared.js';
import { overlay } from '../src/config/load.js';
import { openerFor } from '../src/io/open-browser.js';

describe('project paths', () => {
  it('validates names and lays out folders', () => {
    expect(assertProjectName('tiny-house')).toBe('tiny-house');
    expect(() => assertProjectName('Tiny House')).toThrow(
      expect.objectContaining({ code: 'E_INVALID_PROJECT_NAME', exitCode: 2 }),
    );
    const paths = projectPaths('/repo', 'bees');
    expect(paths.root).toBe('/repo/projects/bees');
    expect(paths.schedule).toBe('/repo/projects/bees/plan/schedule.json');
    expect(paths.renderLog).toBe('/repo/projects/bees/work/render-log.json');
    expect(ledgerPaths('/repo').ledger).toBe('/repo/schedule-ledger.json');
  });

  it('rejects path traversal', () => {
    expect(safeJoin('/repo/projects/bees/source', 'a.mp4')).toBe(
      '/repo/projects/bees/source/a.mp4',
    );
    expect(() => safeJoin('/repo/projects/bees/source', '../../../etc/passwd')).toThrow(
      expect.objectContaining({ code: 'E_PATH_TRAVERSAL' }),
    );
    expect(() => safeJoin('/repo/source', '/etc/passwd')).toThrow(
      expect.objectContaining({ code: 'E_PATH_TRAVERSAL' }),
    );
    expect(() => projectPaths('/repo', '../escape')).toThrow(
      expect.objectContaining({ code: 'E_INVALID_PROJECT_NAME' }),
    );
  });
});

describe('argument parsers', () => {
  it('parses id lists and ranges', () => {
    expect(parseIds('3')).toEqual([3]);
    expect(parseIds('5, 1,2-4')).toEqual([1, 2, 3, 4, 5]);
    expect(() => parseIds('4-2')).toThrow(/backwards/);
    expect(() => parseIds('x')).toThrow(/not an item id/);
  });

  it('parses platforms, statuses and numbers', () => {
    expect(parsePlatforms('all')).toEqual(['tiktok', 'instagram', 'youtube']);
    expect(parsePlatforms('youtube')).toEqual(['youtube']);
    expect(() => parsePlatforms('vine')).toThrow(/Use one of/);
    expect(parseStatus('posted')).toBe('posted');
    expect(() => parseStatus('live')).toThrow(/Use one of/);
    expect(parsePositiveInt('2')).toBe(2);
    expect(() => parsePositiveInt('0')).toThrow();
    expect(parseSeconds('1.5')).toBe(1.5);
    expect(() => parseSeconds('-1')).toThrow();
  });
});

describe('config overlay', () => {
  it('only applies keys that are set', () => {
    expect(overlay({ a: 1, b: 2 }, { a: 5, b: undefined })).toEqual({ a: 5, b: 2 });
    expect(overlay({ a: 1 }, undefined)).toEqual({ a: 1 });
  });
});

describe('openerFor', () => {
  it('knows each OS', () => {
    expect(openerFor('darwin').command).toBe('open');
    expect(openerFor('linux').command).toBe('xdg-open');
    expect(openerFor('win32')).toEqual({ command: 'cmd', args: ['/c', 'start', '""'] });
  });
});
