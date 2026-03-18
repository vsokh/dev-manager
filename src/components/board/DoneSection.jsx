import React from 'react';

const handleKeyActivate = (handler) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
};

export function DoneSection({ doneTasks, backlogTasks, doneGroups, backlogGroups, showCompleted, setShowCompleted, showBacklog, setShowBacklog, epicColors, selectedTask, onSelectTask, glowTaskId }) {
  return (
    <>
      {backlogTasks.length > 0 ? (
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowBacklog(p => !p)}
            onKeyDown={handleKeyActivate(() => setShowBacklog(p => !p))}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              padding: '8px 0', userSelect: 'none',
            }}
          >
            <span className="label">Backlog</span>
            <span className="section-toggle-count">{backlogTasks.length}</span>
            <span className="section-toggle-arrow" style={{ transform: showBacklog ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
          </div>
          {showBacklog ? (
            <div style={{ paddingTop: '4px' }}>
              {[...backlogGroups.entries()].map(([groupName, groupTasks]) => (
                <div key={groupName} style={{ marginBottom: '8px' }}>
                  <div className="epic-label-static" style={{
                    marginBottom: '4px',
                    color: (epicColors[groupName] || {}).text || 'var(--dm-text-light)', opacity: 0.6,
                    padding: '1px 5px',
                    background: (epicColors[groupName] || {}).bg || 'transparent',
                  }}>
                    {groupName}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {groupTasks.map(t => (
                      <div key={t.id} data-task-id={t.id} role="button" tabIndex={0} onClick={() => onSelectTask(t.id)} onKeyDown={handleKeyActivate(() => onSelectTask(t.id))}
                        className={`task-card--backlog-compact${selectedTask === t.id ? ' task-card--selected' : ''}${glowTaskId === t.id ? ' task-card-glow' : ''}`}
                        style={{ padding: '5px 10px' }}
                      >
                        <span className="text-backlog-name">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {doneTasks.length > 0 ? (
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowCompleted(p => !p)}
            onKeyDown={handleKeyActivate(() => setShowCompleted(p => !p))}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              padding: '8px 0', userSelect: 'none',
            }}
          >
            <span className="label">Done</span>
            <span className="section-toggle-count">{doneTasks.length}</span>
            <span className="section-toggle-arrow" style={{ transform: showCompleted ? 'rotate(180deg)' : 'none' }}>&#9660;</span>
          </div>
          {showCompleted ? (
            <div style={{ paddingTop: '4px' }}>
              {[...doneGroups.entries()].map(([groupName, groupTasks]) => (
                <div key={groupName} style={{ marginBottom: '8px' }}>
                  <div className="epic-label-static" style={{
                    marginBottom: '4px',
                    color: (epicColors[groupName] || {}).text || 'var(--dm-text-light)', opacity: 0.6,
                    padding: '1px 5px',
                    background: (epicColors[groupName] || {}).bg || 'transparent',
                  }}>
                    {groupName}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {groupTasks.map(t => (
                      <div key={t.id} data-task-id={t.id} role="button" tabIndex={0} onClick={() => onSelectTask(t.id)} onKeyDown={handleKeyActivate(() => onSelectTask(t.id))}
                        className={`task-card--done-compact${selectedTask === t.id ? ' task-card--selected' : ''}${glowTaskId === t.id ? ' task-card-glow' : ''}`}
                        style={{ padding: '5px 10px' }}
                      >
                        <span className="text-backlog-name">{t.name}</span>
                        {t.commitRef ? (
                          <span className="commit-ref" style={{ padding: '0 4px', marginLeft: '5px' }}>{t.commitRef}</span>
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
    </>
  );
}
