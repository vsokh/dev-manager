import React from 'react';

export function ProjectPicker({ onConnect, onReconnect, lastProjectName, status }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '32px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontWeight: 700, fontSize: '28px', color: 'var(--text)', marginBottom: '8px' }}>Dev Manager</h1>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>Open a project folder to get started</p>
      </div>

      <button
        onClick={onConnect}
        disabled={status === 'connecting'}
        style={{
          padding: '14px 36px',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: '16px',
          fontWeight: 600,
          fontFamily: 'var(--font)',
          cursor: status === 'connecting' ? 'wait' : 'pointer',
          boxShadow: 'var(--shadow-md)',
          transition: 'all 0.2s',
          opacity: status === 'connecting' ? 0.7 : 1,
        }}
        onMouseOver={e => { if (status !== 'connecting') e.target.style.opacity = '0.9'; }}
        onMouseOut={e => e.target.style.opacity = status === 'connecting' ? '0.7' : '1'}
      >
        {status === 'connecting' ? 'Connecting...' : 'Open project'}
      </button>

      {lastProjectName ? (
        <button
          onClick={onReconnect}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font)',
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.target.style.color = 'var(--accent)'; e.target.style.background = 'var(--accent-light)'; }}
          onMouseOut={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.background = 'none'; }}
        >
          Last opened: {lastProjectName}
        </button>
      ) : null}

      {status === 'error' ? (
        <div style={{ color: 'var(--danger)', fontSize: '13px' }}>
          Could not connect. Make sure your browser supports the File System Access API.
        </div>
      ) : null}
    </div>
  );
}
