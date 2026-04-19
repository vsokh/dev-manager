import type { Task } from '../types.js';

export type ArtifactGraphErrorKind =
  | 'multiple_producers'
  | 'missing_producer'
  | 'cycle'
  | 'self_consume';

export interface ArtifactGraphError {
  kind: ArtifactGraphErrorKind;
  artifact?: string;
  taskIds: number[];
  message: string;
}

export interface ArtifactGraph {
  /** task id → set of task ids it implicitly depends on (because of consumed artifacts). */
  deps: Map<number, Set<number>>;
  /** artifact path → id of the task that produces it. First-writer-wins if duplicated. */
  producers: Map<string, number>;
  errors: ArtifactGraphError[];
}

function normPath(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const p = normPath(raw);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Resolve the artifact dependency graph for a set of tasks.
 * Pure function — no I/O.
 *
 * Emits structured errors for:
 *  - multiple_producers: same artifact path listed in produces by >1 task
 *  - missing_producer:   a consumes path with no producing task
 *  - self_consume:       task lists the same path in produces and consumes
 *  - cycle:              artifact-induced dependency graph has a cycle
 */
export function resolveArtifactGraph(tasks: Task[]): ArtifactGraph {
  const errors: ArtifactGraphError[] = [];
  const producers = new Map<string, number>();
  const producersAll = new Map<string, number[]>();

  for (const task of tasks) {
    const produces = cleanList(task.produces);
    const consumes = cleanList(task.consumes);
    const selfSet = new Set(produces);

    for (const p of consumes) {
      if (selfSet.has(p)) {
        errors.push({
          kind: 'self_consume',
          artifact: p,
          taskIds: [task.id],
          message: `Task ${task.id} both produces and consumes "${p}"`,
        });
      }
    }

    for (const p of produces) {
      const list = producersAll.get(p);
      if (list) list.push(task.id);
      else producersAll.set(p, [task.id]);
      if (!producers.has(p)) producers.set(p, task.id);
    }
  }

  for (const [artifact, owners] of producersAll) {
    if (owners.length > 1) {
      errors.push({
        kind: 'multiple_producers',
        artifact,
        taskIds: owners,
        message: `Artifact "${artifact}" is produced by multiple tasks: ${owners.join(', ')}`,
      });
    }
  }

  const deps = new Map<number, Set<number>>();
  for (const task of tasks) {
    const consumes = cleanList(task.consumes);
    const set = new Set<number>();
    for (const p of consumes) {
      const producerId = producers.get(p);
      if (producerId == null) {
        errors.push({
          kind: 'missing_producer',
          artifact: p,
          taskIds: [task.id],
          message: `Task ${task.id} consumes "${p}" but no task produces it`,
        });
        continue;
      }
      if (producerId === task.id) continue; // self_consume already reported
      set.add(producerId);
    }
    if (set.size > 0) deps.set(task.id, set);
  }

  // Cycle detection on combined (explicit dependsOn + artifact-derived) graph.
  // We only need to detect — sortByDependencies already handles cycle-breaking when sorting.
  const combined = new Map<number, Set<number>>();
  const allIds = new Set(tasks.map(t => t.id));
  for (const t of tasks) {
    const s = new Set<number>();
    if (Array.isArray(t.dependsOn)) {
      for (const id of t.dependsOn) if (allIds.has(id)) s.add(id);
    }
    const artifactDeps = deps.get(t.id);
    if (artifactDeps) for (const id of artifactDeps) s.add(id);
    combined.set(t.id, s);
  }

  const color = new Map<number, 0 | 1 | 2>(); // 0=white,1=gray,2=black
  const cycles: number[][] = [];
  const stack: number[] = [];

  const visit = (id: number) => {
    const c = color.get(id) ?? 0;
    if (c === 1) {
      const start = stack.indexOf(id);
      if (start >= 0) cycles.push(stack.slice(start).concat(id));
      return;
    }
    if (c === 2) return;
    color.set(id, 1);
    stack.push(id);
    for (const dep of combined.get(id) ?? []) visit(dep);
    stack.pop();
    color.set(id, 2);
  };
  for (const id of allIds) if ((color.get(id) ?? 0) === 0) visit(id);

  const seen = new Set<string>();
  for (const c of cycles) {
    const key = [...c].sort((a, b) => a - b).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    errors.push({
      kind: 'cycle',
      taskIds: c,
      message: `Dependency cycle: ${c.join(' → ')}`,
    });
  }

  return { deps, producers, errors };
}

/**
 * Merge artifact-derived deps with each task's existing dependsOn. Returns a
 * new task array — inputs are not mutated. Deduplicates silently.
 *
 * Use this at queue-resolution / pipeline-launch time so sortByDependencies
 * sees artifact edges the same way it sees manual ones.
 */
export function applyArtifactDeps(tasks: Task[], graph?: ArtifactGraph): Task[] {
  const g = graph ?? resolveArtifactGraph(tasks);
  if (g.deps.size === 0) return tasks;
  return tasks.map(t => {
    const extra = g.deps.get(t.id);
    if (!extra || extra.size === 0) return t;
    const existing = Array.isArray(t.dependsOn) ? t.dependsOn : [];
    const merged = new Set<number>(existing);
    for (const id of extra) merged.add(id);
    if (merged.size === existing.length && existing.every(id => merged.has(id))) return t;
    return { ...t, dependsOn: [...merged] };
  });
}
