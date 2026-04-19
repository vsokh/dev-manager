import type { QueueItem, Task } from '../types.js';
import { resolveArtifactGraph } from '../graph/artifacts.js';

export function sortByDependencies(queueItems: QueueItem[], allTasks: Task[]): QueueItem[] {
  const taskMap = new Map(allTasks.map(t => [t.id, t]));
  const queueIds = new Set(queueItems.map(q => q.task));
  const artifactDeps = resolveArtifactGraph(allTasks).deps;

  const inDegree = new Map<number, number>();
  const edges = new Map<number, number[]>();
  for (const item of queueItems) {
    inDegree.set(item.task, 0);
    edges.set(item.task, []);
  }
  const addEdge = (fromId: number, toId: number) => {
    if (!queueIds.has(fromId) || !queueIds.has(toId)) return;
    const list = edges.get(fromId)!;
    if (list.includes(toId)) return;
    list.push(toId);
    inDegree.set(toId, (inDegree.get(toId) || 0) + 1);
  };
  for (const item of queueItems) {
    const task = taskMap.get(item.task);
    if (task && task.dependsOn) {
      for (const depId of task.dependsOn) addEdge(depId, item.task);
    }
    const extra = artifactDeps.get(item.task);
    if (extra) for (const depId of extra) addEdge(depId, item.task);
  }

  const result: QueueItem[] = [];
  const ready = queueItems.filter(q => (inDegree.get(q.task) || 0) === 0).map(q => q.task);
  const itemMap = new Map(queueItems.map(q => [q.task, q]));
  const placed = new Set<number>();

  while (ready.length > 0) {
    const id = ready.shift()!;
    if (placed.has(id)) continue;
    placed.add(id);
    result.push(itemMap.get(id)!);
    for (const next of (edges.get(id) || [])) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) ready.push(next);
    }
  }

  // Break cycles: force the lowest in-degree node into the ready queue and continue
  if (placed.size < queueItems.length) {
    const cycleIds = queueItems.filter(q => !placed.has(q.task)).map(q => q.task);
    console.warn(`[sortByDependencies] Circular dependency detected: tasks ${cycleIds.join(', ')} could not be topologically sorted.`);

    while (placed.size < queueItems.length) {
      let minId = -1;
      let minDeg = Infinity;
      for (const [id, deg] of inDegree) {
        if (!placed.has(id) && deg < minDeg) {
          minDeg = deg;
          minId = id;
        }
      }
      if (minId === -1) break;

      inDegree.set(minId, 0);
      ready.push(minId);

      while (ready.length > 0) {
        const id = ready.shift()!;
        if (placed.has(id)) continue;
        placed.add(id);
        result.push(itemMap.get(id)!);
        for (const next of (edges.get(id) || [])) {
          inDegree.set(next, inDegree.get(next)! - 1);
          if (inDegree.get(next) === 0) ready.push(next);
        }
      }
    }
  }

  return result;
}
