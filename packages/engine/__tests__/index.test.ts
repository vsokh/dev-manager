import { describe, it, expect } from 'vitest';

describe('@dev-manager/engine', () => {
  it('exports from barrel', async () => {
    const engine = await import('../src/index.js');
    expect(engine).toBeDefined();
  });
});
