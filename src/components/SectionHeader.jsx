import React from 'react';

export function SectionHeader({ title, count, extra }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {count != null ? (
          <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>{count}</span>
        ) : null}
        {extra || null}
      </div>
    </div>
  );
}
