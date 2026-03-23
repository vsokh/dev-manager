import { useState } from 'react';
import { api } from '../api.ts';
import { STATUS } from '../constants/statuses.ts';
import { sortByDependencies } from '../utils/sortByDependencies.ts';
import type { StateData, Task, QueueItem, Activity } from '../types';

interface UseQueueActionsParams {
  data: StateData | null;
  save: (data: StateData) => void;
  snapshotBeforeAction: (label: string) => void;
  onError: (msg: string) => void;
}

interface LaunchPhaseItem {
  key: number;
  cmd: string;
  taskName: string;
}

export function useQueueActions({ data, save, snapshotBeforeAction, onError }: UseQueueActionsParams) {
  const [launchedIds, setLaunchedIds] = useState<Set<number>>(new Set());

  const tasks: Task[] = data?.tasks || [];
  const queue: QueueItem[] = data?.queue || [];
  const taskNotes: Record<string, string> = data?.taskNotes || {};

  const updateData = (partial: Partial<StateData>) => {
    save({ ...data!, ...partial });
  };

  const addActivity = (label: string, taskId?: number): Activity[] => {
    const entry: Activity = { id: 'act_' + Date.now(), time: Date.now(), label };
    if (taskId != null) entry.taskId = taskId;
    return [entry, ...(data?.activity || [])].slice(0, 20);
  };

  const handleQueue = (task: Task) => {
    if (queue.some(q => q.task === task.id)) return;
    const unsorted = [...queue, {
      task: task.id,
      taskName: task.name,
      notes: taskNotes[task.id] || '',
    }];
    const newQueue = sortByDependencies(unsorted, tasks);
    const newActivity = addActivity(task.name + ' queued', task.id);
    updateData({ queue: newQueue, activity: newActivity });
  };

  const handleQueueAll = () => {
    const pending = tasks.filter(t => (t.status === STATUS.PENDING || t.status === STATUS.PAUSED) && !queue.some(q => q.task === t.id));
    if (pending.length === 0) return;
    const unsorted = [...queue, ...pending.map(t => ({
      task: t.id,
      taskName: t.name,
      notes: taskNotes[t.id] || '',
    }))];
    const newQueue = sortByDependencies(unsorted, tasks);
    const newActivity = addActivity(pending.length + ' tasks queued');
    updateData({ queue: newQueue, activity: newActivity });
  };

  const handleQueueGroup = (groupName: string) => {
    const pending = tasks.filter(t => t.group === groupName && (t.status === STATUS.PENDING || t.status === STATUS.PAUSED) && !queue.some(q => q.task === t.id));
    if (pending.length === 0) return;
    const unsorted = [...queue, ...pending.map(t => ({
      task: t.id,
      taskName: t.name,
      notes: taskNotes[t.id] || '',
    }))];
    const newQueue = sortByDependencies(unsorted, tasks);
    const newActivity = addActivity(pending.length + ' ' + groupName + ' tasks queued');
    updateData({ queue: newQueue, activity: newActivity });
  };

  const handleRemoveFromQueue = (key: number) => {
    const newQueue = queue.filter(q => q.task !== key);
    updateData({ queue: newQueue });
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    snapshotBeforeAction('Queue cleared');
    updateData({ queue: [] });
  };

  const markLaunched = (id: number) => {
    setLaunchedIds(prev => new Set(prev).add(id));
    setTimeout(() => setLaunchedIds(prev => { const next = new Set(prev); next.delete(id); return next; }), 3000);
  };

  const handleLaunchTask = async (itemKey: number, cmd: string, _taskName: string) => {
    try {
      markLaunched(itemKey);
      await api.launch(itemKey, cmd);
    } catch (err) {
      console.error('Failed to launch task:', err);
      onError('Failed to launch task');
    }
  };

  const handleLaunchPhase = async (items: LaunchPhaseItem[]) => {
    try {
      for (const item of items) {
        markLaunched(item.key);
        await api.launch(item.key, item.cmd);
      }
    } catch (err) {
      console.error('Failed to launch phase:', err);
      onError('Failed to launch phase');
    }
  };

  const handleLaunchTerminal = async (itemKey: number, cmd: string, taskName: string) => {
    try {
      await api.launchTerminal(itemKey, cmd, undefined, taskName);
    } catch (err) {
      console.error('Failed to launch in terminal:', err);
      onError('Failed to open terminal');
    }
  };

  const handleArrange = async () => {
    try {
      await api.launch(0, '/orchestrator arrange');
    } catch (err) {
      console.error('Failed to launch arrange:', err);
      onError('Failed to launch arrange');
    }
  };

  return {
    launchedIds,
    handleQueue,
    handleQueueAll,
    handleQueueGroup,
    handleRemoveFromQueue,
    handleClearQueue,
    handleLaunchTask,
    handleLaunchPhase,
    handleLaunchTerminal,
    handleArrange,
  };
}
