import { useState, type MutableRefObject } from 'react';
import { api } from '../api.ts';
import { computePhases } from '../utils/computePhases.ts';
import type { StateData } from '../types';
import type { LaunchMode } from './useQueueActions.ts';

interface LaunchPhaseItem {
  key: number;
  cmd: string;
  taskName: string;
}

interface UsePhaseOrchestratorParams {
  dataRef: MutableRefObject<StateData | null>;
  save: (data: StateData) => void;
  launchMode: LaunchMode;
  waitForProcess: (pid: number, timeout?: number) => Promise<boolean>;
  onError: (msg: string) => void;
}

export function usePhaseOrchestrator({ dataRef, save, launchMode, waitForProcess, onError }: UsePhaseOrchestratorParams) {
  const [arranging, setArranging] = useState(false);

  const handleLaunchPhase = async (items: LaunchPhaseItem[], phaseIndex?: number) => {
    try {
      // Re-verify phase membership against latest data to prevent launching
      // tasks that moved to a different phase between render and click
      let verified = items;
      const fresh = dataRef.current;
      if (fresh && phaseIndex != null) {
        const phases = computePhases(fresh.queue || [], fresh.tasks || []);
        if (phases && phases[phaseIndex]) {
          const phaseTaskIds = new Set(phases[phaseIndex].map(q => q.task));
          verified = items.filter(i => phaseTaskIds.has(i.key));
        }
      }
      // Skip tasks already running
      const freshTasks = (dataRef.current?.tasks || []);
      const runningIds = new Set(freshTasks.filter(t => t.status === 'in-progress').map(t => t.id));
      verified = verified.filter(i => !runningIds.has(i.key));
      if (verified.length === 0) return;

      if (launchMode === 'sequential') {
        // Sequential: launch one at a time, wait for each to finish
        for (const item of verified) {
          const freshNow = dataRef.current;
          if (freshNow) {
            const tasks = (freshNow.tasks || []).map(t =>
              t.id === item.key ? { ...t, status: 'in-progress' as const, progress: 'Launching...', startedAt: t.startedAt || new Date().toISOString() } : t
            );
            save({ ...freshNow, tasks });
          }
          const { pid } = await api.launch(item.key, item.cmd);
          await waitForProcess(pid);
        }
      } else {
        // Parallel: batch-set all tasks to 'Launching...' then launch all
        if (fresh) {
          const launchingIds = new Set(verified.map(i => i.key));
          const tasks = (fresh.tasks || []).map(t =>
            launchingIds.has(t.id) ? { ...t, status: 'in-progress' as const, progress: 'Launching...', startedAt: t.startedAt || new Date().toISOString() } : t
          );
          save({ ...fresh, tasks });
        }
        for (const item of verified) {
          if (launchMode === 'terminal') {
            try {
              await api.launchTerminal(item.key, item.cmd, undefined, item.taskName);
            } catch (err) {
              console.error('Failed to launch task in terminal:', err);
            }
          } else {
            await api.launch(item.key, item.cmd);
          }
        }
      }
    } catch (err) {
      console.error('Failed to launch phase:', err);
      onError('Failed to launch phase');
    }
  };

  const handleRetryFailed = async (items: LaunchPhaseItem[], phaseIndex?: number) => {
    // Filter to only errored tasks
    const fresh = dataRef.current;
    if (!fresh) return;
    const taskMap = new Map((fresh.tasks || []).map(t => [t.id, t]));
    const errored = items.filter(i => {
      const task = taskMap.get(i.key);
      if (!task || task.status !== 'in-progress') return false;
      const p = (task.progress || '').toLowerCase();
      return /exited with code|error|failed|limit|blocked/i.test(p);
    });
    if (errored.length === 0) return;
    // Reset errored tasks to pending first, then launch
    const resetTasks = (fresh.tasks || []).map(t =>
      errored.some(e => e.key === t.id) ? { ...t, status: 'pending' as const, progress: undefined } : t
    );
    save({ ...fresh, tasks: resetTasks });
    await handleLaunchPhase(errored, phaseIndex);
  };

  const handleArrange = async () => {
    try {
      setArranging(true);
      await api.launch(0, '/orchestrator arrange');
    } catch (err) {
      console.error('Failed to launch arrange:', err);
      onError('Failed to launch arrange');
      setArranging(false);
    }
  };

  return {
    arranging,
    setArranging,
    handleLaunchPhase,
    handleRetryFailed,
    handleArrange,
  };
}
