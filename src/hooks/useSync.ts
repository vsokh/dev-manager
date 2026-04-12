import { useState, useCallback, useRef, useEffect } from 'react';
import type { StateData, WebSocketMessage } from '../types';
import { SyncEngine } from 'sync-protocol';
import type { SyncMessage } from 'sync-protocol';
import {
  writeState,
  readProgressFiles,
  deleteProgressFile,
} from '../fs.ts';
import type { ConnectionStatus } from './useConnection.ts';

// --- Adapter: StatePersistencePort → api/fs calls ---

const persistencePort = {
  writeState: (data: StateData, lastModified?: number) => writeState(data, lastModified || 0),
  readProgressFiles: () => readProgressFiles(),
  deleteProgressFile: (id: string | number) => deleteProgressFile(id),
};

// --- Adapter: TimerPort → global timers ---

const timerPort = {
  setTimeout: (cb: () => void, ms: number) => setTimeout(cb, ms),
  clearTimeout: (h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>),
  setInterval: (cb: () => void, ms: number) => setInterval(cb, ms),
  clearInterval: (h: unknown) => clearInterval(h as ReturnType<typeof setInterval>),
};

interface UseSyncOptions {
  setStatus: (status: ConnectionStatus) => void;
  onError?: (msg: string) => void;
}

export function useSync({ setStatus, onError }: UseSyncOptions) {
  const [data, setData] = useState<StateData | null>(null);
  const [projectName, setProjectName] = useState('');
  const engineRef = useRef<SyncEngine | null>(null);
  const lastWriteTimeRef = useRef(0);

  // Create SyncEngine once
  if (!engineRef.current) {
    engineRef.current = new SyncEngine(persistencePort, timerPort);
  }
  const engine = engineRef.current;

  // Subscribe to engine state/status changes
  // Track whether the change came from setDataAndEngine to avoid re-triggering
  const suppressNotifyRef = useRef(false);

  useEffect(() => {
    const unsubState = engine.onStateChange((newState) => {
      if (suppressNotifyRef.current) return;
      setData(newState);
      if (newState) {
        lastWriteTimeRef.current = engine.getLastWriteTime();
      }
    });
    const unsubStatus = engine.onStatusChange((status) => {
      if (status === 'error') {
        onError?.('Sync failed — changes may not be persisted');
        setStatus('error');
      } else if (status === 'synced') {
        setStatus('synced');
        setTimeout(() => setStatus('connected'), 2000);
      } else {
        setStatus('connected');
      }
    });
    return () => { unsubState(); unsubStatus(); };
  }, [engine, setStatus, onError]);

  const save = useCallback((newData: StateData) => {
    engine.save(newData);
  }, [engine]);

  const handleSyncMessage = useCallback((msg: WebSocketMessage): boolean => {
    if (msg.type === 'state' || msg.type === 'progress') {
      const handled = engine.handleMessage(msg as SyncMessage);
      // Extract project name from state messages
      if (msg.type === 'state' && msg.data.project) {
        setProjectName(msg.data.project);
      }
      return handled;
    }
    return false;
  }, [engine]);

  const pauseTask = useCallback(async (taskId: number) => {
    const progressEntries = await readProgressFiles();
    const prog = progressEntries[taskId];

    try {
      await deleteProgressFile(taskId);
    } catch (err) {
      console.error('[sync] Failed to delete progress file:', err);
    }

    const prev = engine.getState();
    if (!prev) return;
    const tasks = (prev.tasks || []).map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        status: 'paused' as const,
        progress: undefined,
        lastProgress: prog?.progress || t.progress || undefined,
        branch: t.branch || ('task-' + taskId),
      };
    });
    engine.save({ ...prev, tasks });
  }, [engine]);

  const cancelTask = useCallback(async (taskId: number) => {
    try {
      await deleteProgressFile(taskId);
    } catch (err) {
      console.error('[sync] Failed to delete progress file:', err);
    }
    const prev = engine.getState();
    if (!prev) return;
    const tasks = (prev.tasks || []).map(t =>
      t.id === taskId ? { ...t, status: 'pending' as const, progress: undefined, lastProgress: undefined, branch: undefined } : t
    );
    engine.save({ ...prev, tasks });
  }, [engine]);

  const flushPendingSave = useCallback(async () => {
    await engine.flush();
  }, [engine]);

  // setData that syncs to engine without triggering the subscription loop
  const setDataAndEngine = useCallback((newData: StateData | null) => {
    suppressNotifyRef.current = true;
    engine.setState(newData, lastWriteTimeRef.current);
    suppressNotifyRef.current = false;
    setData(newData);
  }, [engine]);

  return {
    data, setData: setDataAndEngine,
    projectName, setProjectName,
    save,
    handleSyncMessage,
    pauseTask,
    cancelTask,
    flushPendingSave,
    lastWriteTimeRef,
  };
}
