export function validateState(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['State must be an object'] };
  }

  // tasks must be an array
  if (!Array.isArray(data.tasks)) {
    errors.push('tasks must be an array');
  } else {
    // Each task must have id (number) and name (string)
    const ids = new Set();
    data.tasks.forEach((t, i) => {
      if (typeof t.id !== 'number') errors.push(`tasks[${i}].id must be a number`);
      if (typeof t.name !== 'string' || !t.name) errors.push(`tasks[${i}].name must be a non-empty string`);
      if (ids.has(t.id)) errors.push(`Duplicate task id: ${t.id}`);
      ids.add(t.id);
      if (t.dependsOn !== undefined && !Array.isArray(t.dependsOn)) {
        errors.push(`tasks[${i}].dependsOn must be an array`);
      }
      if (Array.isArray(t.dependsOn)) {
        t.dependsOn.forEach(dep => {
          if (typeof dep !== 'number') errors.push(`tasks[${i}].dependsOn contains non-number: ${dep}`);
        });
      }
      if (t.status !== undefined) {
        const validStatuses = ['pending', 'in-progress', 'done', 'blocked', 'paused', 'backlog'];
        if (!validStatuses.includes(t.status)) errors.push(`tasks[${i}].status "${t.status}" is not valid`);
      }
    });
  }

  // queue must be an array
  if (data.queue !== undefined && !Array.isArray(data.queue)) {
    errors.push('queue must be an array');
  } else if (Array.isArray(data.queue)) {
    data.queue.forEach((q, i) => {
      if (typeof q.task !== 'number') errors.push(`queue[${i}].task must be a number`);
      if (typeof q.taskName !== 'string') errors.push(`queue[${i}].taskName must be a string`);
    });
  }

  // activity must be an array
  if (data.activity !== undefined && !Array.isArray(data.activity)) {
    errors.push('activity must be an array');
  }

  return { valid: errors.length === 0, errors };
}
