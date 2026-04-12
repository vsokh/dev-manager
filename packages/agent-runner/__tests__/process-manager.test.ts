import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessManager } from '../src/process-manager.js';
import type { SpawnPort, ProcessHandle, BroadcastPort, ProgressWriterPort, AgentEvent } from '../src/types.js';

// --- Mock ports ---

function createMockHandle(pid = 1): ProcessHandle & {
  _triggerStdout: (text: string) => void;
  _triggerStderr: (text: string) => void;
  _triggerClose: (code: number | null) => void;
  _triggerError: (err: Error) => void;
} {
  let stdoutCb: ((text: string) => void) | null = null;
  let stderrCb: ((text: string) => void) | null = null;
  let closeCb: ((code: number | null) => void) | null = null;
  let errorCb: ((err: Error) => void) | null = null;

  return {
    pid,
    onStdout(cb) { stdoutCb = cb; },
    onStderr(cb) { stderrCb = cb; },
    onClose(cb) { closeCb = cb; },
    onError(cb) { errorCb = cb; },
    kill: vi.fn(),
    _triggerStdout: (text: string) => stdoutCb?.(text),
    _triggerStderr: (text: string) => stderrCb?.(text),
    _triggerClose: (code: number | null) => closeCb?.(code),
    _triggerError: (err: Error) => errorCb?.(err),
  };
}

let mockHandle: ReturnType<typeof createMockHandle>;
let pidCounter: number;

const mockSpawner: SpawnPort = {
  spawn: vi.fn(() => {
    mockHandle = createMockHandle(pidCounter++);
    return mockHandle;
  }),
};

const mockProgressWriter: ProgressWriterPort = {
  wasRecentlyWritten: vi.fn(async () => false),
  writeFallbackProgress: vi.fn(async () => {}),
};

const broadcastMessages: AgentEvent[] = [];
const mockBroadcast: BroadcastPort = {
  send: vi.fn((msg: AgentEvent) => { broadcastMessages.push(msg); }),
};

const testEngines = {
  test: (command: string) => ({ cmd: 'test-agent', args: ['-c', command] }),
};

describe('ProcessManager', () => {
  let pm: ProcessManager;

  beforeEach(() => {
    pidCounter = 100;
    broadcastMessages.length = 0;
    vi.clearAllMocks();
    pm = new ProcessManager(mockSpawner, mockProgressWriter, mockBroadcast, testEngines);
  });

  it('launches a process and returns pid', () => {
    const result = pm.launchProcess('/project', 1, 'do stuff', 'test');
    expect(result.pid).toBe(100);
    expect(mockSpawner.spawn).toHaveBeenCalledWith('test-agent', ['-c', 'do stuff'], { cwd: '/project' });
  });

  it('rejects duplicate task launch', () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    expect(() => pm.launchProcess('/project', 1, 'cmd', 'test')).toThrow('already running');
  });

  it('rejects unknown engine', () => {
    expect(() => pm.launchProcess('/project', 1, 'cmd', 'unknown')).toThrow('Unknown engine');
  });

  it('lists running processes', () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    const list = pm.listProcesses();
    expect(list).toHaveLength(1);
    expect(list[0].taskId).toBe(1);
    expect(list[0].pid).toBe(100);
  });

  it('broadcasts stdout', () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerStdout('hello world');
    expect(broadcastMessages).toContainEqual(
      expect.objectContaining({ type: 'output', taskId: 1, text: 'hello world' })
    );
  });

  it('broadcasts stderr with stream flag', () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerStderr('error msg');
    expect(broadcastMessages).toContainEqual(
      expect.objectContaining({ type: 'output', taskId: 1, text: 'error msg', stream: 'stderr' })
    );
  });

  it('handles exit and broadcasts', async () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerClose(0);
    // Wait for async progress writer check
    await vi.waitFor(() => {
      expect(broadcastMessages).toContainEqual(
        expect.objectContaining({ type: 'exit', taskId: 1, code: 0 })
      );
    });
    expect(pm.listProcesses()).toHaveLength(0);
  });

  it('writes fallback progress on non-zero exit', async () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerClose(1);
    await vi.waitFor(() => {
      expect(mockProgressWriter.writeFallbackProgress).toHaveBeenCalledWith(
        '/project', 1,
        expect.objectContaining({ status: 'in-progress' })
      );
    });
  });

  it('skips fallback progress if orchestrator already wrote', async () => {
    (mockProgressWriter.wasRecentlyWritten as any).mockResolvedValueOnce(true);
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerClose(1);
    await vi.waitFor(() => {
      expect(broadcastMessages.some(m => m.type === 'exit')).toBe(true);
    });
    expect(mockProgressWriter.writeFallbackProgress).not.toHaveBeenCalled();
  });

  it('kills a process', () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    expect(pm.killProcess(100)).toBe(true);
    expect(mockHandle.kill).toHaveBeenCalled();
    expect(pm.listProcesses()).toHaveLength(0);
  });

  it('returns false for killing unknown pid', () => {
    expect(pm.killProcess(999)).toBe(false);
  });

  it('getOutput returns running task output', () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerStdout('line 1');
    const output = pm.getOutput(1);
    expect(output?.running).toBe(true);
    expect(output?.output).toHaveLength(1);
  });

  it('getOutput returns finished task output', async () => {
    pm.launchProcess('/project', 1, 'cmd', 'test');
    mockHandle._triggerStdout('line 1');
    mockHandle._triggerClose(0);
    await vi.waitFor(() => {
      const output = pm.getOutput(1);
      expect(output?.running).toBe(false);
      expect(output?.exitCode).toBe(0);
    });
  });

  it('returns null for unknown task', () => {
    expect(pm.getOutput(999)).toBeNull();
  });

  it('killAll kills all processes', () => {
    pm.launchProcess('/project', 1, 'cmd1', 'test');
    const handle1 = mockHandle;
    pm.launchProcess('/project', 2, 'cmd2', 'test');
    const handle2 = mockHandle;
    pm.killAll();
    expect(handle1.kill).toHaveBeenCalled();
    expect(handle2.kill).toHaveBeenCalled();
    expect(pm.listProcesses()).toHaveLength(0);
  });
});
