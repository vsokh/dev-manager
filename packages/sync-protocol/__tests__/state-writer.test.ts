import { describe, it, expect, vi } from 'vitest';
import { StateWriter } from '../src/state-writer.js';
import type { FileReaderPort, FileWriterPort } from '../src/types.js';
import type { StateData } from 'taskgraph';

function makeState(overrides: Partial<StateData> = {}): StateData {
  return {
    project: 'test',
    tasks: [{ id: 1, name: 'Task 1', status: 'pending' as const }],
    queue: [],
    taskNotes: {},
    activity: [],
    _v: 5,
    ...overrides,
  };
}

function createMockReader(content: string, mtimeMs = 1000): FileReaderPort {
  return {
    readFile: vi.fn(async () => content),
    stat: vi.fn(async () => ({ mtimeMs })),
    readdir: vi.fn(async () => []),
    exists: vi.fn(async () => true),
  };
}

function createMockWriter(): FileWriterPort {
  return {
    writeFile: vi.fn(async () => {}),
    ensureDir: vi.fn(async () => {}),
    unlink: vi.fn(async () => {}),
  };
}

describe('StateWriter', () => {
  describe('readState', () => {
    it('reads and validates state', async () => {
      const state = makeState();
      const reader = createMockReader(JSON.stringify(state), 2000);
      const writer = createMockWriter();
      const sw = new StateWriter(reader, writer);

      const result = await sw.readState('/path/state.json');
      expect(result).not.toBeNull();
      expect(result!.data.project).toBe('test');
      expect(result!.lastModified).toBe(2000);
    });

    it('returns null for missing file', async () => {
      const reader = createMockReader('');
      reader.readFile = vi.fn(async () => { const e = new Error('ENOENT') as any; e.code = 'ENOENT'; throw e; });
      const sw = new StateWriter(reader, createMockWriter());
      expect(await sw.readState('/path/state.json')).toBeNull();
    });

    it('returns null for invalid structure', async () => {
      const reader = createMockReader(JSON.stringify({ bad: true }));
      const sw = new StateWriter(reader, createMockWriter());
      expect(await sw.readState('/path/state.json')).toBeNull();
    });
  });

  describe('writeState', () => {
    it('writes state with incremented version', async () => {
      const state = makeState({ _v: 5 });
      const reader = createMockReader('', 3000);
      const writer = createMockWriter();
      const sw = new StateWriter(reader, writer);

      const result = await sw.writeState('/path/state.json', '/path', state);
      expect(result).toHaveProperty('ok', true);
      expect(writer.writeFile).toHaveBeenCalled();
      const written = JSON.parse((writer.writeFile as any).mock.calls[0][1]);
      expect(written._v).toBe(6);
    });

    it('detects conflict when disk is newer', async () => {
      const diskState = makeState({ _v: 10 });
      const reader = createMockReader(JSON.stringify(diskState), 5000);
      const writer = createMockWriter();
      const sw = new StateWriter(reader, writer);

      const incoming = { ...makeState(), _lastModified: 1000 };
      const result = await sw.writeState('/path/state.json', '/path', incoming as any);
      expect(result).toHaveProperty('conflict', true);
      expect(writer.writeFile).not.toHaveBeenCalled();
    });

    it('allows write when disk is older than _lastModified', async () => {
      const reader = createMockReader('', 500);
      const writer = createMockWriter();
      const sw = new StateWriter(reader, writer);

      const incoming = { ...makeState(), _lastModified: 1000 };
      const result = await sw.writeState('/path/state.json', '/path', incoming as any);
      expect(result).toHaveProperty('ok', true);
    });

    it('rejects invalid structure', async () => {
      const reader = createMockReader('');
      const writer = createMockWriter();
      const sw = new StateWriter(reader, writer);

      const result = await sw.writeState('/path/state.json', '/path', { bad: true } as any);
      expect(result).toHaveProperty('error');
    });
  });

  describe('readProgress', () => {
    it('reads and validates progress files', async () => {
      const reader = createMockReader('');
      reader.readdir = vi.fn(async () => ['1.json', '2.json']);
      reader.readFile = vi.fn(async (path: string) => {
        if (path.includes('1.json')) return JSON.stringify({ status: 'done', commitRef: 'abc' });
        return JSON.stringify({ status: 'in-progress', progress: 'Working...' });
      });
      const sw = new StateWriter(reader, createMockWriter());

      const result = await sw.readProgress('/progress');
      expect(result['1'].status).toBe('done');
      expect(result['2'].status).toBe('in-progress');
    });

    it('skips invalid entries', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const reader = createMockReader('');
      reader.readdir = vi.fn(async () => ['bad.json']);
      reader.readFile = vi.fn(async () => JSON.stringify({ invalid: true }));
      const sw = new StateWriter(reader, createMockWriter());

      const result = await sw.readProgress('/progress');
      expect(Object.keys(result)).toHaveLength(0);
      vi.restoreAllMocks();
    });
  });

  describe('deleteProgress', () => {
    it('deletes a progress file', async () => {
      const writer = createMockWriter();
      const sw = new StateWriter(createMockReader(''), writer);
      const result = await sw.deleteProgress('/progress', 42);
      expect(result).toBe(true);
      expect(writer.unlink).toHaveBeenCalled();
    });

    it('returns false for missing file', async () => {
      const writer = createMockWriter();
      writer.unlink = vi.fn(async () => { const e = new Error('ENOENT') as any; e.code = 'ENOENT'; throw e; });
      const sw = new StateWriter(createMockReader(''), writer);
      expect(await sw.deleteProgress('/progress', 999)).toBe(false);
    });
  });
});
