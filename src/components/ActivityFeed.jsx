import React, { useState, useMemo } from 'react';

function isCompleted(label) {
  return /completed|done/i.test(label);
}

function getEventType(label) {
  if (/\sadded$/i.test(label)) return 'added';
  if (/completed|done/i.test(label)) return 'completed';
  if (/queued/i.test(label)) return 'queued';
  if (/deleted/i.test(label)) return 'deleted';
  if (/marked/i.test(label)) return 'marked';
  if (/arranged/i.test(label)) return 'arranged';
  return 'other';
}

export function ActivityFeed({ activity, onRemove }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  const filtersActive = typeFilter !== 'all' || searchText !== '';

  const entries = useMemo(() => {
    let sorted = [...activity].sort((a, b) => b.time - a.time);

    if (typeFilter !== 'all') {
      sorted = sorted.filter(a => getEventType(a.label) === typeFilter);
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      sorted = sorted.filter(a => a.label.toLowerCase().includes(lower));
    }

    return sorted
      .slice(0, 15)
      .map(a => {
        const d = new Date(a.time);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return {
          key: a.id,
          label: a.label,
          completed: isCompleted(a.label),
          commitRef: a.commitRef || null,
          filesChanged: a.filesChanged || null,
          isToday,
          date: isToday
            ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        };
      });
  }, [activity, typeFilter, searchText]);

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: '8px', padding: '6px 14px',
        alignItems: 'center', borderBottom: '1px solid var(--border)',
      }}>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            fontSize: '11px', padding: '2px 4px',
            border: '1px solid var(--border)', borderRadius: 4,
            background: 'var(--surface)', color: 'var(--text)',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">All</option>
          <option value="added">Added</option>
          <option value="completed">Completed</option>
          <option value="queued">Queued</option>
          <option value="deleted">Deleted</option>
          <option value="marked">Status change</option>
          <option value="arranged">Arranged</option>
        </select>

        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search..."
          style={{
            flex: 1, fontSize: '11px', padding: '3px 6px',
            border: '1px solid var(--border)', borderRadius: 4,
            background: 'var(--surface)', color: 'var(--text)',
            outline: 'none',
          }}
        />

        {filtersActive && (
          <button
            onClick={() => { setTypeFilter('all'); setSearchText(''); }}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-light)', cursor: 'pointer',
              fontSize: '11px', padding: '0 2px',
            }}
            title="Clear filters"
          >×</button>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div style={{
          padding: '20px 16px', textAlign: 'center', color: 'var(--text-light)', fontSize: '12px',
        }}>
          {filtersActive ? 'No matching activity' : 'No activity yet'}
        </div>
      ) : (
        <div style={{ padding: '2px 0' }}>
          {entries.map(e => (
            <div key={e.key} className="activity-row" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 14px',
              opacity: e.isToday ? 1 : 0.6,
            }}>
              {/* Colored dot */}
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: e.completed ? 'var(--success)' : 'var(--border)',
              }} />

              {/* Label */}
              <span style={{
                flex: 1, fontSize: '12px', color: 'var(--text)',
                fontWeight: e.isToday ? 500 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{e.label}</span>

              {/* Metadata */}
              {e.commitRef ? (
                <span style={{
                  fontFamily: 'monospace', fontSize: '10px', fontWeight: 600,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  padding: '0 5px', borderRadius: '3px', flexShrink: 0,
                }}>{e.commitRef}</span>
              ) : null}

              {/* Timestamp */}
              <span style={{
                fontSize: '10px', color: 'var(--text-light)',
                flexShrink: 0, minWidth: '36px', textAlign: 'right',
              }}>{e.date}</span>

              {/* Remove */}
              <button
                onClick={() => onRemove(e.key)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-light)', fontSize: '11px', padding: '0 2px',
                  lineHeight: 1, opacity: 0, transition: 'opacity 0.15s',
                }}
                className="activity-remove"
                title="Remove"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
