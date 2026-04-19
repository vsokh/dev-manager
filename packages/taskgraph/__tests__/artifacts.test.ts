import { describe, it, expect } from 'vitest';
import { resolveArtifactGraph, applyArtifactDeps } from '../src/graph/artifacts.js';
import type { Task } from '../src/types.js';

const t = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  name: `t${id}`,
  status: 'pending',
  ...overrides,
});

describe('resolveArtifactGraph', () => {
  it('returns empty graph for tasks with no produces/consumes', () => {
    const g = resolveArtifactGraph([t(1), t(2)]);
    expect(g.errors).toEqual([]);
    expect(g.deps.size).toBe(0);
    expect(g.producers.size).toBe(0);
  });

  it('derives deps from consumes → producer', () => {
    const tasks = [
      t(1, { produces: ['docs/audit.md'] }),
      t(2, { consumes: ['docs/audit.md'] }),
    ];
    const g = resolveArtifactGraph(tasks);
    expect(g.errors).toEqual([]);
    expect(g.producers.get('docs/audit.md')).toBe(1);
    expect([...(g.deps.get(2) ?? [])]).toEqual([1]);
  });

  it('normalizes paths (backslashes and ./)', () => {
    const tasks = [
      t(1, { produces: ['docs\\a.md'] }),
      t(2, { consumes: ['./docs/a.md'] }),
    ];
    const g = resolveArtifactGraph(tasks);
    expect(g.errors).toEqual([]);
    expect(g.producers.has('docs/a.md')).toBe(true);
    expect([...(g.deps.get(2) ?? [])]).toEqual([1]);
  });

  it('reports multiple_producers', () => {
    const tasks = [
      t(1, { produces: ['docs/x.md'] }),
      t(2, { produces: ['docs/x.md'] }),
    ];
    const g = resolveArtifactGraph(tasks);
    const err = g.errors.find(e => e.kind === 'multiple_producers');
    expect(err).toBeDefined();
    expect(err?.artifact).toBe('docs/x.md');
    expect(err?.taskIds.sort()).toEqual([1, 2]);
  });

  it('reports missing_producer', () => {
    const tasks = [t(1, { consumes: ['docs/ghost.md'] })];
    const g = resolveArtifactGraph(tasks);
    const err = g.errors.find(e => e.kind === 'missing_producer');
    expect(err?.artifact).toBe('docs/ghost.md');
    expect(err?.taskIds).toEqual([1]);
  });

  it('reports self_consume and does not induce a self-edge', () => {
    const tasks = [t(1, { produces: ['x.md'], consumes: ['x.md'] })];
    const g = resolveArtifactGraph(tasks);
    expect(g.errors.some(e => e.kind === 'self_consume')).toBe(true);
    expect(g.deps.get(1) ?? new Set()).toEqual(new Set());
  });

  it('reports cycle in the combined graph (artifact edges + dependsOn)', () => {
    // 1 depends on 2 manually; 2 consumes an artifact produced by 1 → cycle
    const tasks = [
      t(1, { dependsOn: [2], produces: ['docs/a.md'] }),
      t(2, { consumes: ['docs/a.md'] }),
    ];
    const g = resolveArtifactGraph(tasks);
    expect(g.errors.some(e => e.kind === 'cycle')).toBe(true);
  });

  it('happy path: transitive chain', () => {
    const tasks = [
      t(1, { produces: ['a.md'] }),
      t(2, { produces: ['b.md'], consumes: ['a.md'] }),
      t(3, { consumes: ['b.md'] }),
    ];
    const g = resolveArtifactGraph(tasks);
    expect(g.errors).toEqual([]);
    expect([...(g.deps.get(2) ?? [])]).toEqual([1]);
    expect([...(g.deps.get(3) ?? [])]).toEqual([2]);
  });
});

describe('applyArtifactDeps', () => {
  it('merges derived deps with existing dependsOn', () => {
    const tasks = [
      t(1, { produces: ['a.md'] }),
      t(2, { consumes: ['a.md'], dependsOn: [99] }),
    ];
    const out = applyArtifactDeps(tasks);
    const merged = out.find(x => x.id === 2)!.dependsOn!;
    expect(new Set(merged)).toEqual(new Set([99, 1]));
  });

  it('is a no-op when no artifact deps exist', () => {
    const tasks = [t(1), t(2, { dependsOn: [1] })];
    const out = applyArtifactDeps(tasks);
    expect(out).toBe(tasks);
  });

  it('deduplicates redundant manual dependsOn', () => {
    const tasks = [
      t(1, { produces: ['a.md'] }),
      t(2, { consumes: ['a.md'], dependsOn: [1] }),
    ];
    const out = applyArtifactDeps(tasks);
    expect(out.find(x => x.id === 2)!.dependsOn).toEqual([1]);
  });
});
