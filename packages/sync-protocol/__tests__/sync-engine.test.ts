import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../src/sync-engine.js';
import type { StatePersistencePort, TimerPort } from '../src/types.js';
import type { StateData, ProgressEntry } from 'taskgraph';

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

function createMockPersistence(): StatePersistencePort {
  return {
    writeState: vi.fn(async () => ({ ok: true, lastModified: Date.now() })),
    readProgressFiles: vi.fn(async () => ({})),
    deleteProgressFile: vi.fn(async () => {}),
  };
}

function createMockTimer(): TimerPort & { _flush: () => void } {
  const pending: Array<{ cb: () => void }> = [];
  let nextId = 1; // start at 1 to avoid falsy 0
  return {
    setTimeout(cb) { const id = nextId++; pending.push({ cb }); return id; },
    clearTimeout() {},
    setInterval(cb) { const id = nextId++; pending.push({ cb }); return id; },
    clearInterval() {},
    _flush() {
      const copy = [...pending];
      pending.length = 0;
      for (const { cb } of copy) cb();
    },
  };
}

describe('SyncEngine', () => {
  let persistence: StatePersistencePort;
  let timer: ReturnType<typeof createMockTimer>;
  let engine: SyncEngine;

  beforeEach(() => {
    persistence = createMockPersistence();
    timer = createMockTimer();
    engine = new SyncEngine(persistence, timer, { saveDebounceMs: 0 });
  });

  describe('save', () => {
    it('updates state immediately', () => {
      const state = makeState();
      engine.save(state);
      expect(engine.getState()).not.toBeNull();
      expect(engine.getState()!.savedAt).toBeTruthy();
    });

    it('persists after debounce', async () => {
      engine.save(makeState());
      expect(persistence.writeState).not.toHaveBeenCalled();
      timer._flush();
      await vi.waitFor(() => {
        expect(persistence.writeState).toHaveBeenCalled();
      });
    });

    it('notifies state listeners', () => {
      const listener = vi.fn();
      engine.onStateChange(listener);
      engine.save(makeState());
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('handleMessage — state', () => {
    it('accepts newer state', () => {
      engine.setState(makeState({ _v: 3 }), 1000);
      const handled = engine.handleMessage({
        type: 'state',
        data: makeState({ _v: 5, project: 'updated' }),
        lastModified: 5000,
      });
      expect(handled).toBe(true);
      expect(engine.getState()!.project).toBe('updated');
    });

    it('rejects stale version', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      engine.setState(makeState({ _v: 10 }), 1000);
      engine.handleMessage({
        type: 'state',
        data: makeState({ _v: 3 }),
        lastModified: 5000,
      });
      expect(engine.getState()!._v).toBe(10); // unchanged
      vi.restoreAllMocks();
    });

    it('protects done tasks from regression', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      engine.setState(makeState({
        _v: 5,
        tasks: [{ id: 1, name: 'T', status: 'done', completedAt: '2026-01-01' }],
      }), 1000);

      engine.handleMessage({
        type: 'state',
        data: makeState({
          _v: 6,
          tasks: [{ id: 1, name: 'T', status: 'in-progress' }],
        }),
        lastModified: 5000,
      });

      expect(engine.getState()!.tasks[0].status).toBe('done');
      vi.restoreAllMocks();
    });
  });

  describe('handleMessage — progress', () => {
    it('merges progress and updates state', () => {
      engine.setState(makeState({
        tasks: [{ id: 1, name: 'T', status: 'in-progress' }],
        queue: [{ task: 1, taskName: 'T' }],
      }));

      engine.handleMessage({
        type: 'progress',
        data: { '1': { status: 'done', commitRef: 'abc', completedAt: '2026-01-01' } },
      });

      expect(engine.getState()!.tasks[0].status).toBe('done');
      expect(engine.getState()!.queue).toHaveLength(0);
    });

    it('cleans up stale progress files', () => {
      engine.setState(makeState({
        tasks: [{ id: 1, name: 'T', status: 'done', completedAt: '2026-01-01' }],
      }));

      engine.handleMessage({
        type: 'progress',
        data: { '1': { status: 'in-progress', progress: 'stale' } },
      });

      expect(persistence.deleteProgressFile).toHaveBeenCalledWith(1);
    });
  });

  describe('flush', () => {
    it('writes immediately if save is pending', async () => {
      engine.save(makeState());
      expect(persistence.writeState).not.toHaveBeenCalled();
      await engine.flush();
      expect(persistence.writeState).toHaveBeenCalled();
    });
  });

  describe('subscriptions', () => {
    it('unsubscribe stops notifications', () => {
      const listener = vi.fn();
      const unsub = engine.onStateChange(listener);
      engine.save(makeState());
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
      engine.save(makeState());
      expect(listener).toHaveBeenCalledTimes(1); // still 1
    });
  });
});
