// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock child_process
const mockExecFile = vi.fn();
vi.mock('node:child_process', () => ({
  execFile: (...args) => mockExecFile(...args),
}));

import { handleGit } from '../../routes/git.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  return { writeHead: vi.fn(), end: vi.fn() };
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
  tmpDir = await mkdtemp(join(tmpdir(), 'git-test-'));
  mockExecFile.mockReset();
});

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('handleGit', () => {
  it('returns false for non-matching routes', async () => {
    const res = mockRes();
    const result = await handleGit('GET', '/api/state', {}, res, mockUrl('/api/state'), mockCtx(tmpDir));
    expect(result).toBe(false);
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  describe('GET /api/git/status', () => {
    it('returns branch and unpushed commit count', async () => {
      // First call: rev-parse returns branch
      // Second call: log returns commits
      mockExecFile
        .mockImplementationOnce((cmd, args, opts, cb) => cb(null, 'main'))
        .mockImplementationOnce((cmd, args, opts, cb) => cb(null, 'abc123 fix bug\ndef456 add feature'));

      const res = mockRes();
      const result = await handleGit('GET', '/api/git/status', {}, res, mockUrl('/api/git/status'), mockCtx(tmpDir));
      expect(result).toBe(true);
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.branch).toBe('main');
      expect(body.unpushed).toBe(2);
      expect(body.commits).toEqual([
        { hash: 'abc123', message: 'fix bug' },
        { hash: 'def456', message: 'add feature' },
      ]);
    });

    it('handles no remote tracking branch gracefully', async () => {
      mockExecFile
        .mockImplementationOnce((cmd, args, opts, cb) => cb(null, 'feature-x'))
        .mockImplementationOnce((cmd, args, opts, cb) => cb(new Error('no upstream')));

      const res = mockRes();
      await handleGit('GET', '/api/git/status', {}, res, mockUrl('/api/git/status'), mockCtx(tmpDir));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.branch).toBe('feature-x');
      expect(body.unpushed).toBe(0);
    });

    it('handles git not available', async () => {
      mockExecFile.mockImplementationOnce((cmd, args, opts, cb) => cb(new Error('git not found')));

      const res = mockRes();
      await handleGit('GET', '/api/git/status', {}, res, mockUrl('/api/git/status'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.branch).toBeNull();
      expect(body.unpushed).toBe(0);
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /api/git/push', () => {
    it('pushes successfully', async () => {
      mockExecFile.mockImplementationOnce((cmd, args, opts, cb) => cb(null, 'Everything up-to-date', ''));

      const res = mockRes();
      const result = await handleGit('POST', '/api/git/push', {}, res, mockUrl('/api/git/push'), mockCtx(tmpDir));
      expect(result).toBe(true);
      const body = JSON.parse(res.end.mock.calls[0][0]);
      expect(body.ok).toBe(true);
    });

    it('returns 400 on push error', async () => {
      mockExecFile.mockImplementationOnce((cmd, args, opts, cb) => cb(new Error('rejected'), '', 'rejected'));

      const res = mockRes();
      await handleGit('POST', '/api/git/push', {}, res, mockUrl('/api/git/push'), mockCtx(tmpDir));
      expect(res.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
    });
  });
});
