import { describe, it, expect } from 'vitest';
import { validateState } from '../utils/validateState.ts';
import { validateState as sanitizeState } from '../validate.ts';

describe('validateState', () => {
  it('valid minimal state passes', () => {
    const result = validateState({
      tasks: [{ id: 1, name: 'Task 1' }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('non-object fails', () => {
    expect(validateState(null).valid).toBe(false);
    expect(validateState(null).errors).toContain('State must be an object');

    expect(validateState(undefined).valid).toBe(false);
    expect(validateState('string').valid).toBe(false);
    expect(validateState(42).valid).toBe(false);
  });

  it('missing tasks array fails', () => {
    const result = validateState({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('tasks must be an array');
  });

  it('task without id fails', () => {
    const result = validateState({
      tasks: [{ name: 'No id' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('tasks[0].id must be a number');
  });

  it('task without name fails', () => {
    const result = validateState({
      tasks: [{ id: 1 }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('tasks[0].name must be a non-empty string');
  });

  it('duplicate task ids detected', () => {
    const result = validateState({
      tasks: [
        { id: 1, name: 'Task A' },
        { id: 1, name: 'Task B' },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duplicate task id: 1');
  });

  it('invalid status detected', () => {
    const result = validateState({
      tasks: [{ id: 1, name: 'Task 1', status: 'invalid-status' }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('"invalid-status" is not valid'))).toBe(true);
  });

  it('invalid dependsOn detected', () => {
    const result1 = validateState({
      tasks: [{ id: 1, name: 'Task 1', dependsOn: 'not-array' }],
    });
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('tasks[0].dependsOn must be an array');

    const result2 = validateState({
      tasks: [{ id: 1, name: 'Task 1', dependsOn: ['string-dep'] }],
    });
    expect(result2.valid).toBe(false);
    expect(result2.errors.some(e => e.includes('non-number'))).toBe(true);
  });

  it('queue validation', () => {
    const result1 = validateState({
      tasks: [{ id: 1, name: 'Task 1' }],
      queue: 'not-array',
    });
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('queue must be an array');

    const result2 = validateState({
      tasks: [{ id: 1, name: 'Task 1' }],
      queue: [{ task: 'not-number', taskName: 123 }],
    });
    expect(result2.valid).toBe(false);
    expect(result2.errors).toContain('queue[0].task must be a number');
    expect(result2.errors).toContain('queue[0].taskName must be a string');

    const result3 = validateState({
      tasks: [{ id: 1, name: 'Task 1' }],
      queue: [{ task: 1, taskName: 'Task 1' }],
    });
    expect(result3.valid).toBe(true);
  });

  it('activity validation', () => {
    const result1 = validateState({
      tasks: [{ id: 1, name: 'Task 1' }],
      activity: 'not-array',
    });
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('activity must be an array');

    const result2 = validateState({
      tasks: [{ id: 1, name: 'Task 1' }],
      activity: [{ id: 'act_1', time: 123, label: 'test' }],
    });
    expect(result2.valid).toBe(true);
  });
});

describe('sanitizeState (src/validate.ts)', () => {
  it('filters out tasks with invalid status', () => {
    const result = sanitizeState({
      project: 'test',
      tasks: [
        { id: 1, name: 'Valid', status: 'pending' },
        { id: 2, name: 'Bad Status', status: 'invalid-status' },
        { id: 3, name: 'Done', status: 'done' },
      ],
      queue: [],
      taskNotes: {},
      activity: [],
    });
    expect(result).not.toBeNull();
    expect(result!.tasks).toHaveLength(2);
    expect(result!.tasks.map(t => t.id)).toEqual([1, 3]);
  });

  it('filters out tasks with missing status', () => {
    const result = sanitizeState({
      project: 'test',
      tasks: [
        { id: 1, name: 'No Status' },
        { id: 2, name: 'Has Status', status: 'backlog' },
      ],
      queue: [],
      taskNotes: {},
      activity: [],
    });
    expect(result).not.toBeNull();
    expect(result!.tasks).toHaveLength(1);
    expect(result!.tasks[0].id).toBe(2);
  });

  it('keeps tasks with all valid statuses', () => {
    const statuses = ['pending', 'in-progress', 'done', 'blocked', 'paused', 'backlog'];
    const tasks = statuses.map((status, i) => ({ id: i + 1, name: `Task ${i + 1}`, status }));
    const result = sanitizeState({
      project: 'test',
      tasks,
      queue: [],
      taskNotes: {},
      activity: [],
    });
    expect(result).not.toBeNull();
    expect(result!.tasks).toHaveLength(6);
  });
});
