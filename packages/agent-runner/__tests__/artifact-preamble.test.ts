import { describe, it, expect } from 'vitest';
import { buildArtifactPreamble, type ArtifactReadResult } from '../src/artifact-preamble.js';

const reader = (map: Record<string, ArtifactReadResult>) => (p: string) => map[p] ?? { kind: 'missing' as const };

describe('buildArtifactPreamble', () => {
  it('returns empty string when consumes is empty', () => {
    expect(buildArtifactPreamble({ consumes: [], readArtifact: () => ({ kind: 'missing' }) })).toBe('');
  });

  it('inlines a text artifact verbatim in a fenced block', () => {
    const out = buildArtifactPreamble({
      consumes: ['docs/a.md'],
      readArtifact: reader({ 'docs/a.md': { kind: 'ok', content: 'hello\nworld', bytes: 11 } }),
    });
    expect(out).toContain('### docs/a.md');
    expect(out).toContain('hello\nworld');
    expect(out).toContain('Do NOT start work until you have read them');
    expect(out.trim().endsWith('---')).toBe(true);
  });

  it('marks missing artifacts as artifact_stale and blocks proceeding', () => {
    const out = buildArtifactPreamble({
      consumes: ['docs/ghost.md'],
      readArtifact: () => ({ kind: 'missing' }),
    });
    expect(out).toContain('MISSING');
    expect(out).toContain('artifact_stale');
  });

  it('skips binary extensions with a Read-tool hint', () => {
    const out = buildArtifactPreamble({
      consumes: ['Assets/thing.prefab'],
      readArtifact: reader({ 'Assets/thing.prefab': { kind: 'ok', content: '<binary>', bytes: 500 } }),
    });
    expect(out).toContain('BINARY artifact');
    expect(out).toContain('Read tool');
    expect(out).not.toContain('<binary>');
  });

  it('truncates large text artifacts to N lines with a clear notice', () => {
    const lines = Array.from({ length: 300 }, (_, i) => `line ${i}`);
    const content = lines.join('\n');
    const out = buildArtifactPreamble({
      consumes: ['docs/big.md'],
      readArtifact: reader({ 'docs/big.md': { kind: 'ok', content, bytes: 200_000 } }),
      maxInlineBytes: 100_000,
      previewLines: 50,
    });
    expect(out).toContain('truncated to the first 50 lines');
    expect(out).toContain('line 0');
    expect(out).toContain('line 49');
    expect(out).not.toContain('line 50');
    expect(out).toContain('Read tool');
  });

  it('surfaces read errors instead of throwing', () => {
    const out = buildArtifactPreamble({
      consumes: ['docs/x.md'],
      readArtifact: () => ({ kind: 'error', message: 'EACCES' }),
    });
    expect(out).toContain('ERROR reading artifact: EACCES');
  });

  it('preserves consume order', () => {
    const out = buildArtifactPreamble({
      consumes: ['second.md', 'first.md'],
      readArtifact: reader({
        'first.md': { kind: 'ok', content: 'F', bytes: 1 },
        'second.md': { kind: 'ok', content: 'S', bytes: 1 },
      }),
    });
    expect(out.indexOf('### second.md')).toBeLessThan(out.indexOf('### first.md'));
  });
});
