const TREND_CONFIG = {
  rising: { arrow: '\u2191', color: '#f85149', label: 'rising' },
  stable: { arrow: '\u2013', color: 'var(--dm-text-muted)', label: 'stable' },
  declining: { arrow: '\u2193', color: '#3fb950', label: 'declining' },
} as const;

export function TrendBadge({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  const cfg = TREND_CONFIG[trend];
  return (
    <span style={{ color: cfg.color, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {cfg.arrow} {cfg.label}
    </span>
  );
}
