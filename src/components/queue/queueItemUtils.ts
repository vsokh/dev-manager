import { PAUSED_COLOR } from '../../constants/colors.ts';
import { STATUS } from '../../constants/statuses.ts';
import type { Task, QueueItem } from '../../types';

export type ItemStatus = 'queued' | 'paused' | 'error' | 'launching' | 'reading' | 'exploring' | 'planning' | 'delegating' | 'reviewing' | 'merging';

export type PhaseColor = {
  bg: string;
  text: string;
  row: string;
};

export const PIPELINE_STAGES = [
  { id: 'launching',  label: 'Launch',   bg: 'var(--dm-text-light)' },
  { id: 'reading',    label: 'Read',     bg: 'var(--dm-amber)' },
  { id: 'exploring',  label: 'Explore',  bg: 'var(--dm-amber)' },
  { id: 'planning',   label: 'Plan',     bg: 'var(--dm-paused)' },
  { id: 'delegating', label: 'Build',    bg: 'var(--dm-accent)' },
  { id: 'reviewing',  label: 'Review',   bg: 'var(--dm-accent)' },
  { id: 'merging',    label: 'Merge',    bg: 'var(--dm-success)' },
] as const;

const PHASE_COLORS: Record<string, PhaseColor> = {
  launching:  { bg: 'var(--dm-text-light)',  text: 'text-muted',  row: 'queue-item queue-item--active-working' },
  reading:    { bg: 'var(--dm-amber)',       text: 'text-amber',  row: 'queue-item queue-item--active-waiting' },
  exploring:  { bg: 'var(--dm-amber)',       text: 'text-amber',  row: 'queue-item queue-item--active-waiting' },
  planning:   { bg: 'var(--dm-paused)',      text: 'text-paused', row: 'queue-item queue-item--active-waiting' },
  delegating: { bg: 'var(--dm-accent)',      text: 'text-accent', row: 'queue-item queue-item--active-working' },
  reviewing:  { bg: 'var(--dm-accent)',      text: 'text-accent', row: 'queue-item queue-item--active-working' },
  merging:    { bg: 'var(--dm-success)',     text: 'text-success', row: 'queue-item queue-item--active-working' },
};

export function itemKey(item: QueueItem): number {
  return item.task;
}

export function cmdForItem(item: QueueItem): string {
  return '/orchestrator task ' + item.task;
}

export function getItemStatus(item: QueueItem, taskMap: Map<number, Task>): ItemStatus {
  const task = taskMap.get(item.task);
  if (!task) return 'queued';
  if (task.status === STATUS.PAUSED) return 'paused';
  if (task.status !== STATUS.IN_PROGRESS) return 'queued';
  const p = (task.progress || '').toLowerCase();
  if (/exited with code|error|failed|limit|blocked/i.test(p)) return 'error';
  if (/launch/i.test(p)) return 'launching';
  if (/merg/i.test(p)) return 'merging';
  if (/review/i.test(p)) return 'reviewing';
  if (/delegat|sub-agent|implement/i.test(p)) return 'delegating';
  if (/plan/i.test(p)) return 'planning';
  if (/explor|analyz|investigat/i.test(p)) return 'exploring';
  if (/read|queue|loading/i.test(p)) return 'reading';
  return 'delegating'; // default for in-progress
}

export function getButtonStyle(
  item: QueueItem,
  taskMap: Map<number, Task>,
  launchedIds: Set<number>
): { bg: string; icon: string } {
  const status = getItemStatus(item, taskMap);
  const isLaunched = launchedIds.has(itemKey(item));
  if (isLaunched) return { bg: 'var(--dm-success)', icon: '\u2713' };
  if (status === 'paused') return { bg: PAUSED_COLOR, icon: '\u25B6' };
  if (status === 'error') return { bg: 'var(--dm-danger)', icon: '\u21BB' }; // ↻ retry
  if (status === 'queued') return { bg: 'var(--dm-accent)', icon: '\u25B6' };
  const phase = PHASE_COLORS[status];
  if (phase) return { bg: phase.bg, icon: '\u25CF' };
  return { bg: 'var(--dm-accent)', icon: '\u25CF' };
}

export function getRowClass(status: ItemStatus): string {
  if (status === 'paused') return 'queue-item queue-item--paused';
  if (status === 'error') return 'queue-item queue-item--error';
  if (status === 'queued') return 'queue-item';
  const phase = PHASE_COLORS[status];
  return phase?.row || 'queue-item queue-item--active-working';
}

export function getProgressClass(status: ItemStatus): string {
  if (status === 'queued' || status === 'paused') return '';
  const phase = PHASE_COLORS[status];
  return phase?.text || 'text-accent';
}

export function isAllAutoApproved(items: QueueItem[], taskMap: Map<number, Task>): boolean {
  const nonManual = items.filter(item => !taskMap.get(item.task)?.manual);
  return nonManual.length > 0 && nonManual.every(item => taskMap.get(item.task)?.autoApprove);
}
