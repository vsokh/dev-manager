import { describe, it, expect } from 'vitest';
import { inferArtifacts } from '../src/graph/inference.js';

describe('inferArtifacts', () => {
  it('returns empty for empty or missing input', () => {
    expect(inferArtifacts('')).toEqual({ produces: [], consumes: [] });
    expect(inferArtifacts(null as unknown as string)).toEqual({ produces: [], consumes: [] });
  });

  it('detects produces from authoring verbs', () => {
    const r = inferArtifacts('Draft docs/merge-safety-audit.md with findings.');
    expect(r.produces).toEqual(['docs/merge-safety-audit.md']);
    expect(r.consumes).toEqual([]);
  });

  it('detects consumes from reading verbs', () => {
    const r = inferArtifacts('Implement feature per docs/coding-standards.md.');
    expect(r.consumes).toEqual(['docs/coding-standards.md']);
    expect(r.produces).toEqual([]);
  });

  it('prefers produces when both verbs surround the same path', () => {
    const r = inferArtifacts('Read and update docs/plan.md to create docs/plan.md with the new plan.');
    expect(r.produces).toContain('docs/plan.md');
    expect(r.consumes).not.toContain('docs/plan.md');
  });

  it('ignores paths not under a known prefix', () => {
    const r = inferArtifacts('Draft src/foo.ts with logic.');
    expect(r).toEqual({ produces: [], consumes: [] });
  });

  it('requires a verb — a bare path is not inferred', () => {
    const r = inferArtifacts('See docs/x.md for background.');
    // "See" isn't in our verb lists → neither
    expect(r).toEqual({ produces: [], consumes: [] });
  });

  it('handles multiple sentences independently', () => {
    const r = inferArtifacts('Produce docs/a.md. Consume docs/b.md.');
    expect(r.produces).toEqual(['docs/a.md']);
    expect(r.consumes).toEqual(['docs/b.md']);
  });
});
