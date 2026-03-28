import { sortByDependencies } from '../utils/sortByDependencies.ts';
import { createActivityList } from '../utils/activityUtils.ts';
import { getUnqueuedTasks } from '../utils/taskFilters.ts';
import type { StateData, Task, QueueItem } from '../types';

interface UseQueueManagerParams {
  data: StateData | null;
  save: (data: StateData) => void;
  snapshotBeforeAction: (label: string) => void;
}

export function useQueueManager({ data, save, snapshotBeforeAction }: UseQueueManagerParams) {
  const tasks: Task[] = data?.tasks || [];
  const queue: QueueItem[] = data?.queue || [];
  const taskNotes: Record<string, string> = data?.taskNotes || {};

  const updateData = (partial: Partial<StateData>) => {
    save({ ...data!, ...partial });
  };

  const addActivity = (label: string, taskId?: number) =>
    createActivityList(label, data?.activity || [], taskId);

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
    const pending = getUnqueuedTasks(tasks, queue);
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
    const pending = getUnqueuedTasks(tasks.filter(t => t.group === groupName), queue);
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
    // Cascade: also remove any queued tasks that transitively depend on the removed task
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const queueIds = new Set(queue.map(q => q.task));
    const removed = new Set<number>();
    const toRemove = [key];

    while (toRemove.length > 0) {
      const id = toRemove.pop()!;
      if (removed.has(id)) continue;
      removed.add(id);
      // Find queued tasks that depend on this one
      for (const qId of queueIds) {
        if (removed.has(qId)) continue;
        const task = taskMap.get(qId);
        if (task?.dependsOn?.includes(id)) {
          toRemove.push(qId);
        }
      }
    }

    const newQueue = queue.filter(q => !removed.has(q.task));
    updateData({ queue: newQueue });
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    snapshotBeforeAction('Queue cleared');
    updateData({ queue: [] });
  };

  return {
    handleQueue,
    handleQueueAll,
    handleQueueGroup,
    handleRemoveFromQueue,
    handleClearQueue,
  };
}
