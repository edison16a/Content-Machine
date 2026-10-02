import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/** Which workspace packages each package may import. */
export const ALLOWED: Record<string, readonly string[]> = {
  core: [],
  render: ['core'],
  dashboard: ['core'],
  cli: ['core', 'render', 'dashboard'],
};

/** Node modules that would give `core` side effects. */
const IMPURE = /^(node:)?(fs|fs\/promises|child_process|os|net|http|https|worker_threads|process)$/;

export type SourceMap = Record<string, string>;

/** Every .ts file under packages/<pkg>/src, keyed by repo-relative path. */
export function readSources(root: string): SourceMap {
  const files: SourceMap = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts')) files[relative(root, path)] = readFileSync(path, 'utf8');
    }
  };
  for (const pkg of Object.keys(ALLOWED)) walk(join(root, 'packages', pkg, 'src'));
  return files;
}

export function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(
    /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g,
  )) {
    const spec = match[1] ?? match[2];
    if (spec !== undefined) specifiers.push(spec);
  }
  return specifiers;
}

/** Problems with package boundaries and purity. Empty means the rules hold. */
export function boundaryViolations(files: SourceMap): string[] {
  const problems: string[] = [];
  for (const [path, source] of Object.entries(files)) {
    const pkg = path.split('/')[1] ?? '';
    const client = path.includes('/src/client/') || path.includes('/src/shared/');
    for (const spec of importsOf(source)) {
      const target = /^@content-machine\/([^/]+)/.exec(spec)?.[1];
      if (target !== undefined && target !== pkg && !(ALLOWED[pkg] ?? []).includes(target)) {
        problems.push(
          `${path} imports @content-machine/${target}, which ${pkg} may not depend on.`,
        );
      }
      if (pkg === 'core' && IMPURE.test(spec))
        problems.push(`${path} imports ${spec}; core must stay pure.`);
      if (client && spec.startsWith('node:'))
        problems.push(`${path} is browser code but imports ${spec}.`);
    }
  }
  return problems;
}

/** Relative-import cycles inside the packages, as "a -> b -> a" chains. */
export function cycles(files: SourceMap): string[] {
  const graph = new Map<string, string[]>();
  for (const [path, source] of Object.entries(files)) {
    const edges = importsOf(source)
      .filter((spec) => spec.startsWith('.'))
      .map((spec) =>
        relative(resolve('/'), resolve('/', dirname(path), spec.replace(/\.js$/, '.ts'))),
      )
      .filter((target) => target in files);
    graph.set(path, edges);
  }
  const found: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (node: string, trail: string[]): void => {
    if (state.get(node) === 'done') return;
    if (state.get(node) === 'visiting') {
      found.push([...trail.slice(trail.indexOf(node)), node].join(' -> '));
      return;
    }
    state.set(node, 'visiting');
    for (const next of graph.get(node) ?? []) visit(next, [...trail, node]);
    state.set(node, 'done');
  };
  for (const node of graph.keys()) visit(node, []);
  return found;
}
