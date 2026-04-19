import { describe, it, expect } from 'vitest';
import { validateProducedArtifacts } from '../src/graph/produced.js';

describe('validateProducedArtifacts', () => {
  it('returns ok with empty arrays when produces is undefined', () => {
    const r = validateProducedArtifacts(undefined, () => ({ exists: true, bytes: 1 }));
    expect(r.ok).toBe(true);
    expect(r.producedArtifacts).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.empty).toEqual([]);
  });

  it('stamps SHA + bytes for valid files', () => {
    const r = validateProducedArtifacts(['a.md'], () => ({ exists: true, bytes: 42, sha: 'abc' }));
    expect(r.ok).toBe(true);
    expect(r.producedArtifacts).toEqual([{ path: 'a.md', sha: 'abc', bytes: 42 }]);
  });

  it('reports missing files', () => {
    const r = validateProducedArtifacts(['ghost.md'], () => ({ exists: false, bytes: 0 }));
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(['ghost.md']);
  });

  it('reports empty files', () => {
    const r = validateProducedArtifacts(['empty.md'], () => ({ exists: true, bytes: 0 }));
    expect(r.ok).toBe(false);
    expect(r.empty).toEqual(['empty.md']);
  });

  it('normalizes backslashes and dedupes', () => {
    const calls: string[] = [];
    const r = validateProducedArtifacts(['docs\\a.md', 'docs/a.md'], (p) => {
      calls.push(p);
      return { exists: true, bytes: 1, sha: 'x' };
    });
    expect(calls).toEqual(['docs/a.md']);
    expect(r.producedArtifacts.length).toBe(1);
  });

  it('is partial-ok: stamps present artifacts even when others are missing', () => {
    const r = validateProducedArtifacts(['a.md', 'b.md'], (p) => {
      if (p === 'a.md') return { exists: true, bytes: 10, sha: 'h' };
      return { exists: false, bytes: 0 };
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(['b.md']);
    expect(r.producedArtifacts).toEqual([{ path: 'a.md', sha: 'h', bytes: 10 }]);
  });
});
