export const SEVERITY_COLORS = {
  high: '#f85149',
  medium: '#d29922',
  low: '#58a6ff',
} as const;

export const TYPE_COLORS: Record<string, string> = {
  caught: '#f85149',
  error: '#ff7b72',
  unhandledrejection: '#d29922',
  message: '#58a6ff',
};

export const TIMELINE_COLORS = {
  errors: '#f85149',
  warnings: '#d29922',
  infos: '#58a6ff',
} as const;

export function severityDot(severity: 'high' | 'medium' | 'low'): string {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function crashFreeColor(rate: number): string {
  if (rate >= 99) return '#3fb950';
  if (rate >= 95) return '#d29922';
  return '#f85149';
}
