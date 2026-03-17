import React from 'react';
import { STATUS } from '../../constants/statuses.js';

export function Dependencies({ task, tasks, onUpdateTask }) {
  const otherTasks = (tasks || []).filter(t => t.id !== task.id && (t.status === STATUS.PENDING || t.status === STATUS.IN_PROGRESS));
  if (otherTasks.length === 0) return null;

  const deps = task.dependsOn || [];
  const selected = otherTasks.filter(t => deps.includes(t.id));
  const available = otherTasks.filter(t => !deps.includes(t.id));

  const toggleDep = (depId) => {
    const next = deps.includes(depId) ? deps.filter(d => d !== depId) : [...deps, depId];
    onUpdateTask(task.id, { dependsOn: next });
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dm-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Depends on {selected.length > 0 ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>({selected.length})</span> : null}
      </div>
      {selected.length > 0 ? (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {selected.map(t => (
            <button
              key={t.id}
              onClick={() => toggleDep(t.id)}
              title="Click to remove dependency"
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                fontFamily: 'var(--dm-font)',
                fontWeight: 600,
                borderRadius: '99px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                border: '1px solid var(--dm-accent)',
                background: 'var(--dm-accent)',
                color: 'white',
              }}
            >
              {t.name} ×
            </button>
          ))}
        </div>
      ) : null}
      {available.length > 0 ? (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {available.map(t => (
            <button
              key={t.id}
              onClick={() => toggleDep(t.id)}
              title="Click to add dependency"
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                fontFamily: 'var(--dm-font)',
                fontWeight: 400,
                borderRadius: '99px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                border: '1px dashed var(--dm-border)',
                background: 'transparent',
                color: 'var(--dm-text-light)',
              }}
            >
              + {t.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
