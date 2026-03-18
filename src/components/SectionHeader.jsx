import React from 'react';

export function SectionHeader({ title, count, extra }) {
  return (
    <div className="panel-header" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px',
    }}>
      <span className="section-label">
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {count != null ? (
          <span className="text-light" style={{ fontSize: '11px' }}>{count}</span>
        ) : null}
        {extra || null}
      </div>
    </div>
  );
}
