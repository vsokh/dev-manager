import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.ts';
import type { ErrorsReport, ErrorsHistoryEntry } from '../types';

export function useErrors() {
  const [latest, setLatest] = useState<ErrorsReport | null>(null);
  const [history, setHistory] = useState<ErrorsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const readErrors = useCallback(async () => {
    try {
      setError(false);
      const [latestData, historyData] = await Promise.all([
        api.readErrorsLatest(),
        api.readErrorsHistory(),
      ]);
      setLatest(latestData ?? null);
      setHistory(historyData ?? []);
    } catch (err) {
      console.error('Failed to read errors:', err);
      setLatest(null);
      setHistory([]);
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    readErrors();
    const timer = setInterval(readErrors, 5000);
    return () => clearInterval(timer);
  }, [readErrors]);

  return { latest, history, loading, error, retry: readErrors };
}
