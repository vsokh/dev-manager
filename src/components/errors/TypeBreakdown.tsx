import { TYPE_COLORS } from './shared';

interface TypeBreakdownProps {
  typeBreakdown: Record<string, number>;
}

export function TypeBreakdown({ typeBreakdown }: TypeBreakdownProps) {
  const entries = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const max = Math.max(...entries.map(e => e[1]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {entries.map(([type, count]) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 120, fontSize: 12, fontFamily: 'monospace', color: 'var(--dm-text-muted)', textAlign: 'right', flexShrink: 0 }}>
            {type}
          </span>
          <div style={{ flex: 1, height: 16, background: 'var(--dm-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${(count / max) * 100}%`,
              height: '100%',
              background: TYPE_COLORS[type] || '#58a6ff',
              borderRadius: 3,
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ width: 36, fontSize: 12, fontFamily: 'monospace', color: 'var(--dm-text)', textAlign: 'right', flexShrink: 0 }}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}
