import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api module before importing useConnection
vi.mock('../api.ts', () => ({
  connectWebSocket: vi.fn(() => ({
    onmessage: null,
    onclose: null,
    close: vi.fn(),
  })),
}));

import { useConnection } from '../hooks/useConnection.ts';
import { connectWebSocket } from '../api.ts';

describe('useConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup(overrides: Partial<Parameters<typeof useConnection>[0]> = {}) {
    const onMessage = vi.fn();
    const onReconnect = vi.fn();
    const params = { onMessage, onReconnect, ...overrides };
    const result = renderHook(() => useConnection(params));
    return { ...result, onMessage, onReconnect };
  }

  it('starts with connected=false and status=disconnected', () => {
    const { result } = setup();

    expect(result.current.connected).toBe(false);
    expect(result.current.status).toBe('disconnected');
    expect(result.current.wsRef.current).toBeNull();
  });

  it('does not create WebSocket when connected is false', () => {
    setup();

    expect(connectWebSocket).not.toHaveBeenCalled();
  });

  it('creates WebSocket when connected is set to true', () => {
    const { result } = setup();

    act(() => {
      result.current.setConnected(true);
    });

    expect(connectWebSocket).toHaveBeenCalledTimes(1);
  });

  it('setStatus updates status value', () => {
    const { result } = setup();

    act(() => {
      result.current.setStatus('connected');
    });

    expect(result.current.status).toBe('connected');
  });

  it('setStatus accepts template-picker status', () => {
    const { result } = setup();

    act(() => {
      result.current.setStatus('template-picker');
    });

    expect(result.current.status).toBe('template-picker');
  });

  it('closeWebSocket clears the wsRef', () => {
    const mockWs = { onmessage: null, onclose: null, close: vi.fn() };
    vi.mocked(connectWebSocket).mockReturnValue(mockWs as unknown as WebSocket);
    const { result } = setup();

    // Connect to create a WebSocket
    act(() => {
      result.current.setConnected(true);
    });

    // closeWebSocket should close and clear
    act(() => {
      result.current.closeWebSocket();
    });

    expect(mockWs.close).toHaveBeenCalled();
    expect(result.current.wsRef.current).toBeNull();
  });

  it('cleans up WebSocket on unmount', () => {
    const mockWs = { onmessage: null, onclose: null, close: vi.fn() };
    vi.mocked(connectWebSocket).mockReturnValue(mockWs as unknown as WebSocket);
    const { result, unmount } = setup();

    act(() => {
      result.current.setConnected(true);
    });

    unmount();

    expect(mockWs.close).toHaveBeenCalled();
  });
});
