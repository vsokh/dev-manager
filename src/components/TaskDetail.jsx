import React, { useState, useEffect } from 'react';

export function TaskDetail({ task, tasks, onQueue, onUpdateTask, onDeleteTask, notes, onUpdateNotes }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [localNote, setLocalNote] = useState('');

  useEffect(() => {
    setLocalNote(notes || '');
    setEditing(false);
  }, [task?.id, notes]);

  if (!task) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: 'var(--text-light)', fontSize: '13px',
      padding: '40px 20px', textAlign: 'center', gap: '8px',
    }}>
      <div style={{ fontSize: '24px', opacity: 0.4 }}>◎</div>
      Click a task to see details
    </div>
  );

  const statusOptions = ['pending', 'in-progress', 'done', 'blocked'];
  const currentIdx = statusOptions.indexOf(task.status);

  const badgeClass = task.status === 'done' ? 'badge-done'
    : task.status === 'blocked' ? 'badge-blocked'
    : task.status === 'in-progress' ? 'badge-in-progress'
    : 'badge-pending';

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => {
            const next = statusOptions[(currentIdx + 1) % statusOptions.length];
            onUpdateTask(task.id, { status: next });
          }}
          className={`badge ${badgeClass}`}
          style={{ cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', transition: 'all 0.15s' }}
          title="Click to cycle status"
        >
          {task.status} ↻
        </button>
      </div>

      {task.status === 'in-progress' && task.progress ? (
        <div className="progress-text-shimmer" style={{
          fontSize: '12px', color: 'var(--accent)', marginBottom: '12px',
          padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)',
          fontWeight: 500, lineHeight: 1.4,
        }}>
          {task.progress}
        </div>
      ) : null}

      {editing ? (
        <input
          value={editName}
          onInput={e => setEditName(e.target.value)}
          onBlur={() => { onUpdateTask(task.id, { fullName: editName, name: editName.length > 20 ? editName.slice(0,20) : editName }); setEditing(false); }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          style={{
            width: '100%', fontSize: '14px', fontWeight: 600, lineHeight: 1.4,
            padding: '4px 8px', border: '1px solid var(--accent)', borderRadius: '4px',
            fontFamily: 'var(--font)', background: 'var(--surface)', marginBottom: '16px',
            outline: 'none',
          }}
        />
      ) : (
        <h3
          onClick={() => { setEditName(task.fullName || task.name); setEditing(true); }}
          style={{
            fontSize: '14px', fontWeight: 600, marginBottom: '16px', lineHeight: 1.4,
            cursor: 'pointer', padding: '4px 8px', borderRadius: '4px',
            transition: 'background 0.15s',
          }}
          onMouseOver={e => e.target.style.background = 'var(--bg)'}
          onMouseOut={e => e.target.style.background = 'transparent'}
          title="Click to edit"
        >
          {task.fullName || task.name}
        </h3>
      )}

      {task.skills && task.skills.length > 0 ? (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {task.skills.map(s => (
            <span key={s} className="badge badge-accent" style={{ fontSize: '10px' }}>{s}</span>
          ))}
        </div>
      ) : null}

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Notes for Claude
        </div>
        <textarea
          value={localNote}
          onInput={e => setLocalNote(e.target.value)}
          onBlur={() => onUpdateNotes(task.id, localNote)}
          placeholder="Add notes..."
          rows="4"
          style={{
            width: '100%', fontSize: '12px', fontFamily: 'var(--font)',
            padding: '8px', border: '1px solid var(--border)', borderRadius: '6px',
            background: 'var(--bg)', resize: 'vertical', outline: 'none',
            transition: 'border-color 0.15s', lineHeight: 1.5,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        />
      </div>

      {(() => {
        const otherTasks = (tasks || []).filter(t => t.id !== task.id && (t.status === 'pending' || t.status === 'in-progress'));
        if (otherTasks.length === 0) return null;
        const deps = task.dependsOn || [];
        const toggleDep = (depId) => {
          const next = deps.includes(depId) ? deps.filter(d => d !== depId) : [...deps, depId];
          onUpdateTask(task.id, { dependsOn: next });
        };
        return (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Runs after
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {otherTasks.map(t => {
                const isSelected = deps.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleDep(t.id)}
                    style={{
                      padding: '3px 10px',
                      fontSize: '11px',
                      fontFamily: 'var(--font)',
                      fontWeight: 500,
                      borderRadius: '99px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--text-muted)',
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {task.status === 'pending' ? (
        <button
          onClick={() => onQueue(task)}
          style={{
            width: '100%', padding: '8px 16px',
            background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-sm)',
            fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font)',
            cursor: 'pointer', transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
          onMouseOver={e => e.target.style.opacity = '0.85'}
          onMouseOut={e => e.target.style.opacity = '1'}
        >
          Queue ▶
        </button>
      ) : null}

      <button
        onClick={() => { if (confirm('Delete "' + (task.fullName || task.name) + '"?')) onDeleteTask(task.id); }}
        style={{
          width: '100%', padding: '6px 16px', marginTop: '8px',
          background: 'none', color: 'var(--text-light)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          fontSize: '12px', fontFamily: 'var(--font)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseOver={e => { e.target.style.color = 'var(--danger)'; e.target.style.borderColor = 'var(--danger)'; }}
        onMouseOut={e => { e.target.style.color = 'var(--text-light)'; e.target.style.borderColor = 'var(--border)'; }}
      >Delete task</button>
    </div>
  );
}
