import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Save originals
const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
const originalLocation = globalThis.location;

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { api, connectWebSocket } from '../api.ts';

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readState', () => {
    it('sends GET to /api/state and returns data', async () => {
      const payload = { data: { project: 'test', tasks: [] }, lastModified: 1000 };
      mockFetch.mockResolvedValue(jsonResponse(payload));

      const result = await api.readState();

      expect(mockFetch).toHaveBeenCalledWith('/api/state');
      expect(result).toEqual(payload);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 500));

      await expect(api.readState()).rejects.toThrow('GET /api/state: 500');
    });
  });

  describe('writeState', () => {
    it('sends PUT with data and returns ok result', async () => {
      const data = { project: 'test', tasks: [], queue: [], taskNotes: {}, activity: [] };
      mockFetch.mockResolvedValue(jsonResponse({ lastModified: 2000 }));

      const result = await api.writeState(data as import('../types').StateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/state', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }));
      expect(result).toEqual({ ok: true, lastModified: 2000 });
    });

    it('includes _lastModified when lastModified is provided', async () => {
      const data = { project: 'test', tasks: [], queue: [], taskNotes: {}, activity: [] };
      mockFetch.mockResolvedValue(jsonResponse({ lastModified: 3000 }));

      await api.writeState(data as import('../types').StateData, 1500);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body._lastModified).toBe(1500);
    });

    it('returns conflict result on 409 status', async () => {
      const conflictData = { data: { project: 'newer' }, lastModified: 5000 };
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve(conflictData),
      } as Response);

      const result = await api.writeState({ project: 'old' } as import('../types').StateData, 1000);

      expect(result).toEqual({ conflict: true, data: conflictData.data, lastModified: 5000 });
    });

    it('throws on non-409 error status', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 500));

      await expect(api.writeState({ project: 'x' } as import('../types').StateData)).rejects.toThrow('PUT /api/state: 500');
    });
  });

  describe('deploySkill', () => {
    it('sends POST with skill name, filename, and content', async () => {
      const payload = { ok: true, deployed: true };
      mockFetch.mockResolvedValue(jsonResponse(payload));

      const result = await api.deploySkill('orchestrator', 'SKILL.md', '# content');

      expect(mockFetch).toHaveBeenCalledWith('/api/skills/deploy', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ skillName: 'orchestrator', filename: 'SKILL.md', content: '# content' });
      expect(result).toEqual(payload);
    });
  });

  describe('deleteProgress', () => {
    it('sends DELETE to /api/progress/:taskId', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true }));

      const result = await api.deleteProgress(42);

      expect(mockFetch).toHaveBeenCalledWith('/api/progress/42', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(result).toEqual({ ok: true });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 404));

      await expect(api.deleteProgress(99)).rejects.toThrow('DELETE /api/progress/99: 404');
    });
  });

  describe('saveAttachment', () => {
    it('sends POST with blob body and returns path', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ path: '/uploads/1/image.png' }));
      const blob = new Blob(['test'], { type: 'image/png' });

      const result = await api.saveAttachment(1, 'image.png', blob);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/attachments/1?name=image.png',
        expect.objectContaining({ method: 'POST', body: blob }),
      );
      expect(result).toBe('/uploads/1/image.png');
    });

    it('throws on upload failure', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 500));
      const blob = new Blob(['test']);

      await expect(api.saveAttachment(1, 'file.txt', blob)).rejects.toThrow('Upload failed');
    });
  });

  describe('getAttachmentUrl', () => {
    it('returns URL string synchronously', () => {
      const url = api.getAttachmentUrl(5, 'doc.pdf');
      expect(url).toBe('/api/attachments/5/doc.pdf');
    });

    it('encodes special characters in filename', () => {
      const url = api.getAttachmentUrl(3, 'my file (1).png');
      expect(url).toBe('/api/attachments/3/my%20file%20(1).png');
    });
  });

  describe('splitTasks', () => {
    it('sends POST with text body', async () => {
      const payload = { tasks: [{ name: 'Task A', fullName: 'Task A full', description: 'desc' }] };
      mockFetch.mockResolvedValue(jsonResponse(payload));

      const result = await api.splitTasks('Build login page\nAdd auth');

      expect(mockFetch).toHaveBeenCalledWith('/api/split-tasks', expect.objectContaining({
        method: 'POST',
      }));
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body).toEqual({ text: 'Build login page\nAdd auth' });
      expect(result).toEqual(payload);
    });
  });
});

describe('connectWebSocket', () => {
  let mockWsInstance: { onmessage: ((e: MessageEvent) => void) | null; onclose: (() => void) | null; close: ReturnType<typeof vi.fn> };
  let constructedUrl: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    constructedUrl = undefined;
    mockWsInstance = { onmessage: null, onclose: null, close: vi.fn() };
    // Must use a regular function (not arrow) so it can be called with `new`
    const MockWebSocket = function(url: string) { constructedUrl = url; return mockWsInstance; } as unknown as typeof WebSocket;
    globalThis.WebSocket = MockWebSocket;
    // Mock location for protocol detection
    Object.defineProperty(globalThis, 'location', {
      value: { protocol: 'http:', host: 'localhost:5173' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('creates WebSocket with ws:// protocol for http:', () => {
    connectWebSocket(vi.fn());

    expect(constructedUrl).toBe('ws://localhost:5173/ws');
  });

  it('wires onmessage to parse JSON and call callback', () => {
    const onMessage = vi.fn();
    connectWebSocket(onMessage);

    const msg = { type: 'state', data: {}, lastModified: 1000 };
    mockWsInstance.onmessage!({ data: JSON.stringify(msg) } as MessageEvent);

    expect(onMessage).toHaveBeenCalledWith(msg);
  });

  it('handles JSON parse failure gracefully', () => {
    const onMessage = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    connectWebSocket(onMessage);

    mockWsInstance.onmessage!({ data: 'not json' } as MessageEvent);

    expect(onMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('calls onClose callback when WebSocket closes', () => {
    const onClose = vi.fn();
    connectWebSocket(vi.fn(), onClose);

    mockWsInstance.onclose!();

    expect(onClose).toHaveBeenCalled();
  });

  it('returns the WebSocket instance', () => {
    const ws = connectWebSocket(vi.fn());
    expect(ws).toBe(mockWsInstance);
  });
});
