#!/usr/bin/env node

/**
 * task-start.cjs — Atomically mark a task as in-progress in .devmanager/state.json
 *
 * Usage:
 *   node .devmanager/bin/task-start.cjs <taskId>
 *
 * What it does:
 *   - Finds .devmanager/state.json (walks up from cwd if needed)
 *   - Sets status: "in-progress", startedAt on the task
 *   - Removes the task from the queue array (if present)
 *   - Updates savedAt
 *   - Writes back atomically with writeFileSync
 *
 * Exit codes:
 *   0 = success
 *   1 = error (task not found, bad args, etc.)
 */

const fs = require('fs');
const path = require('path');

// --- Argument parsing ---

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node .devmanager/bin/task-start.cjs <taskId>');
  process.exit(1);
}

const taskId = parseInt(args[0], 10);
if (isNaN(taskId)) {
  console.error(`Error: Invalid task ID "${args[0]}" — must be a number.`);
  process.exit(1);
}

// --- Find state.json by walking up directories ---

function findStateJson(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, '.devmanager', 'state.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) {
      return null;
    }
    dir = parent;
  }
}

const stateFile = findStateJson(process.cwd());
if (!stateFile) {
  console.error('Error: Could not find .devmanager/state.json in current directory or any parent.');
  process.exit(1);
}

// --- Read, modify, write ---

let raw;
try {
  raw = fs.readFileSync(stateFile, 'utf-8');
} catch (err) {
  console.error(`Error reading ${stateFile}: ${err.message}`);
  process.exit(1);
}

let state;
try {
  state = JSON.parse(raw);
} catch (err) {
  console.error(`Error parsing ${stateFile}: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(state.tasks)) {
  console.error('Error: state.json has no tasks array.');
  process.exit(1);
}

const task = state.tasks.find(t => t.id === taskId);
if (!task) {
  console.error(`Error: Task ${taskId} not found in state.json.`);
  console.error(`Available task IDs: ${state.tasks.map(t => t.id).join(', ')}`);
  process.exit(1);
}

// Apply changes
task.status = 'in-progress';
task.startedAt = new Date().toISOString();

// Remove task from queue if present
if (Array.isArray(state.queue)) {
  state.queue = state.queue.filter(q => q.task !== taskId);
}

// Update savedAt
state.savedAt = new Date().toISOString();

// Write back
try {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
} catch (err) {
  console.error(`Error writing ${stateFile}: ${err.message}`);
  process.exit(1);
}

console.log(`Started: Task ${taskId} ("${task.name}") marked as in-progress.`);
console.log(`  status: in-progress`);
console.log(`  startedAt: ${task.startedAt}`);
console.log(`  removed from queue`);
console.log(`  state.json updated: ${stateFile}`);
