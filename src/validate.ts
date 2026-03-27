import type { StateData, Task, QueueItem, Activity, Epic, Feature, ProgressEntry, QualityReport, QualityHistoryEntry } from './types';

const VALID_PROGRESS_STATUSES = ['in-progress', 'done', 'paused'] as const;

export function validateState(data: unknown): StateData | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const d = data as Record<string, unknown>;

  const tasks: Task[] = Array.isArray(d.tasks)
    ? (d.tasks as unknown[]).filter((t): t is Task =>
        !!t && typeof t === 'object' && !Array.isArray(t) &&
        typeof (t as Record<string, unknown>).id === 'number' && isFinite((t as Record<string, unknown>).id as number) &&
        typeof (t as Record<string, unknown>).name === 'string'
      ).map(t => {
        if ('dependsOn' in t) {
          if (Array.isArray(t.dependsOn)) {
            const clean = (t.dependsOn as unknown[]).filter(dep => typeof dep === 'number' && isFinite(dep as number));
            return { ...t, dependsOn: clean.length > 0 ? clean as number[] : undefined };
          }
          const { dependsOn: _, ...rest } = t;
          return rest;
        }
        return t;
      })
    : [];

  const queue: QueueItem[] = Array.isArray(d.queue)
    ? (d.queue as unknown[]).filter((q): q is QueueItem =>
        !!q && typeof q === 'object' && !Array.isArray(q) &&
        typeof (q as Record<string, unknown>).task === 'number' && isFinite((q as Record<string, unknown>).task as number)
      )
    : [];

  const activity: Activity[] = Array.isArray(d.activity) ? d.activity as Activity[] : [];

  const taskNotes: Record<string, string> = (d.taskNotes && typeof d.taskNotes === 'object' && !Array.isArray(d.taskNotes))
    ? d.taskNotes as Record<string, string>
    : {};

  const epics: Epic[] = Array.isArray(d.epics) ? d.epics as Epic[] : [];

  const features: Feature[] = Array.isArray(d.features) ? d.features as Feature[] : [];

  return {
    savedAt: typeof d.savedAt === 'string' ? d.savedAt : undefined,
    _v: typeof d._v === 'number' ? d._v : undefined,
    project: typeof d.project === 'string' ? d.project : '',
    tasks,
    queue,
    activity,
    taskNotes,
    epics,
    features,
    defaultEngine: typeof d.defaultEngine === 'string' ? d.defaultEngine : undefined,
    scratchpad: typeof d.scratchpad === 'string' ? d.scratchpad : undefined,
  } satisfies StateData;
}

export function validateProgress(data: unknown): ProgressEntry | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.status !== 'string' || !(VALID_PROGRESS_STATUSES as readonly string[]).includes(d.status)) {
    return null;
  }

  const entry: ProgressEntry = { status: d.status as ProgressEntry['status'] };
  if (typeof d.progress === 'string') entry.progress = d.progress;
  if (typeof d.completedAt === 'string') entry.completedAt = d.completedAt;
  if (typeof d.commitRef === 'string') entry.commitRef = d.commitRef;
  if (typeof d.branch === 'string') entry.branch = d.branch;
  if (typeof d.label === 'string') entry.label = d.label;
  if (typeof d.filesChanged === 'number') entry.filesChanged = d.filesChanged;
  return entry;
}

export function validateQualityReport(data: unknown): QualityReport | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const d = data as Record<string, unknown>;

  if (typeof d.overallScore !== 'number' || !isFinite(d.overallScore)) return null;
  if (typeof d.grade !== 'string') return null;
  if (!d.dimensions || typeof d.dimensions !== 'object' || Array.isArray(d.dimensions)) return null;

  return data as QualityReport;
}

export function validateQualityHistory(data: unknown): QualityHistoryEntry[] {
  if (!Array.isArray(data)) return [];

  return data.filter(entry =>
    entry && typeof entry === 'object' &&
    typeof (entry as Record<string, unknown>).date === 'string' &&
    typeof (entry as Record<string, unknown>).overallScore === 'number' && isFinite((entry as Record<string, unknown>).overallScore as number)
  ) as QualityHistoryEntry[];
}
