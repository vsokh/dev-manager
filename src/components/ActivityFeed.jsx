import React, { useMemo } from 'react';

export function ActivityFeed({ activity }) {
  const entries = useMemo(() => {
    return [...activity]
      .sort((a, b) => b.time - a.time)
      .slice(0, 12)
      .map(a => {
        const d = new Date(a.time);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return {
          key: a.id,
          label: a.label,
          commitRef: a.commitRef || null,
          filesChanged: a.filesChanged || null,
          date: isToday
            ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        };
      });
  }, [activity]);

  if (entries.length === 0) {
    return (
      <div style={{
        padding: '20px 16px', textAlign: 'center', color: 'var(--text-light)', fontSize: '12px',
      }}>
        No activity yet
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {entries.map(e => (
        <div key={e.key} style={{
          display: 'flex', alignItems: 'baseline', gap: '8px',
          padding: '6px 16px', fontSize: '12px', flexWrap: 'wrap',
        }}>
          <span style={{ color: 'var(--text-light)', fontSize: '11px', flexShrink: 0, minWidth: '48px' }}>{e.date}</span>
          <span style={{ color: 'var(--text-muted)' }}>{e.label}</span>
          {e.commitRef ? (
            <span style={{
              fontFamily: 'monospace', fontSize: '10px', fontWeight: 600,
              background: 'var(--accent-light)', color: 'var(--accent)',
              padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.02em',
            }}>{e.commitRef}</span>
          ) : null}
          {e.filesChanged ? (
            <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>
              {e.filesChanged} file{e.filesChanged !== 1 ? 's' : ''} changed
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
