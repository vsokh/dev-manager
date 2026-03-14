import React, { useEffect, useState } from 'react';

export function UndoToast({ entry, onUndo, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (entry) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [entry]);

  if (!entry && !visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.2s ease, opacity 0.2s ease',
      zIndex: 1000,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-md)',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '13px',
      color: 'var(--text)',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{entry?.label}</span>
      <button
        onClick={onUndo}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent)',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          padding: '2px 8px',
          borderRadius: '4px',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.target.style.background = 'var(--accent-light)'}
        onMouseLeave={e => e.target.style.background = 'none'}
      >
        Undo
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-light)',
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '16px',
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>
    </div>
  );
}
