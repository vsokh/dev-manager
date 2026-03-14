import { useState, useCallback, useRef, useEffect } from 'react';
import {
  loadDirHandle,
  saveDirHandle,
  clearDirHandle,
  verifyHandle,
  requestAccess,
  readState,
  writeState,
  createDefaultState,
  ensureOrchestratorSkill,
} from '../fs.js';

export function useProject() {
  const [dirHandle, setDirHandle] = useState(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | synced | error
  const [projectName, setProjectName] = useState('');
  const [data, setData] = useState(null);
  const [lastProjectName, setLastProjectName] = useState(() => {
    try { return localStorage.getItem('dm_last_project') || ''; } catch { return ''; }
  });

  const saveTimer = useRef(null);
  const lastWriteTime = useRef(0);
  const pollTimer = useRef(null);
  const dataRef = useRef(null);

  // Keep dataRef in sync
  useEffect(() => { dataRef.current = data; }, [data]);

  const connectWithHandle = useCallback(async (handle) => {
    setStatus('connecting');
    const name = handle.name;
    setProjectName(name);
    setLastProjectName(name);
    try { localStorage.setItem('dm_last_project', name); } catch {}

    // Try reading existing state
    const existing = await readState(handle);
    let stateData;
    if (existing) {
      stateData = existing.data;
      lastWriteTime.current = existing.lastModified;
    } else {
      // Create fresh state
      stateData = createDefaultState(name);
      await writeState(handle, stateData);
      lastWriteTime.current = Date.now();
    }

    // Use project name from state if available
    if (stateData.project) setProjectName(stateData.project);

    // Ensure orchestrator skill exists in the project
    await ensureOrchestratorSkill(handle);

    await saveDirHandle(handle);
    setDirHandle(handle);
    setData(stateData);
    setConnected(true);
    setStatus('connected');
  }, []);

  // On mount: try to restore saved handle (but don't auto-connect -- need user gesture for permission)
  useEffect(() => {
    (async () => {
      const handle = await loadDirHandle();
      if (handle && await verifyHandle(handle)) {
        // Permission already granted, auto-connect
        await connectWithHandle(handle);
      }
    })();
  }, [connectWithHandle]);

  const connect = useCallback(async () => {
    setStatus('connecting');

    // Try restoring saved handle first
    let handle = await loadDirHandle();
    if (handle) {
      if (await verifyHandle(handle) || await requestAccess(handle)) {
        await connectWithHandle(handle);
        return;
      }
    }

    // Pick new directory
    if (!window.showDirectoryPicker) {
      setStatus('error');
      return;
    }
    try {
      handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await connectWithHandle(handle);
    } catch (e) {
      if (e.name !== 'AbortError') setStatus('error');
      else setStatus('disconnected');
    }
  }, [connectWithHandle]);

  const reconnect = useCallback(async () => {
    const handle = await loadDirHandle();
    if (handle) {
      if (await requestAccess(handle)) {
        await connectWithHandle(handle);
        return;
      }
    }
    // If handle doesn't work, fall back to picker
    await connect();
  }, [connect, connectWithHandle]);

  const disconnect = useCallback(() => {
    clearTimeout(saveTimer.current);
    clearInterval(pollTimer.current);
    setDirHandle(null);
    setConnected(false);
    setData(null);
    setProjectName('');
    setStatus('disconnected');
    clearDirHandle();
  }, []);

  // Save function (debounced)
  const save = useCallback((newData) => {
    const updated = { ...newData, savedAt: new Date().toISOString() };
    setData(updated);
    if (!dirHandle) return;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await writeState(dirHandle, updated);
      if (ok) lastWriteTime.current = Date.now();
      setStatus(ok ? 'connected' : 'error');
    }, 500);
  }, [dirHandle]);

  // Poll for external changes (every 3s)
  useEffect(() => {
    if (!connected || !dirHandle) return;
    pollTimer.current = setInterval(async () => {
      const result = await readState(dirHandle);
      if (!result) return;
      // If file was modified after our last write, it's an external change
      if (result.lastModified > lastWriteTime.current + 1000) {
        lastWriteTime.current = result.lastModified;
        setData(result.data);
        if (result.data.project) setProjectName(result.data.project);
        setStatus('synced');
        setTimeout(() => setStatus('connected'), 2000);
      }
    }, 3000);
    return () => clearInterval(pollTimer.current);
  }, [connected, dirHandle]);

  return { connected, status, projectName, data, save, connect, reconnect, disconnect, lastProjectName };
}
