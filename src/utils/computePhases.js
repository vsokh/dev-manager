export function computePhases(queue, tasks) {
  const taskMap = new Map((tasks || []).map(t => [t.id, t]));
  const queueIds = new Set(queue.map(q => q.task));

  // Check if any queued task has dependencies on other queued tasks
  const hasDeps = queue.some(q => {
    const task = taskMap.get(q.task);
    return task && task.dependsOn && task.dependsOn.some(d => queueIds.has(d));
  });

  if (!hasDeps) return null; // flat list, no phases needed

  const assigned = new Map(); // taskId → phase number
  const phases = []; // array of arrays of queue items

  // Iteratively assign phases
  let remaining = [...queue];
  let phaseNum = 0;
  while (remaining.length > 0) {
    phaseNum++;
    const thisPhase = [];
    const stillRemaining = [];

    for (const item of remaining) {
      const task = taskMap.get(item.task);
      const deps = (task && task.dependsOn) ? task.dependsOn.filter(d => queueIds.has(d)) : [];
      const allDepsAssigned = deps.every(d => assigned.has(d) && assigned.get(d) < phaseNum);
      if (allDepsAssigned) {
        thisPhase.push(item);
        assigned.set(item.task, phaseNum);
      } else {
        stillRemaining.push(item);
      }
    }

    // Safety: if no progress, push remaining into current phase (cycle)
    if (thisPhase.length === 0) {
      for (const item of stillRemaining) {
        thisPhase.push(item);
        assigned.set(item.task, phaseNum);
      }
      stillRemaining.length = 0;
    }

    phases.push(thisPhase);
    remaining = stillRemaining;
  }

  return phases;
}
