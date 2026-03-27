// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { writeFile, mkdtemp, rm, stat as fsStat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  jsonResponse,
  parseBody,
  parseJsonBody,
  ensureDir,
  fileExists,
  dirExists,
  safePath,
  matchRoute,
  requireFields,
  readJsonOrNull,
  handleNotFound,
} from '../middleware.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  return {
    writeHead: vi.fn(),
    end: vi.fn(),
  };
}

function mockReq(chunks) {
  const emitter = new EventEmitter();
  // Schedule data + end on next tick so the consumer can attach listeners first
  process.nextTick(() => {
    for (const chunk of chunks) {
      emitter.emit('data', Buffer.from(chunk));
    }
    emitter.emit('end');
  });
  return emitter;
}

// Temp directory management
let tmpDir;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'middleware-test-'));
});

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// jsonResponse
// ---------------------------------------------------------------------------

describe('jsonResponse', () => {
  it('sends correct status code, headers, and JSON body', () => {
    const res = mockRes();
    const data = { ok: true, count: 42 };

    jsonResponse(res, 200, data);

    const expectedBody = JSON.stringify(data, null, 2);
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(expectedBody),
    });
    expect(res.end).toHaveBeenCalledWith(expectedBody);
  });

  it('handles non-200 status codes', () => {
    const res = mockRes();
    jsonResponse(res, 404, { error: 'Not found' });

    expect(res.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
  });

  it('handles empty object', () => {
    const res = mockRes();
    jsonResponse(res, 200, {});

    const expectedBody = JSON.stringify({}, null, 2);
    expect(res.end).toHaveBeenCalledWith(expectedBody);
  });

  it('calculates Content-Length correctly for multi-byte characters', () => {
    const res = mockRes();
    const data = { text: '\u{1F600}' }; // emoji

    jsonResponse(res, 200, data);

    const expectedBody = JSON.stringify(data, null, 2);
    const headers = res.writeHead.mock.calls[0][1];
    expect(headers['Content-Length']).toBe(Buffer.byteLength(expectedBody));
    // Multi-byte chars: string length !== byte length
    expect(headers['Content-Length']).toBeGreaterThan(expectedBody.length);
  });
});

// ---------------------------------------------------------------------------
// parseBody / parseJsonBody
// ---------------------------------------------------------------------------

describe('parseBody', () => {
  it('collects chunks into a single Buffer', async () => {
    const req = mockReq(['hello', ' world']);
    const buf = await parseBody(req);
    expect(buf.toString('utf-8')).toBe('hello world');
  });

  it('resolves with empty Buffer when no data is sent', async () => {
    const req = mockReq([]);
    const buf = await parseBody(req);
    expect(buf.length).toBe(0);
  });

  it('rejects on error', async () => {
    const emitter = new EventEmitter();
    process.nextTick(() => {
      emitter.emit('error', new Error('connection reset'));
    });
    await expect(parseBody(emitter)).rejects.toThrow('connection reset');
  });
});

describe('parseJsonBody', () => {
  it('returns {} for empty body', async () => {
    const req = mockReq([]);
    const result = await parseJsonBody(req);
    expect(result).toEqual({});
  });

  it('parses valid JSON', async () => {
    const obj = { name: 'test', value: 123 };
    const req = mockReq([JSON.stringify(obj)]);
    const result = await parseJsonBody(req);
    expect(result).toEqual(obj);
  });

  it('parses JSON split across multiple chunks', async () => {
    const req = mockReq(['{"foo":', '"bar"}']);
    const result = await parseJsonBody(req);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('throws on invalid JSON', async () => {
    const req = mockReq(['{not json}']);
    await expect(parseJsonBody(req)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ensureDir
// ---------------------------------------------------------------------------

describe('ensureDir', () => {
  it('creates a new directory', async () => {
    const dirPath = join(tmpDir, 'new-dir');
    await ensureDir(dirPath);
    const s = await fsStat(dirPath);
    expect(s.isDirectory()).toBe(true);
  });

  it('creates nested directories', async () => {
    const dirPath = join(tmpDir, 'a', 'b', 'c');
    await ensureDir(dirPath);
    const s = await fsStat(dirPath);
    expect(s.isDirectory()).toBe(true);
  });

  it('does not throw if directory already exists', async () => {
    const dirPath = join(tmpDir, 'existing');
    await ensureDir(dirPath);
    await expect(ensureDir(dirPath)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// fileExists / dirExists
// ---------------------------------------------------------------------------

describe('fileExists', () => {
  it('returns true for an existing file', async () => {
    const filePath = join(tmpDir, 'test.txt');
    await writeFile(filePath, 'hello');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('returns false for a nonexistent path', async () => {
    expect(await fileExists(join(tmpDir, 'nope.txt'))).toBe(false);
  });

  it('returns false for a directory', async () => {
    // tmpDir itself is a directory, not a file
    expect(await fileExists(tmpDir)).toBe(false);
  });
});

describe('dirExists', () => {
  it('returns true for an existing directory', async () => {
    expect(await dirExists(tmpDir)).toBe(true);
  });

  it('returns false for a nonexistent path', async () => {
    expect(await dirExists(join(tmpDir, 'nonexistent'))).toBe(false);
  });

  it('returns false for a file', async () => {
    const filePath = join(tmpDir, 'file.txt');
    await writeFile(filePath, 'data');
    expect(await dirExists(filePath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// safePath
// ---------------------------------------------------------------------------

describe('safePath', () => {
  it('returns resolved path for valid segments', () => {
    const result = safePath('/base', 'sub', 'file.txt');
    expect(result).toBe(resolve('/base', 'sub', 'file.txt'));
  });

  it('returns the base itself when no extra segments', () => {
    const result = safePath('/base');
    expect(result).toBe(resolve('/base'));
  });

  it('returns null for traversal with ..', () => {
    expect(safePath('/base', '..', 'etc', 'passwd')).toBe(null);
  });

  it('returns null for encoded traversal segments', () => {
    // If someone passes a pre-decoded ../ segment (e.g. from URL decoding)
    expect(safePath('/base', '../etc')).toBe(null);
  });

  it('returns null when resolved path equals parent of base', () => {
    expect(safePath('/base/sub', '..')).toBe(null);
  });

  it('allows nested subdirectories', () => {
    const result = safePath('/base', 'a', 'b', 'c.txt');
    expect(result).toBe(resolve('/base', 'a', 'b', 'c.txt'));
  });

  it('returns null for path that is a prefix but not a child', () => {
    // /base-extra is not inside /base
    expect(safePath('/base', '..', 'base-extra')).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// matchRoute
// ---------------------------------------------------------------------------

describe('matchRoute', () => {
  it('matches exact static route and returns empty params', () => {
    const result = matchRoute('GET', '/api/state', 'GET', '/api/state');
    expect(result).toEqual({});
  });

  it('extracts a single param', () => {
    const result = matchRoute('DELETE', '/api/progress/42', 'DELETE', '/api/progress/:taskId');
    expect(result).toEqual({ taskId: '42' });
  });

  it('extracts multiple params', () => {
    const result = matchRoute('GET', '/api/projects/myproj/tasks/7', 'GET', '/api/projects/:project/tasks/:taskId');
    expect(result).toEqual({ project: 'myproj', taskId: '7' });
  });

  it('returns null on method mismatch', () => {
    const result = matchRoute('POST', '/api/state', 'GET', '/api/state');
    expect(result).toBeNull();
  });

  it('returns null on path length mismatch', () => {
    const result = matchRoute('GET', '/api/state/extra', 'GET', '/api/state');
    expect(result).toBeNull();
  });

  it('returns null on segment mismatch', () => {
    const result = matchRoute('GET', '/api/other', 'GET', '/api/state');
    expect(result).toBeNull();
  });

  it('decodes URL-encoded param values', () => {
    const result = matchRoute('GET', '/api/tasks/hello%20world', 'GET', '/api/tasks/:name');
    expect(result).toEqual({ name: 'hello world' });
  });

  it('decodes special characters in params', () => {
    const result = matchRoute('GET', '/api/files/path%2Fto%2Ffile', 'GET', '/api/files/:filePath');
    expect(result).toEqual({ filePath: 'path/to/file' });
  });
});

// ---------------------------------------------------------------------------
// requireFields
// ---------------------------------------------------------------------------

describe('requireFields', () => {
  it('returns null when all fields are present', () => {
    const body = { name: 'Test', status: 'active' };
    expect(requireFields(body, 'name', 'status')).toBeNull();
  });

  it('returns error string for one missing field', () => {
    const body = { name: 'Test' };
    const result = requireFields(body, 'name', 'status');
    expect(result).toBe('Missing status');
  });

  it('lists all missing fields', () => {
    const body = {};
    const result = requireFields(body, 'name', 'status', 'priority');
    expect(result).toBe('Missing name, status, priority');
  });

  it('does NOT treat 0 as missing', () => {
    const body = { count: 0 };
    expect(requireFields(body, 'count')).toBeNull();
  });

  it('does NOT treat false as missing', () => {
    const body = { active: false };
    expect(requireFields(body, 'active')).toBeNull();
  });

  it('treats undefined as missing', () => {
    const body = { name: undefined };
    expect(requireFields(body, 'name')).toBe('Missing name');
  });

  it('treats empty string as missing', () => {
    const body = { name: '' };
    expect(requireFields(body, 'name')).toBe('Missing name');
  });

  it('treats null as missing', () => {
    const body = { name: null };
    expect(requireFields(body, 'name')).toBe('Missing name');
  });
});

// ---------------------------------------------------------------------------
// readJsonOrNull
// ---------------------------------------------------------------------------

describe('readJsonOrNull', () => {
  it('reads and parses a JSON file, returning data and stat', async () => {
    const filePath = join(tmpDir, 'data.json');
    const obj = { tasks: [1, 2, 3], name: 'test' };
    await writeFile(filePath, JSON.stringify(obj));

    const result = await readJsonOrNull(filePath);
    expect(result).not.toBeNull();
    expect(result.data).toEqual(obj);
    expect(result.stat).toBeDefined();
    expect(result.stat.isFile()).toBe(true);
  });

  it('returns null for a nonexistent file', async () => {
    const result = await readJsonOrNull(join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('throws on invalid JSON (non-ENOENT error)', async () => {
    const filePath = join(tmpDir, 'bad.json');
    await writeFile(filePath, '{invalid json!!!}');
    await expect(readJsonOrNull(filePath)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// handleNotFound
// ---------------------------------------------------------------------------

describe('handleNotFound', () => {
  it('sends 404 and returns true for ENOENT errors', () => {
    const res = mockRes();
    const err = Object.assign(new Error('no such file'), { code: 'ENOENT' });

    const result = handleNotFound(res, err, 'File not found');

    expect(result).toBe(true);
    expect(res.writeHead).toHaveBeenCalledWith(404, expect.objectContaining({
      'Content-Type': 'application/json; charset=utf-8',
    }));
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body).toEqual({ error: 'File not found' });
  });

  it('rethrows non-ENOENT errors', () => {
    const res = mockRes();
    const err = Object.assign(new Error('permission denied'), { code: 'EACCES' });

    expect(() => handleNotFound(res, err, 'File not found')).toThrow('permission denied');
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});
