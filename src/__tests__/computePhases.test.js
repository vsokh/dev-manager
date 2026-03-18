import { describe, it, expect } from 'vitest';
import { computePhases } from '../utils/computePhases.js';

// Helper to make queue items
const q = (id) => ({ task: id, taskName: `Task ${id}`, notes: '' });

// Helper to make tasks with optional dependencies
const t = (id, dependsOn) => {
  const task = { id, name: `Task ${id}`, status: 'pending' };
  if (dependsOn) task.dependsOn = dependsOn;
  return task;
};

describe('computePhases', () => {
  it('returns null when no inter-queue dependencies', () => {
    const queue = [q(1), q(2), q(3)];
    const tasks = [t(1), t(2), t(3)];
    const result = computePhases(queue, tasks);
    expect(result).toBeNull();
  });

  it('single dependency creates 2 phases', () => {
    // Task 2 depends on Task 1
    const queue = [q(1), q(2)];
    const tasks = [t(1), t(2, [1])];
    const result = computePhases(queue, tasks);
    expect(result).toHaveLength(2);
    expect(result[0].map(r => r.task)).toEqual([1]);
    expect(result[1].map(r => r.task)).toEqual([2]);
  });

  it('chain A -> B -> C creates 3 phases', () => {
    const queue = [q(1), q(2), q(3)];
    const tasks = [t(1), t(2, [1]), t(3, [2])];
    const result = computePhases(queue, tasks);
    expect(result).toHaveLength(3);
    expect(result[0].map(r => r.task)).toEqual([1]);
    expect(result[1].map(r => r.task)).toEqual([2]);
    expect(result[2].map(r => r.task)).toEqual([3]);
  });

  it('parallel tasks with shared dep: [A] then [B, C]', () => {
    // B depends on A, C depends on A
    const queue = [q(1), q(2), q(3)];
    const tasks = [t(1), t(2, [1]), t(3, [1])];
    const result = computePhases(queue, tasks);
    expect(result).toHaveLength(2);
    expect(result[0].map(r => r.task)).toEqual([1]);
    expect(result[1].map(r => r.task).sort()).toEqual([2, 3]);
  });

  it('cyclic deps get safety-pushed into same phase', () => {
    // Task 1 depends on Task 2, Task 2 depends on Task 1 (cycle)
    const queue = [q(1), q(2)];
    const tasks = [t(1, [2]), t(2, [1])];
    const result = computePhases(queue, tasks);
    // Both are cyclic, so they should be pushed into a single phase via the safety mechanism
    expect(result).not.toBeNull();
    // All items should appear somewhere in the phases
    const allIds = result.flatMap(phase => phase.map(r => r.task)).sort();
    expect(allIds).toEqual([1, 2]);
  });

  it('empty queue returns null', () => {
    const result = computePhases([], [t(1)]);
    expect(result).toBeNull();
  });

  it('tasks with deps on non-queued tasks returns null (no inter-queue deps)', () => {
    // Task 2 depends on Task 1, but Task 1 is NOT in queue
    const queue = [q(2), q(3)];
    const tasks = [t(1), t(2, [1]), t(3)];
    const result = computePhases(queue, tasks);
    expect(result).toBeNull();
  });
});
