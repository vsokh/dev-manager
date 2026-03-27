// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock process.js
const mockLaunchProcess = vi.fn();
const mockListProcesses = vi.fn(() => []);
const mockGetAllOutput = vi.fn(() => ({}));
const mockKillProcess = vi.fn();

vi.mock('../../process.js', () => ({
  getProcessManager: () => ({
    launchProcess: mockLaunchProcess,
    listProcesses: mockListProcesses,
    getAllOutput: mockGetAllOutput,
    killProcess: mockKillProcess,
  }),
}));

// Mock index.js
vi.mock('../../index.js', () => ({
  broadcast: vi.fn(),
}));

// Mock child_process for terminal launch
const mockSpawn = vi.fn(() => {
  const proc = new EventEmitter();
  proc.unref = vi.fn();
  return proc;
});
const mockExecFile = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: (...args) => mockSpawn(...args),
  execFile: (...args) => mockExecFile(...args),
}));

import { handleLaunch } from '../../routes/launch.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  return { writeHead: vi.fn(), end: vi.fn() };
}

function mockReq(chunks = []) {
  const emitter = new EventEmitter();
  process.nextTick(() => {
    for (const chunk of chunks) emitter.emit('data', Buffer.from(chunk));
    emitter.emit('end');
  });
  return emitter;
}

function mockUrl(path) {
  return new URL(path, 'http://localhost');
}

function mockCtx(projectPath) {
  return {
    projectPath,
    getProjects: vi.fn(() => []),
    switchProject: vi.fn(),
  };
}

let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'launch-test-'));
  mockLaunchProcess.mockReset();
  mockListProcesses.mockReset().mockReturnValue([]);
  mockGetAllOutput.mockReset().mockReturnValue({});
  mockKillProcess.mockReset();
  mockSpawn.mockReset().mockReturnValue(Object.assign(new EventEmitter(), { unref: vi.fn() }));
});

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleLaunch', () => {
  it('returns false for non-matching routes', async () => {
    const res = mockRes();
    const result = await handleLaunch('GET', '/api/state', mockReq(), res, mockUrl('/api/state'), mockCtx(tmpDir));
    expect(result).toBe(false);
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  describe('POST /api/launch', () => {
    it('launches a process', async () => {
      mockLaunchProcess.mockReturnValue({ pid: 1234 });
      const res = mockRes();
      const req = mockReq([JSON.stringify({ taskId: 1, command: '/orchestrator task 1' })]);
      const result = await handleLaunch('POST', '/api/launch', req, res, mockUrl('/api/launch'), mockCtx(tmpDir));
      expect(result).toBe(true);
      expect(mockLaunchProcess).toHaveBeenCalled();
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.pid).toBe(1234);
    });

    it('returns 400 when taskId or command is missing', async () => {
      const res = mockRes();
      const req = mockReq([JSON.stringify({ command: 'test' })]);
      await handleLaunch('POST', '/api/launch', req, res, mockUrl('/api/launch'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
    });

    it('returns 400 when command is missing', async () => {
      const res = mockRes();
      const req = mockReq([JSON.stringify({ taskId: 1 })]);
      await handleLaunch('POST', '/api/launch', req, res, mockUrl('/api/launch'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
    });
  });

  describe('POST /api/launch/terminal', () => {
    it('returns 400 when command is missing', async () => {
      const res = mockRes();
      const req = mockReq([JSON.stringify({ taskId: 1 })]);
      await handleLaunch('POST', '/api/launch/terminal', req, res, mockUrl('/api/launch/terminal'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.error).toBe('Missing command');
    });

    it('launches a terminal process', async () => {
      const res = mockRes();
      const req = mockReq([JSON.stringify({ taskId: 1, command: '/orchestrator task 1', title: 'Test' })]);
      await handleLaunch('POST', '/api/launch/terminal', req, res, mockUrl('/api/launch/terminal'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.ok).toBe(true);
    });
  });

  describe('GET /api/launch', () => {
    it('returns list of running processes', async () => {
      mockListProcesses.mockReturnValue([{ pid: 1, taskId: 1 }]);
      const res = mockRes();
      const result = await handleLaunch('GET', '/api/launch', mockReq(), res, mockUrl('/api/launch'), mockCtx(tmpDir));
      expect(result).toBe(true);
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body).toEqual([{ pid: 1, taskId: 1 }]);
    });
  });

  describe('GET /api/launch/output', () => {
    it('returns all buffered output', async () => {
      mockGetAllOutput.mockReturnValue({ 1: { output: [], running: true } });
      const res = mockRes();
      const result = await handleLaunch('GET', '/api/launch/output', mockReq(), res, mockUrl('/api/launch/output'), mockCtx(tmpDir));
      expect(result).toBe(true);
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body).toEqual({ 1: { output: [], running: true } });
    });
  });

  describe('DELETE /api/launch/:pid', () => {
    it('kills a process', async () => {
      mockKillProcess.mockReturnValue(true);
      const res = mockRes();
      const result = await handleLaunch('DELETE', '/api/launch/1234', mockReq(), res, mockUrl('/api/launch/1234'), mockCtx(tmpDir));
      expect(result).toBe(true);
      expect(mockKillProcess).toHaveBeenCalledWith(1234);
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.ok).toBe(true);
    });

    it('returns 404 when process not found', async () => {
      mockKillProcess.mockReturnValue(false);
      const res = mockRes();
      await handleLaunch('DELETE', '/api/launch/9999', mockReq(), res, mockUrl('/api/launch/9999'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    });

    it('returns 400 for invalid PID', async () => {
      const res = mockRes();
      await handleLaunch('DELETE', '/api/launch/abc', mockReq(), res, mockUrl('/api/launch/abc'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.error).toBe('Invalid PID');
    });
  });
});
