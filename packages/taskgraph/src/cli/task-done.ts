import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { requireMaestroDir } from './find-maestro.js';
import { validateProducedArtifacts } from '../graph/produced.js';

// --- Argument parsing ---

const args = process.argv.slice(2);

function printUsage(): never {
  console.error('Usage: node .maestro/bin/task-done.cjs <taskId> --commit <commitRef>');
  console.error('');
  console.error('Options:');
  console.error('  --commit <ref>   Git commit hash (required)');
  process.exit(1);
}

if (args.length === 0) printUsage();

const taskId = parseInt(args[0], 10);
if (isNaN(taskId)) {
  console.error(`Error: Invalid task ID "${args[0]}" — must be a number.`);
  process.exit(1);
}

let commitRef: string | null = null;
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

const maestroDir = requireMaestroDir();
const projectRoot = path.dirname(maestroDir);

// --- Load config (optional) ---

let enforceArtifacts = false;
try {
  const cfgRaw = fs.readFileSync(path.join(maestroDir, 'config.json'), 'utf-8');
  const cfg = JSON.parse(cfgRaw);
  if (cfg && typeof cfg.enforceArtifacts === 'boolean') enforceArtifacts = cfg.enforceArtifacts;
} catch {
  // no config → defaults
}

// --- Find task's produces list (optional) ---

let produces: string[] | undefined;
try {
  const stateRaw = fs.readFileSync(path.join(maestroDir, 'state.json'), 'utf-8');
  const state = JSON.parse(stateRaw);
  const task = Array.isArray(state?.tasks) ? state.tasks.find((t: any) => t && t.id === taskId) : null;
  if (task && Array.isArray(task.produces)) produces = task.produces;
} catch {
  // state unreadable → skip validation
}

// --- Validate produced artifacts ---

const validation = validateProducedArtifacts(produces, (rel) => {
  const abs = path.resolve(projectRoot, rel);
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) return { exists: false, bytes: 0 };
    if (st.size <= 0) return { exists: true, bytes: 0 };
    const buf = fs.readFileSync(abs);
    const sha = createHash('sha256').update(buf).digest('hex');
    return { exists: true, bytes: st.size, sha };
  } catch {
    return { exists: false, bytes: 0 };
  }
});

// --- Write progress file ---

const progressDir = path.join(maestroDir, 'progress');
fs.mkdirSync(progressDir, { recursive: true });
const progressFile = path.join(progressDir, `${taskId}.json`);
const today = new Date().toISOString().split('T')[0];

if (!validation.ok && enforceArtifacts) {
  const lines: string[] = [];
  if (validation.missing.length > 0) lines.push(`missing: ${validation.missing.join(', ')}`);
  if (validation.empty.length > 0) lines.push(`empty: ${validation.empty.join(', ')}`);
  const reason = `artifact_missing — ${lines.join(' | ')}`;

  const progressData: Record<string, unknown> = {
    status: 'paused',
    progress: reason,
    artifactCheck: {
      ok: false,
      missing: validation.missing,
      empty: validation.empty,
    },
  };
  if (validation.producedArtifacts.length > 0) {
    progressData.producedArtifacts = validation.producedArtifacts;
  }

  try {
    fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf-8');
  } catch (err: any) {
    console.error(`Error writing ${progressFile}: ${err.message}`);
    process.exit(1);
  }

  console.error(`Task ${taskId}: ${reason}`);
  console.error(`  enforceArtifacts=true — refusing to mark done.`);
  console.error(`  progress file: ${progressFile}`);
  process.exit(2);
}

const progressData: Record<string, unknown> = {
  status: 'done',
  completedAt: today,
  commitRef,
};
if (validation.producedArtifacts.length > 0) {
  progressData.producedArtifacts = validation.producedArtifacts;
}
if (!validation.ok) {
  // enforce flag off, but still surface the finding so the UI can flag it
  progressData.artifactCheck = {
    ok: false,
    missing: validation.missing,
    empty: validation.empty,
  };
}

try {
  fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2), 'utf-8');
} catch (err: any) {
  console.error(`Error writing ${progressFile}: ${err.message}`);
  process.exit(1);
}

console.log(`Done: Task ${taskId} marked as done.`);
console.log(`  completedAt: ${today}`);
console.log(`  commitRef: ${commitRef}`);
if (validation.producedArtifacts.length > 0) {
  console.log(`  producedArtifacts: ${validation.producedArtifacts.length}`);
}
if (!validation.ok) {
  console.warn(`  WARNING: artifact check failed — missing=[${validation.missing.join(', ')}] empty=[${validation.empty.join(', ')}] (enforceArtifacts=false)`);
}
console.log(`  progress file: ${progressFile}`);
