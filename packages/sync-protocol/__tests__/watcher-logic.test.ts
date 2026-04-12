import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatcherOrchestrator } from '../src/watcher-logic.js';
import type { FileReaderPort, FileWatcherPort, SyncBroadcastPort, TimerPort, WatchHandle } from '../src/types.js';

// --- Mock ports ---

function createMockReader(): FileReaderPort {
  return {
    readFile: vi.fn(async () => '{}'),
    stat: vi.fn(async () => ({ mtimeMs: 1000 })),
    readdir: vi.fn(async () => []),
    exists: vi.fn(async () => true),
  };
}

function createMockWatcher(): FileWatcherPort & { _callbacks: Map<string, () => void> } {
  const callbacks = new Map<string, () => void>();
  return {
    _callbacks: callbacks,
    watchFile(path, cb) {
      callbacks.set(path, cb);
      return { close: vi.fn() };
    },
    watchDirectory(path, cb) {
      callbacks.set(path, cb);
      return { close: vi.fn() };
    },
  };
}

function createMockTimer(): TimerPort & { _flush: () => void } {
  const pending: Array<{ cb: () => void; ms: number }> = [];
  return {
    setTimeout(cb, ms) {
      pending.push({ cb, ms });
      return pending.length - 1;
    },
    clearTimeout() {},
    setInterval(cb, ms) {
      pending.push({ cb, ms });
      return pending.length - 1;
    },
    clearInterval() {},
    _flush() {
      const copy = [...pending];
      pending.length = 0;
      for (const { cb } of copy) cb();
    },
  };
}

const broadcastMessages: any[] = [];
function createMockBroadcast(): SyncBroadcastPort {
  return { send: vi.fn((msg) => { broadcastMessages.push(msg); }) };
}

describe('WatcherOrchestrator', () => {
  beforeEach(() => {
    broadcastMessages.length = 0;
  });

  it('starts watching and returns cleanup function', () => {
    const reader = createMockReader();
    const watcher = createMockWatcher();
    const broadcast = createMockBroadcast();
    const timer = createMockTimer();

    const orchestrator = new WatcherOrchestrator(reader, watcher, broadcast, timer);
    const cleanup = orchestrator.start('/project', [
      { path: '/project/state.json', type: 'state', isDir: false },
    ]);

    expect(typeof cleanup).toBe('function');
    expect(watcher._callbacks.size).toBe(1);
    cleanup();
  });

  it('broadcasts state on file change', async () => {
    const state = { _v: 1, project: 'test', tasks: [{ id: 1, name: 'T', status: 'pending' }] };
    const reader = createMockReader();
    reader.readFile = vi.fn(async () => JSON.stringify(state));
    const watcher = createMockWatcher();
    const broadcast = createMockBroadcast();
    const timer = createMockTimer();

    const orchestrator = new WatcherOrchestrator(reader, watcher, broadcast, timer, { debounceMs: 0 });
    orchestrator.start('/project', [
      { path: '/project/state.json', type: 'state', isDir: false },
    ]);

    // Trigger the file change callback
    const cb = watcher._callbacks.get('/project/state.json');
    cb?.();
    timer._flush();

    // Wait for the async onChange
    await vi.waitFor(() => {
      expect(broadcast.send).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'state', lastModified: 1000 })
      );
    });
  });

  it('rejects stale state versions', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reader = createMockReader();
    let callCount = 0;
    reader.readFile = vi.fn(async () => {
      callCount++;
      // First call: v=5, second call: v=3 (stale)
      return JSON.stringify({ _v: callCount === 1 ? 5 : 3, tasks: [] });
    });
    const watcher = createMockWatcher();
    const broadcast = createMockBroadcast();
    const timer = createMockTimer();

    const orchestrator = new WatcherOrchestrator(reader, watcher, broadcast, timer, { debounceMs: 0 });
    orchestrator.start('/project', [
      { path: '/project/state.json', type: 'state', isDir: false },
    ]);

    const cb = watcher._callbacks.get('/project/state.json');

    // First change (v=5)
    cb?.();
    timer._flush();
    await vi.waitFor(() => { expect(broadcast.send).toHaveBeenCalledTimes(1); });

    // Second change (v=3 — stale, should be rejected)
    cb?.();
    timer._flush();
    await new Promise(r => setTimeout(r, 10));
    expect(broadcast.send).toHaveBeenCalledTimes(1); // still 1
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Rejected stale'));
    warnSpy.mockRestore();
  });

  it('deduplicates identical content', async () => {
    const reader = createMockReader();
    reader.readFile = vi.fn(async () => JSON.stringify({ _v: 1, tasks: [] }));
    const watcher = createMockWatcher();
    const broadcast = createMockBroadcast();
    const timer = createMockTimer();

    const orchestrator = new WatcherOrchestrator(reader, watcher, broadcast, timer, { debounceMs: 0 });
    orchestrator.start('/project', [
      { path: '/project/state.json', type: 'state', isDir: false },
    ]);

    const cb = watcher._callbacks.get('/project/state.json');
    cb?.();
    timer._flush();
    await vi.waitFor(() => { expect(broadcast.send).toHaveBeenCalledTimes(1); });

    // Same content again — should skip
    cb?.();
    timer._flush();
    await new Promise(r => setTimeout(r, 10));
    expect(broadcast.send).toHaveBeenCalledTimes(1);
  });
});
