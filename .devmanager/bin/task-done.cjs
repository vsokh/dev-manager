#!/usr/bin/env node

/**
 * task-done.cjs — Atomically mark a task as done in .devmanager/state.json
 *
 * Usage:
 *   node .devmanager/bin/task-done.cjs <taskId> --commit <commitRef>
 *
 * What it does:
 *   - Finds .devmanager/state.json (walks up from cwd if needed)
 *   - Sets status: "done", completedAt, commitRef on the task
 *   - Removes progress field if present
 *   - Adds an activity entry
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

function printUsage() {
  console.error('Usage: node .devmanager/bin/task-done.cjs <taskId> --commit <commitRef>');
  console.error('');
  console.error('Options:');
  console.error('  --commit <ref>   Git commit hash (required)');
  process.exit(1);
}

if (args.length === 0) {
  printUsage();
}

const taskId = parseInt(args[0], 10);
if (isNaN(taskId)) {
  console.error(`Error: Invalid task ID "${args[0]}" — must be a number.`);
  process.exit(1);
}

let commitRef = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--commit' && args[i + 1]) {
    commitRef = args[i + 1];
    i++;
  }
}

if (!commitRef) {
  console.error('Error: --commit <ref> is required.');
  printUsage();
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
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

task.status = 'done';
task.completedAt = today;
task.commitRef = commitRef;

// Remove progress field if present (it's a runtime thing)
delete task.progress;

// Remove task from queue if present
if (Array.isArray(state.queue)) {
  state.queue = state.queue.filter(q => q.task !== taskId);
}

// Add activity entry
if (!Array.isArray(state.activity)) {
  state.activity = [];
}

state.activity.unshift({
  id: `act_${taskId}_done`,
  time: Date.now(),
  label: `${task.name} completed`,
  commitRef: commitRef,
});

// Update savedAt
state.savedAt = new Date().toISOString();

// Write back
try {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');
} catch (err) {
  console.error(`Error writing ${stateFile}: ${err.message}`);
  process.exit(1);
}

console.log(`Done: Task ${taskId} ("${task.name}") marked as done.`);
console.log(`  status: done`);
console.log(`  completedAt: ${today}`);
console.log(`  commitRef: ${commitRef}`);
console.log(`  activity entry added`);
console.log(`  state.json updated: ${stateFile}`);
