import type { Activity } from '../types';

export function createActivityList(label: string, currentActivity: Activity[], taskId?: number): Activity[] {
  const entry: Activity = { id: 'act_' + Date.now(), time: Date.now(), label };
  if (taskId != null) entry.taskId = taskId;
  const full = [entry, ...currentActivity];
  if (full.length > 20) {
    console.warn(`[activity] Truncating activity log: ${full.length} entries → 20 (${full.length - 20} dropped)`);
  }
  return full.slice(0, 20);
}
