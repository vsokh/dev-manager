import { TIMELINE_COLORS } from './shared';

interface SeverityDonutProps {
  errors: number;
  warnings: number;
  infos: number;
}

export function SeverityDonut({ errors, warnings, infos }: SeverityDonutProps) {
  const total = errors + warnings + infos;
  if (total === 0) return null;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: errors, color: TIMELINE_COLORS.errors, label: 'Errors' },
    { value: warnings, color: TIMELINE_COLORS.warnings, label: 'Warnings' },
    { value: infos, color: TIMELINE_COLORS.infos, label: 'Info' },
  ].filter(s => s.value > 0);

  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const dashLen = pct * circumference;
    const dashOffset = -offset;
    offset += dashLen;
    return { ...seg, dashLen, dashOffset, pct };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 120 120" width={120} height={120}>
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={60} cy={60} r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={14}
            strokeDasharray={`${arc.dashLen} ${circumference - arc.dashLen}`}
            strokeDashoffset={arc.dashOffset}
            style={{ transition: 'stroke-dasharray 0.3s, stroke-dashoffset 0.3s' }}
          />
        ))}
        <text x={60} y={56} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: 'var(--dm-text)' }}>
          {total}
        </text>
        <text x={60} y={72} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--dm-text-muted)' }}>
          events
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--dm-text-muted)' }}>
        {segments.map((seg, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
            {seg.label} ({seg.value})
          </span>
        ))}
      </div>
    </div>
  );
}
