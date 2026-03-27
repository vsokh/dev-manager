import { useState, useCallback, useRef, useEffect } from 'react';
import type { StateData, SkillsConfig, SkillInfo } from '../types';
import type { ProjectTemplate } from '../templates.ts';
import { api } from '../api.ts';
import {
  readState,
  writeState,
  createDefaultState,
  syncSkills,
  discoverSkillsAndAgents,
  readSkillsConfig,
  writeSkillsConfig,
  applyTemplate,
} from '../fs.ts';
import { useConnection } from './useConnection.ts';
import { useSync } from './useSync.ts';
export type { ConnectionStatus } from './useConnection.ts';
export type { MergeResult } from './useSync.ts';
export { mergeProgressIntoState } from './useSync.ts';

interface ProjectInfo {
  path: string;
  name: string;
  active: boolean;
}

export function useProject(opts?: { onError?: (msg: string) => void }) {
  const onError = opts?.onError;
  const [skillsConfig, setSkillsConfig] = useState<SkillsConfig | null>(null);
  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const connectToServerRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // useConnection uses a ref for onMessage, so the handler can safely
  // close over setStatus even though it's returned by the same hook call.
  const handleWsMessageRef = useRef<(msg: any) => void>(() => {});

  const { connected, setConnected, status, setStatus, closeWebSocket } = useConnection({
    onMessage: (msg: any) => handleWsMessageRef.current(msg),
  });

  const { data, setData, projectName, setProjectName, save, handleSyncMessage, pauseTask, cancelTask, flushPendingSave, lastWriteTime } = useSync({ setStatus });

  // Now that setStatus is available, define the real handler
  handleWsMessageRef.current = (msg: any) => {
    if (handleSyncMessage(msg)) return;
    if (msg.type === 'quality') {
      // Quality updates are handled by useQuality hook
    }
    if (msg.type === 'project-switched') {
      // Server switched to a different project — reconnect
      connectToServerRef.current?.();
    }
  };

  const connectToServer = useCallback(async () => {
    setStatus('connecting');
    try {
      // Get project info from server
      const info = await api.getInfo();
      setProjectName(info.projectName);

      // Read initial state
      const existing = await readState();
      let stateData: StateData;
      if (existing) {
        stateData = existing.data;
        lastWriteTime.current = existing.lastModified;
      } else {
        // New project — show template picker
        setShowTemplatePicker(true);
        setStatus('template-picker');
        return;
      }

      const resolvedName = stateData.project || info.projectName;
      setProjectName(resolvedName);

      // Sync skills
      await syncSkills();

      // Discover skills
      const discovered = await discoverSkillsAndAgents();
      setAvailableSkills(discovered);
      const sc = await readSkillsConfig();
      setSkillsConfig(sc);

      // Fetch projects list
      try {
        const proj = await api.listProjects();
        setProjects(proj);
      } catch { /* server might not support multi-project yet */ }

      setData(stateData);
      setConnected(true);
      setStatus('connected');
    } catch (err) {
      console.error('Connection failed:', err);
      setStatus('error');
    }
  }, [setConnected, setStatus, setProjectName, setData, lastWriteTime]);

  useEffect(() => { connectToServerRef.current = connectToServer; }, [connectToServer]);

  // Auto-connect on mount, retry once on failure
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    connectToServer().catch(() => {
      retryTimer = setTimeout(connectToServer, 2000);
    });
    return () => { if (retryTimer) clearTimeout(retryTimer); };
  }, [connectToServer]);

  const connect = useCallback(async () => {
    await connectToServer();
  }, [connectToServer]);

  const disconnect = useCallback(async () => {
    await flushPendingSave();
    closeWebSocket();
    setConnected(false);
    setData(null);
    setProjectName('');
    setStatus('disconnected');
  }, [flushPendingSave, closeWebSocket, setConnected, setStatus, setData, setProjectName]);

  const saveSkills = useCallback(async (config: SkillsConfig) => {
    setSkillsConfig(config);
    await writeSkillsConfig(config);
  }, []);

  const switchProject = useCallback(async (path: string) => {
    setConnected(false);
    setData(null);
    setStatus('connecting');
    try {
      await api.switchProject(path);
      await connectToServer();
    } catch (err: any) {
      console.error('Switch project failed:', err);
      onError?.(`Failed to open project: ${err?.message || 'unknown error'}`);
      // Try reconnecting to the previous project
      try { await connectToServer(); } catch { setStatus('error'); }
    }
  }, [connectToServer, onError, setConnected, setStatus, setData]);

  const connectWithTemplate = useCallback(async (template: ProjectTemplate | null) => {
    setStatus('connecting');
    setShowTemplatePicker(false);
    try {
      const info = await api.getInfo();
      let stateData: StateData;
      if (template) {
        stateData = await applyTemplate(info.projectName, template);
      } else {
        stateData = createDefaultState(info.projectName);
      }
      const writeResult = await writeState(stateData);
      if (writeResult.ok && writeResult.lastModified) lastWriteTime.current = writeResult.lastModified;
      else lastWriteTime.current = Date.now();

      setProjectName(stateData.project || info.projectName);
      await syncSkills();
      const discovered = await discoverSkillsAndAgents();
      setAvailableSkills(discovered);
      const sc = await readSkillsConfig();
      setSkillsConfig(sc);
      try {
        const proj = await api.listProjects();
        setProjects(proj);
      } catch { /* ignore */ }

      setData(stateData);
      setConnected(true);
      setStatus('connected');
    } catch (err) {
      console.error('Template setup failed:', err);
      setStatus('error');
    }
  }, [setConnected, setStatus, setProjectName, setData, lastWriteTime]);

  const cancelTemplatePicker = useCallback(() => {
    setShowTemplatePicker(false);
    setStatus('disconnected');
  }, [setStatus]);

  return { connected, status, projectName, data, save, connect, disconnect, pauseTask, cancelTask, skillsConfig, saveSkills, availableSkills, projects, switchProject, showTemplatePicker, connectWithTemplate, cancelTemplatePicker };
}
