import React from 'react';
import { STATUS } from '../../constants/statuses.js';
import { TaskCard } from './TaskCard.jsx';

const handleKeyActivate = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
};

export function EpicGroup({ groupName, groupTasks, tasks, epicColors, editingGroup, setEditingGroup, editGroupName, setEditGroupName, onRenameGroup, onQueueGroup, queue, selectedTask, onSelectTask, onPauseTask, onCancelTask, glowTaskId }) {
  return (
    <div style={{ marginBottom: groupName ? '12px' : '0' }}>
      {groupName ? (
        editingGroup === groupName ? (
          <input
            value={editGroupName}
            onInput={e => setEditGroupName(e.target.value)}
            onBlur={() => {
              const trimmed = editGroupName.trim();
              if (trimmed && trimmed !== groupName && onRenameGroup) onRenameGroup(groupName, trimmed);
              setEditingGroup(null);
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingGroup(null); }}
            autoFocus
            className="input-epic-rename"
            style={{ marginBottom: '6px', padding: '2px 6px' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => { setEditingGroup(groupName); setEditGroupName(groupName); }}
              onKeyDown={handleKeyActivate(() => { setEditingGroup(groupName); setEditGroupName(groupName); })}
              title="Click to rename epic"
              className="epic-label"
              style={{
                color: (epicColors[groupName] || {}).text || 'var(--dm-text-light)',
                padding: '2px 6px',
                background: (epicColors[groupName] || {}).bg || 'transparent',
              }}
            >
              {groupName}
              {(() => {
                const total = tasks.filter(t => t.group === groupName).length;
                const done = tasks.filter(t => t.group === groupName && t.status === STATUS.DONE).length;
                return (
                  <span style={{ fontSize: "9px", fontWeight: 500, color: "var(--dm-text-light)", marginLeft: "6px", letterSpacing: "normal", textTransform: "none" }}>
                    {done}/{total}
                  </span>
                );
              })()}
            </div>
            {onQueueGroup && (() => {
              const unqueued = groupTasks.filter(t => (t.status === STATUS.PENDING || t.status === STATUS.PAUSED) && !(queue || []).some(q => q.task === t.id));
              if (unqueued.length === 0) return null;
              return (
                <button
                  onClick={() => onQueueGroup(groupName)}
                  title={'Queue ' + unqueued.length + ' task(s) from ' + groupName}
                  className="btn-queue-group"
                  style={{ padding: '1px 8px' }}
                >Queue {unqueued.length}</button>
              );
            })()}
          </div>
        )
      ) : null}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {groupTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            tasks={tasks}
            selectedTask={selectedTask}
            onSelectTask={onSelectTask}
            onPauseTask={onPauseTask}
            onCancelTask={onCancelTask}
            glowTaskId={glowTaskId}
          />
        ))}
      </div>
    </div>
  );
}
