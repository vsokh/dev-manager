import React from 'react';
import type { Task } from '../../types';

interface ArtifactsProps {
  task: Task;
  tasks: Task[];
}

function producerMap(tasks: Task[]): Map<string, Task> {
  const m = new Map<string, Task>();
  for (const t of tasks) {
    if (!Array.isArray(t.produces)) continue;
    for (const raw of t.produces) {
      if (typeof raw !== 'string') continue;
      const p = raw.trim().replace(/\\/g, '/');
      if (!p || m.has(p)) continue;
      m.set(p, t);
    }
  }
  return m;
}

export function Artifacts({ task, tasks }: ArtifactsProps) {
  const produces = (task.produces || []).filter(p => typeof p === 'string' && p.length > 0);
  const consumes = (task.consumes || []).filter(p => typeof p === 'string' && p.length > 0);
  if (produces.length === 0 && consumes.length === 0) return null;

  const producers = producerMap(tasks);

  return (
    <div className="mb-16">
      {produces.length > 0 && (
        <div className="mb-8">
          <div className="label mb-6" title="Files this task must author before it can be marked done">
            PRODUCES
          </div>
          <div className="flex-wrap gap-4">
            {produces.map(p => (
              <span
                key={p}
                className="badge text-11"
                style={{
                  padding: '3px 8px',
                  border: '1px solid var(--dm-border)',
                  borderRadius: 'var(--dm-radius-sm)',
                  background: 'var(--dm-bg)',
                  fontFamily: 'var(--dm-font-mono, monospace)',
                }}
                title={p}
              >
                <span style={{ opacity: 0.6, marginRight: 4 }}>&#128196;</span>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      {consumes.length > 0 && (
        <div>
          <div className="label mb-6" title="Upstream artifacts this task reads before starting">
            CONSUMES
          </div>
          <div className="flex-wrap gap-4">
            {consumes.map(p => {
              const prod = producers.get(p.trim().replace(/\\/g, '/'));
              const missing = !prod;
              return (
                <span
                  key={p}
                  className="badge text-11"
                  title={prod ? `Produced by #${prod.id} ${prod.name}` : 'No producer — will fail at launch'}
                  style={{
                    padding: '3px 8px',
                    border: `1px solid ${missing ? 'var(--dm-danger, #c44)' : 'var(--dm-border)'}`,
                    borderRadius: 'var(--dm-radius-sm)',
                    background: 'var(--dm-bg)',
                    fontFamily: 'var(--dm-font-mono, monospace)',
                    color: missing ? 'var(--dm-danger, #c44)' : undefined,
                  }}
                >
                  <span style={{ opacity: 0.6, marginRight: 4 }}>&#128229;</span>
                  {p}
                  {prod ? (
                    <span style={{ opacity: 0.5, marginLeft: 6, fontFamily: 'inherit' }}>
                      #{prod.id}
                    </span>
                  ) : (
                    <span style={{ marginLeft: 6, fontWeight: 600 }}>!</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
