import React, { useState } from 'react';

export function CommandQueue({ queue, onLaunch, onRemove, onClear, launchedId, projectPath, onSetPath }) {
  const itemKey = (item) => item.task;
  const [editingPath, setEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(projectPath || '');

  const handleSavePath = () => {
    if (pathInput.trim()) {
      onSetPath(pathInput.trim());
      setEditingPath(false);
    }
  };

  // Build command for a queue item
  const cmdForItem = (item) => '/orchestrator task ' + item.task;

  return (
    <div>
      {queue.length === 0 ? (
        <div style={{
          padding: '20px 16px', textAlign: 'center', color: 'var(--text-light)', fontSize: '12px',
          lineHeight: 1.6,
        }}>
          Queue tasks from the detail panel, then launch each in its own terminal.
        </div>
      ) : (
        <div>
          {queue.map((item) => {
            const key = itemKey(item);
            const isLaunched = launchedId === key;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderBottom: '1px solid var(--border)',
              }}>
                <button
                  onClick={() => onLaunch(key, cmdForItem(item), item.taskName)}
                  title={projectPath ? 'Launch in terminal' : 'Set project path first'}
                  style={{
                    padding: '4px 8px', background: isLaunched ? 'var(--success)' : 'var(--accent)',
                    color: 'white', border: 'none', borderRadius: 'var(--radius-sm)',
                    fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    flexShrink: 0, lineHeight: 1,
                  }}
                >{isLaunched ? '✓' : '▶'}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{item.taskName}</span>
                </div>
                <button
                  onClick={() => onRemove(key)}
                  title="Remove from queue"
                  style={{
                    padding: '2px 6px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-light)', fontSize: '14px',
                    lineHeight: 1,
                  }}
                >x</button>
              </div>
            );
          })}

          <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClear} style={{
              padding: '4px 10px', background: 'none', color: 'var(--text-light)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px',
              fontFamily: 'var(--font)', cursor: 'pointer',
            }}>Clear queue</button>
          </div>
        </div>
      )}

      {editingPath ? (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={pathInput}
            onInput={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSavePath()}
            placeholder="C:\Users\you\Projects\my-project"
            autoFocus
            style={{
              flex: 1, padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg)', color: 'var(--text)',
            }}
          />
          <button onClick={handleSavePath} style={{
            padding: '6px 10px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px',
            fontWeight: 600, cursor: 'pointer',
          }}>Save</button>
          <button onClick={() => setEditingPath(false)} style={{
            padding: '6px 8px', background: 'none', color: 'var(--text-light)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px',
            cursor: 'pointer',
          }}>Cancel</button>
        </div>
      ) : (
        <div style={{
          padding: '4px 12px 6px', display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', color: 'var(--text-light)', borderTop: queue.length > 0 ? 'none' : '1px solid var(--border)',
        }}>
          {projectPath ? (
            <>
              <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, opacity: 0.7 }}>{projectPath}</span>
              <button onClick={() => { setPathInput(projectPath); setEditingPath(true); }} style={{
                background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
                fontSize: '11px', textDecoration: 'underline', flexShrink: 0,
              }}>edit</button>
            </>
          ) : (
            <button onClick={() => setEditingPath(true)} style={{
              background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer',
              fontSize: '11px', textDecoration: 'underline',
            }}>Set project path to enable launch</button>
          )}
        </div>
      )}
    </div>
  );
}
