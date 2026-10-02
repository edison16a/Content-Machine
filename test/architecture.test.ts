import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { boundaryViolations, cycles, importsOf, readSources } from './architecture.js';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('architecture', () => {
  const files = readSources(root);

  it('reads every package', () => {
    const packages = new Set(Object.keys(files).map((path) => path.split('/')[1]));
    expect([...packages].sort()).toEqual(['cli', 'core', 'dashboard', 'render']);
  });

  it('keeps the dependency direction cli -> render/dashboard -> core and a pure core', () => {
    expect(boundaryViolations(files)).toEqual([]);
  });

  it('has no circular imports', () => {
    expect(cycles(files)).toEqual([]);
  });

  it('catches violations when they happen', () => {
    const bad = {
      'packages/core/src/a.ts':
        "import { readFile } from 'node:fs/promises';\nimport { x } from '@content-machine/render';\nimport { b } from './b.js';",
      'packages/core/src/b.ts': "export { a } from './a.js';",
      'packages/render/src/c.ts': "import { run } from '@content-machine/cli';",
      'packages/dashboard/src/client/d.ts': "const m = import('node:path');",
    };
    expect(boundaryViolations(bad)).toHaveLength(4);
    expect(cycles(bad)).toEqual([
      'packages/core/src/a.ts -> packages/core/src/b.ts -> packages/core/src/a.ts',
    ]);
    expect(importsOf("export * from './x.js';\nimport type { Y } from 'y';")).toEqual([
      './x.js',
      'y',
    ]);
  });
});
