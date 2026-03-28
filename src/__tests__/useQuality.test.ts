import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock api module
vi.mock('../api.ts', () => ({
  api: {
    readQualityLatest: vi.fn().mockResolvedValue(null),
    readQualityHistory: vi.fn().mockResolvedValue([]),
  },
}));

// Mock validate module
vi.mock('../validate.ts', () => ({
  validateQualityReport: vi.fn((data: unknown) => data),
  validateQualityHistory: vi.fn((data: unknown) => data),
}));

import { useQuality } from '../hooks/useQuality.ts';
import { api } from '../api.ts';
import type { QualityReport, QualityHistoryEntry } from '../types';

const mockedApi = vi.mocked(api);

function makeReport(overrides: Partial<QualityReport> = {}): QualityReport {
  return {
    overallScore: 85,
    grade: 'B',
    dimensions: {},
    ...overrides,
  };
}

function makeHistoryEntry(overrides: Partial<QualityHistoryEntry> = {}): QualityHistoryEntry {
  return {
    date: '2026-03-28',
    overallScore: 85,
    ...overrides,
  };
}

describe('useQuality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with loading=true', () => {
    mockedApi.readQualityLatest.mockReturnValue(new Promise(() => {})); // never resolves
    mockedApi.readQualityHistory.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useQuality());

    expect(result.current.loading).toBe(true);
    expect(result.current.latest).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it('sets latest and history after successful fetch', async () => {
    const report = makeReport({ overallScore: 92, grade: 'A' });
    const historyData = [makeHistoryEntry({ overallScore: 80 }), makeHistoryEntry({ overallScore: 92 })];
    mockedApi.readQualityLatest.mockResolvedValue(report);
    mockedApi.readQualityHistory.mockResolvedValue(historyData);

    const { result } = renderHook(() => useQuality());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.latest).toEqual(report);
    expect(result.current.history).toEqual(historyData);
    expect(result.current.error).toBe(false);
  });

  it('sets latest to null when api returns null', async () => {
    mockedApi.readQualityLatest.mockResolvedValue(null);
    mockedApi.readQualityHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useQuality());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.latest).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('sets error=true on API failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedApi.readQualityLatest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useQuality());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.latest).toBeNull();
    expect(result.current.history).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('retry() re-fetches data and clears error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // First call fails
    mockedApi.readQualityLatest.mockRejectedValueOnce(new Error('fail'));
    mockedApi.readQualityHistory.mockResolvedValue([]);

    const { result } = renderHook(() => useQuality());

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });

    // Now fix the API and retry
    const report = makeReport({ overallScore: 90 });
    mockedApi.readQualityLatest.mockResolvedValue(report);

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBe(false);
    expect(result.current.latest).toEqual(report);
    consoleSpy.mockRestore();
  });
});
