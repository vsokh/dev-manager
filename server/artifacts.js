import { readFile, stat } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { buildArtifactPreamble, TEXT_ARTIFACT_EXTENSIONS, MAX_INLINE_BYTES } from 'agent-runner';

/**
 * Load a task's `consumes` list from .maestro/state.json and build a context
 * preamble that inlines each artifact's contents.
 *
 * Returns an empty string if:
 *  - state can't be read
 *  - taskId is not a valid task
 *  - the task has no consumes
 */
export async function buildTaskPreamble(projectPath, taskId) {
  if (!taskId || taskId <= 0) return '';

  let state;
  try {
    const raw = await readFile(join(projectPath, '.maestro', 'state.json'), 'utf-8');
    state = JSON.parse(raw);
  } catch {
    return '';
  }

  const task = Array.isArray(state?.tasks)
    ? state.tasks.find(t => t && t.id === taskId)
    : null;
  if (!task || !Array.isArray(task.consumes) || task.consumes.length === 0) return '';

  // Snapshot each consumed artifact. Done sequentially — lists are short.
  const cache = new Map();
  for (const raw of task.consumes) {
    if (typeof raw !== 'string') continue;
    const rel = raw.trim().replace(/\\/g, '/');
    if (!rel || cache.has(rel)) continue;

    // Resolve and reject traversal outside projectPath.
    const abs = resolve(projectPath, rel);
    const rootAbs = resolve(projectPath);
    const relFromRoot = relative(rootAbs, abs);
    if (relFromRoot.startsWith('..') || isAbsolute(relFromRoot)) {
      cache.set(rel, { kind: 'error', message: 'path outside project root' });
      continue;
    }

    try {
      const st = await stat(abs);
      if (!st.isFile()) {
        cache.set(rel, { kind: 'error', message: 'not a regular file' });
        continue;
      }
      const ext = extension(rel);
      if (!TEXT_ARTIFACT_EXTENSIONS.has(ext)) {
        cache.set(rel, { kind: 'binary', bytes: st.size });
        continue;
      }
      if (st.size > MAX_INLINE_BYTES * 4) {
        // Very large — read only the head to keep memory bounded.
        const fd = await readFile(abs, { encoding: 'utf-8' });
        cache.set(rel, { kind: 'ok', content: fd, bytes: st.size });
      } else {
        const content = await readFile(abs, 'utf-8');
        cache.set(rel, { kind: 'ok', content, bytes: st.size });
      }
    } catch (err) {
      if (err && err.code === 'ENOENT') cache.set(rel, { kind: 'missing' });
      else cache.set(rel, { kind: 'error', message: err?.message ?? String(err) });
    }
  }

  return buildArtifactPreamble({
    consumes: task.consumes,
    readArtifact: (p) => cache.get(p.trim().replace(/\\/g, '/')) ?? { kind: 'missing' },
  });
}

function extension(p) {
  const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  const base = lastSlash >= 0 ? p.slice(lastSlash + 1) : p;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot).toLowerCase() : '';
}
