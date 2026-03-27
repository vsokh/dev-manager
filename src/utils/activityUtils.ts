import type { Activity } from '../types';

export function createActivityList(label: string, currentActivity: Activity[], taskId?: number): Activity[] {
  const entry: Activity = { id: 'act_' + Date.now(), time: Date.now(), label };
  if (taskId != null) entry.taskId = taskId;
  return [entry, ...currentActivity].slice(0, 20);
}
