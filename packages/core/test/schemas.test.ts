import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  fileNameSchema,
  isValidTimeZone,
  jsonSchemaFor,
  parseJsonText,
  parseWith,
  planSchema,
  projectNameSchema,
  projectSchema,
  SCHEMA_NAMES,
  isSchemaName,
  slotsSchema,
} from '@content-machine/core';

describe('projectNameSchema', () => {
  it.each(['bees', 'tiny-house-2', '0day'])('accepts %s', (name) => {
    expect(projectNameSchema.safeParse(name).success).toBe(true);
  });

  it.each(['Bees', '-bees', 'bees_2', '../etc', 'a/b', '', 'x'.repeat(65)])(
    'rejects %s',
    (name) => {
      expect(projectNameSchema.safeParse(name).success).toBe(false);
    },
  );
});

describe('fileNameSchema', () => {
  it('accepts plain names', () => {
    expect(fileNameSchema.safeParse('video 1.mp4').success).toBe(true);
  });

  it.each(['../secret.mp4', 'a/b.mp4', 'a\\b.mp4', '..', '.', 'x\0y'])('rejects %s', (name) => {
    expect(fileNameSchema.safeParse(name).success).toBe(false);
  });
});

describe('slotsSchema', () => {
  it('requires ascending unique times', () => {
    expect(slotsSchema.safeParse(['12:00', '17:00']).success).toBe(true);
    expect(slotsSchema.safeParse(['17:00', '12:00']).success).toBe(false);
    expect(slotsSchema.safeParse(['12:00', '12:00']).success).toBe(false);
    expect(slotsSchema.safeParse(['25:00']).success).toBe(false);
  });
});

describe('time zones', () => {
  it('validates IANA names', () => {
    expect(isValidTimeZone('America/Los_Angeles')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });
});

describe('parseWith', () => {
  it('fills defaults', () => {
    const project = parseWith(
      projectSchema,
      {
        schemaVersion: 1,
        name: 'bees',
        timezone: 'UTC',
        slots: ['12:00'],
        stagger: { tiktok: 0, instagram: 15, youtube: 30 },
      },
      'project.json',
    );
    expect(project.account).toBe('default');
    expect(project.handles).toEqual({ tiktok: '', instagram: '', youtube: '' });
  });

  it('reports every issue with its path and item id', () => {
    const bad = {
      schemaVersion: 1,
      mode: 'sequential',
      sources: [{ file: 'a.mp4', channel: 'C', platform: 'youtube' }],
      items: [
        { id: 1, source: 'a.mp4', start: 0, end: 10 },
        { id: 7, source: 'a.mp4', start: -1, end: 10 },
      ],
    };
    try {
      parseWith(planSchema, bad, 'plan.json');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const v = error as ValidationError;
      expect(v.code).toBe('E_SCHEMA');
      expect(v.exitCode).toBe(3);
      expect(v.issues[0]?.path).toBe('items[1].start');
      expect(v.issues[0]?.itemId).toBe(7);
    }
  });

  it('reports root level problems without a path', () => {
    expect(() => parseWith(planSchema, 'nope', 'plan.json')).toThrow(/plan.json is not valid/);
  });
});

describe('parseJsonText', () => {
  it('turns bad JSON into E_JSON_PARSE', () => {
    expect(() => parseJsonText(planSchema, '{ nope', 'plan.json')).toThrow(
      expect.objectContaining({ code: 'E_JSON_PARSE' }),
    );
  });
});

describe('JSON Schema export', () => {
  it.each(SCHEMA_NAMES)('exports %s', (name) => {
    const schema = jsonSchemaFor(name);
    expect(schema.$id).toContain(`${name}.schema.json`);
    expect(schema.type).toBe('object');
  });

  it('knows its schema names', () => {
    expect(isSchemaName('plan')).toBe(true);
    expect(isSchemaName('toString')).toBe(false);
  });
});
