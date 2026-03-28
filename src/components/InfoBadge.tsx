import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { SkillInfo } from '../types';

interface InfoBadgeProps {
  info: SkillInfo;
  active: boolean;
  onClick?: () => void;
}

export function InfoBadge({ info, active, onClick }: InfoBadgeProps) {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties | null>(null);
  const badgeRef = React.useRef<HTMLSpanElement>(null);
  const isAgent = info.type === 'agent';

  const handleMouseEnter = () => {
    if (!badgeRef.current) { setTooltipStyle(null); return; }
    const rect = badgeRef.current.getBoundingClientRect();
    setTooltipStyle({
      position: 'fixed',
      left: Math.min(rect.left, window.innerWidth - 530),
      top: rect.bottom + 6,
      zIndex: 200, minWidth: '350px', maxWidth: '520px',
      padding: '6px 10px', fontSize: '11px', lineHeight: 1.4,
      background: 'var(--dm-surface)', color: 'var(--dm-text)',
      border: '1px solid var(--dm-border)', borderRadius: '6px',
      boxShadow: 'var(--dm-shadow-lg)',
      pointerEvents: 'none' as const,
    });
  };

  const handleMouseLeave = () => { setTooltipStyle(null); };

  return (
    <span
      ref={badgeRef}
      style={{ display: 'inline-block', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <span
        className={`badge ${isAgent ? 'badge-amber' : 'badge-accent'} text-10`}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          opacity: active ? 1 : 0.45,
          outline: active ? `2px solid ${isAgent ? 'var(--dm-amber)' : 'var(--dm-accent)'}` : 'none',
          outlineOffset: '1px',
        }}
      >{info.name}</span>
      {tooltipStyle && info.description ? ReactDOM.createPortal(
        <div style={tooltipStyle}>{info.description}</div>,
        document.body,
      ) : null}
    </span>
  );
}
