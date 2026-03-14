import React, { useState, useMemo } from 'react';
import { CardForm } from './CardForm.jsx';

export function TaskBoard({ tasks, selectedTask, onSelectTask, onAddTask, onQueueAll, onArrange, queue, onPauseTask, onCancelTask }) {
  const pendingTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
  const allGroups = useMemo(() => [...new Set(tasks.map(t => t.group).filter(Boolean))], [tasks]);
  const pendingGroups = useMemo(() => {
    const grouped = new Map();
    grouped.set(null, []); // ungrouped
    for (const t of pendingTasks) {
      const g = t.group || null;
      if (!grouped.has(g)) grouped.set(g, []);
      grouped.get(g).push(t);
    }
    // Remove empty null group
    if (grouped.get(null).length === 0) grouped.delete(null);
    return grouped;
  }, [pendingTasks]);
  const doneGroups = useMemo(() => {
    const grouped = new Map();
    for (const t of doneTasks) {
      const g = t.group || 'Other';
      if (!grouped.has(g)) grouped.set(g, []);
      grouped.get(g).push(t);
    }
    return grouped;
  }, [doneTasks]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const isWaiting = (task) => {
    const p = (task.progress || '').toLowerCase();
    return /waiting|approval|planning/.test(p);
  };

  const getCardStyle = (task) => {
    const isSelected = selectedTask === task.id;
    const base = {
      background: 'var(--surface)',
      borderRadius: 'var(--radius-sm)', padding: '12px 16px',
      cursor: 'pointer', transition: 'all 0.15s',
      minWidth: '160px', flex: '1 1 160px', maxWidth: '260px',
    };
    if (task.status === 'in-progress') {
      const waiting = isWaiting(task);
      const color = waiting ? 'var(--amber)' : 'var(--accent)';
      return {
        ...base,
        border: '2px solid ' + color,
        boxShadow: isSelected ? '0 2px 8px ' + (waiting ? 'rgba(196,132,90,0.25)' : 'rgba(106,141,190,0.25)') : 'var(--shadow-sm)',
      };
    }
    if (task.status === 'done') {
      return {
        ...base,
        border: isSelected ? '2px solid var(--success)' : '1px solid var(--success)',
        boxShadow: isSelected ? '0 2px 8px rgba(90,158,114,0.2)' : 'var(--shadow-sm)',
        opacity: 0.75,
      };
    }
    if (task.status === 'paused') {
      return {
        ...base,
        border: isSelected ? '2px solid #9b8bb4' : '1px dashed #9b8bb4',
        boxShadow: isSelected ? '0 2px 8px rgba(155,139,180,0.2)' : 'var(--shadow-sm)',
        opacity: 0.85,
      };
    }
    if (task.status === 'blocked') {
      return {
        ...base,
        border: isSelected ? '2px solid var(--text-light)' : '1px solid var(--border)',
        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'var(--shadow-sm)',
        opacity: 0.6,
      };
    }
    // pending (default)
    return {
      ...base,
      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
      boxShadow: isSelected ? '0 2px 8px rgba(106,141,190,0.2)' : 'var(--shadow-sm)',
    };
  };

  const renderTaskCard = (task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={task.status === 'in-progress' ? 'task-card-in-progress' : undefined}
              style={getCardStyle(task)}
              onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = selectedTask === task.id ? '0 2px 8px rgba(106,141,190,0.2)' : 'var(--shadow-sm)'}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {task.manual ? <span title="Manual task" style={{
                  fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
                  background: 'var(--border)', color: 'var(--text-light)', letterSpacing: '0.03em',
                }}>YOU</span> : null}
                {task.name}
              </div>
              {task.dependsOn && task.dependsOn.length > 0 ? (
                <div style={{ fontSize: '10px', color: 'var(--text-light)', fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  after: {task.dependsOn.map(depId => {
                    const dep = tasks.find(t => t.id === depId);
                    return dep ? dep.name : '?';
                  }).join(', ')}
                </div>
              ) : null}
              {task.status === 'in-progress' && task.progress ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <div className="progress-text-shimmer" style={{ fontSize: '11px', color: isWaiting(task) ? 'var(--amber)' : 'var(--accent)', lineHeight: 1.3, flex: 1 }}>
                    {task.progress}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onPauseTask(task.id); }}
                    title="Pause — save progress, resume later"
                    style={{
                      padding: '1px 6px', background: 'none', border: '1px solid var(--border)',
                      borderRadius: '3px', cursor: 'pointer', color: 'var(--text-light)',
                      fontSize: '10px', fontFamily: 'var(--font)', lineHeight: 1.4,
                      flexShrink: 0, transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { e.target.style.borderColor = '#9b8bb4'; e.target.style.color = '#9b8bb4'; }}
                    onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-light)'; }}
                  >&#9646;&#9646;</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelTask(task.id); }}
                    title="Cancel — discard progress, reset to pending"
                    style={{
                      padding: '1px 6px', background: 'none', border: '1px solid var(--border)',
                      borderRadius: '3px', cursor: 'pointer', color: 'var(--text-light)',
                      fontSize: '10px', fontFamily: 'var(--font)', lineHeight: 1.4,
                      flexShrink: 0, transition: 'all 0.15s',
                    }}
                    onMouseOver={e => { e.target.style.borderColor = 'var(--danger)'; e.target.style.color = 'var(--danger)'; }}
                    onMouseOut={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-light)'; }}
                  >✕</button>
                </div>
              ) : null}
              {task.status === 'paused' ? (
                <div style={{ fontSize: '11px', color: '#9b8bb4', marginTop: '4px', lineHeight: 1.3 }}>
                  {task.lastProgress || 'Paused'}
                  {task.branch ? (
                    <div style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.7, marginTop: '2px' }}>{task.branch}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Up next
        </div>
        {[...pendingGroups.entries()].map(([groupName, groupTasks]) => (
          <div key={groupName || '__ungrouped'} style={{ marginBottom: groupName ? '12px' : '0' }}>
            {groupName ? (
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-light)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {groupName}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {groupTasks.map(renderTaskCard)}
            </div>
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
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-light)', fontSize: '13px', fontWeight: 500,
              marginTop: '8px',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-light)'; }}
          >+ Add task</div>
        ) : null}
        {showNewForm ? (
          <div style={{ marginTop: '12px', maxWidth: '380px' }}>
            <CardForm
              card={null}
              groups={allGroups}
              onSave={(task) => { onAddTask(task); setShowNewForm(false); }}
              onCancel={() => setShowNewForm(false)}
            />
          </div>
        ) : null}
        {pendingTasks.length >= 2 ? (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={onArrange}
              style={{
                padding: '5px 14px', background: 'none',
                color: 'var(--amber)', border: '1px solid var(--amber)',
                borderRadius: 'var(--radius-sm)', fontSize: '12px',
                fontWeight: 600, fontFamily: 'var(--font)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.target.style.background = 'var(--amber)'; e.target.style.color = 'white'; }}
              onMouseOut={e => { e.target.style.background = 'none'; e.target.style.color = 'var(--amber)'; }}
            >
              Arrange tasks
            </button>
            {(() => {
              const pendingNotQueued = tasks.filter(t => (t.status === 'pending' || t.status === 'paused') && !(queue || []).some(q => q.task === t.id));
              if (pendingNotQueued.length === 0) return null;
              return (
                <button
                  onClick={onQueueAll}
                  style={{
                    padding: '5px 14px', background: 'none',
                    color: 'var(--accent)', border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius-sm)', fontSize: '12px',
                    fontWeight: 600, fontFamily: 'var(--font)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.target.style.background = 'var(--accent)'; e.target.style.color = 'white'; }}
                  onMouseOut={e => { e.target.style.background = 'none'; e.target.style.color = 'var(--accent)'; }}
                >
                  Queue all ({pendingNotQueued.length})
                </button>
              );
            })()}
          </div>
        ) : null}
      </div>

      {doneTasks.length > 0 ? (
        <div>
          <div
            onClick={() => setShowCompleted(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              padding: '8px 0', userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Done
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'var(--success-light)', color: 'var(--success)',
              fontSize: '11px', fontWeight: 700,
            }}>{doneTasks.length}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-light)', transform: showCompleted ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </div>
          {showCompleted ? (
            <div style={{ paddingTop: '4px' }}>
              {[...doneGroups.entries()].map(([groupName, groupTasks]) => (
                <div key={groupName} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--success)', opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {groupName}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {groupTasks.map(t => (
                      <div key={t.id} onClick={() => onSelectTask(t.id)} style={{
                        background: 'var(--success-light)', border: selectedTask === t.id ? '2px solid var(--success)' : '1px solid var(--success)',
                        borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--success)' }}>{t.name}</span>
                        {t.commitRef ? (
                          <span style={{
                            fontFamily: 'monospace', fontSize: '9px', fontWeight: 600,
                            background: 'rgba(90,158,114,0.15)', color: 'var(--success)',
                            padding: '0 4px', borderRadius: '3px', marginLeft: '6px',
                          }}>{t.commitRef}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
