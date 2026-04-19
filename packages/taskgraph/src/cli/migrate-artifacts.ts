import * as fs from 'node:fs';
import * as path from 'node:path';
import { requireMaestroDir } from './find-maestro.js';
import { inferArtifacts } from '../graph/inference.js';

// --- Argument parsing ---

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const verbose = args.includes('--verbose') || args.includes('-v');

function printUsage(): never {
  console.error('Usage: node .maestro/bin/migrate-artifacts.cjs [--apply] [--verbose]');
  console.error('');
  console.error('Heuristically infers produces/consumes fields for existing tasks by');
  console.error('scanning their descriptions. Prints a diff by default; --apply writes');
  console.error('the changes (state.json backed up to .maestro/backups/).');
  process.exit(1);
}

if (args.includes('--help') || args.includes('-h')) printUsage();

function normalize(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

// --- Main ---

const maestroDir = requireMaestroDir();
const stateFile = path.join(maestroDir, 'state.json');

let raw: string;
try {
  raw = fs.readFileSync(stateFile, 'utf-8');
} catch (err: any) {
  console.error(`Error reading ${stateFile}: ${err.message}`);
  process.exit(1);
}

let state: any;
try {
  state = JSON.parse(raw);
} catch (err: any) {
  console.error(`Error parsing ${stateFile}: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(state.tasks)) {
  console.error('state.tasks is missing or not an array — nothing to migrate.');
  process.exit(1);
}

interface Diff {
  id: number;
  name: string;
  before: { produces?: string[]; consumes?: string[] };
  after: { produces?: string[]; consumes?: string[] };
}

const diffs: Diff[] = [];
const nextTasks: any[] = [];

for (const task of state.tasks) {
  if (!task || typeof task !== 'object') {
    nextTasks.push(task);
    continue;
  }
  const existingProduces: string[] = Array.isArray(task.produces) ? task.produces.slice() : [];
  const existingConsumes: string[] = Array.isArray(task.consumes) ? task.consumes.slice() : [];
  const { produces, consumes } = inferArtifacts(task.description || '');

  const mergedProduces = mergeUnique(existingProduces, produces);
  const mergedConsumes = mergeUnique(existingConsumes, consumes);

  const changedProduces = !sameSet(existingProduces, mergedProduces);
  const changedConsumes = !sameSet(existingConsumes, mergedConsumes);

  if (changedProduces || changedConsumes) {
    diffs.push({
      id: task.id,
      name: task.name,
      before: { produces: existingProduces, consumes: existingConsumes },
      after: { produces: mergedProduces, consumes: mergedConsumes },
    });
    nextTasks.push({
      ...task,
      ...(mergedProduces.length > 0 ? { produces: mergedProduces } : {}),
      ...(mergedConsumes.length > 0 ? { consumes: mergedConsumes } : {}),
    });
  } else {
    nextTasks.push(task);
  }
}

function mergeUnique(a: string[], b: string[]): string[] {
  const s = new Set<string>();
  for (const x of a) if (typeof x === 'string' && x) s.add(normalize(x));
  for (const x of b) if (typeof x === 'string' && x) s.add(normalize(x));
  return [...s];
}
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a), sb = new Set(b);
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

// --- Report ---

if (diffs.length === 0) {
  console.log('No inferences to apply — every task already matches the heuristic.');
  process.exit(0);
}

console.log(`Inferred changes for ${diffs.length} task${diffs.length === 1 ? '' : 's'}:`);
for (const d of diffs) {
  console.log('');
  console.log(`  #${d.id} ${d.name}`);
  if ((d.before.produces || []).length !== (d.after.produces || []).length) {
    console.log(`    produces: [${(d.before.produces || []).join(', ')}] → [${(d.after.produces || []).join(', ')}]`);
  } else if (verbose && (d.after.produces || []).length > 0) {
    console.log(`    produces: [${(d.after.produces || []).join(', ')}]`);
  }
  if ((d.before.consumes || []).length !== (d.after.consumes || []).length) {
    console.log(`    consumes: [${(d.before.consumes || []).join(', ')}] → [${(d.after.consumes || []).join(', ')}]`);
  } else if (verbose && (d.after.consumes || []).length > 0) {
    console.log(`    consumes: [${(d.after.consumes || []).join(', ')}]`);
  }
}
console.log('');

if (!apply) {
  console.log('Dry run — re-run with --apply to write these changes.');
  process.exit(0);
}

// --- Backup + write ---

const backupsDir = path.join(maestroDir, 'backups');
fs.mkdirSync(backupsDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupsDir, `state-pre-migrate-artifacts-${ts}.json`);
fs.writeFileSync(backupFile, raw, 'utf-8');
console.log(`Backup written to ${backupFile}`);

const nextState = { ...state, tasks: nextTasks };
fs.writeFileSync(stateFile, JSON.stringify(nextState, null, 2), 'utf-8');
console.log(`Applied ${diffs.length} change${diffs.length === 1 ? '' : 's'} to ${stateFile}`);
