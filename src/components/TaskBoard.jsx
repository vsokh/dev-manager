import React, { useState, useMemo } from 'react';
import { CardForm } from './CardForm.jsx';

export function TaskBoard({ tasks, features, selectedTask, onSelectTask, onAddTask }) {
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Up next
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {pendingTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              style={{
                background: 'var(--surface)',
                border: selectedTask === task.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: selectedTask === task.id ? '0 2px 8px rgba(106,141,190,0.2)' : 'var(--shadow-sm)',
                minWidth: '160px', flex: '1 1 160px', maxWidth: '260px',
              }}
              onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = selectedTask === task.id ? '0 2px 8px rgba(106,141,190,0.2)' : 'var(--shadow-sm)'}
            >
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{task.name}</div>
            </div>
          ))}
          {pendingTasks.length === 0 && !showNewForm ? (
            <div style={{
              padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '13px',
              width: '100%',
            }}>
              No tasks yet
            </div>
          ) : null}
          {!showNewForm ? (
            <div
              onClick={() => setShowNewForm(true)}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                cursor: 'pointer', transition: 'all 0.15s',
                minWidth: '160px', flex: '1 1 160px', maxWidth: '260px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-light)', fontSize: '13px', fontWeight: 500,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-light)'; }}
            >+ Add task</div>
          ) : null}
        </div>
        {showNewForm ? (
          <div style={{ marginTop: '12px', maxWidth: '380px' }}>
            <CardForm
              card={null}
              onSave={(task) => { onAddTask(task); setShowNewForm(false); }}
              onCancel={() => setShowNewForm(false)}
            />
          </div>
        ) : null}
      </div>

      {features.length > 0 ? (
        <div>
          <div
            onClick={() => setShowCompleted(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              padding: '8px 0', userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shipped
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'var(--success-light)', color: 'var(--success)',
              fontSize: '11px', fontWeight: 700,
            }}>{features.length}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-light)', transform: showCompleted ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>
          {showCompleted ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
              {features.map(f => (
                <div key={f.id} style={{
                  background: 'var(--success-light)', border: '1px solid var(--success)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  minWidth: '140px', flex: '1 1 140px', maxWidth: '220px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--success)', marginBottom: '2px' }}>
                    {f.name}
                  </div>
                  {f.description ? (
                    <div style={{ fontSize: '11px', color: 'var(--success)', opacity: 0.8, lineHeight: 1.4 }}>
                      {f.description}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
