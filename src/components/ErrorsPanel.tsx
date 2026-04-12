import type { ErrorsReport, ErrorsHistoryEntry } from '../types';
import type { TaskOutput } from '../hooks/useProcessOutput.ts';
import { crashFreeColor, relativeTime } from './errors/shared';
import { ErrorTimeline } from './errors/ErrorTimeline';
import { SeverityDonut } from './errors/SeverityDonut';
import { TypeBreakdown } from './errors/TypeBreakdown';
import { IssueTable } from './errors/IssueTable';
import { ErrorTrackerButton } from './errors/ErrorTrackerButton';

interface ErrorsPanelProps {
  latest: ErrorsReport | null;
  history: ErrorsHistoryEntry[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  errorTrackerOutput?: TaskOutput;
  onClearOutput?: (taskId: number) => void;
}

export function ErrorsPanel({ latest, history: _history, loading, error, onRetry, errorTrackerOutput, onClearOutput }: ErrorsPanelProps) {
  if (loading) {
    return <div className="text-muted p-24 text-13">Loading error data...</div>;
  }

  if (error) {
    return (
      <div className="text-center" style={{ padding: 40 }}>
        <div className="mb-8" style={{ fontSize: 32, opacity: 0.3 }}>&#9888;</div>
        <div className="text-muted text-13 leading-relaxed mb-16">Error data unavailable</div>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-secondary text-12">Retry</button>
        )}
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="text-center" style={{ padding: 40 }}>
        <div className="mb-8" style={{ fontSize: 32, opacity: 0.3 }}>&#128270;</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--dm-text)' }}>No error data yet</div>
        <div className="text-muted text-13 leading-relaxed mb-16">
          Run /error-tracker scan to fetch production errors
        </div>
        <ErrorTrackerButton processOutput={errorTrackerOutput} onClearOutput={onClearOutput} />
      </div>
    );
  }

  const { summary, issues, timeline, typeBreakdown } = latest;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: crashFreeColor(summary.crashFreeRate) }}>
            {summary.crashFreeRate.toFixed(1)}%
          </span>
          <span style={{ fontSize: 13, color: 'var(--dm-text-muted)' }}>crash-free</span>
          <span style={{ fontSize: 11, color: 'var(--dm-text-muted)', marginLeft: 8 }}>
            Last scan: {relativeTime(latest.scannedAt)}
          </span>
        </div>
        <ErrorTrackerButton processOutput={errorTrackerOutput} onClearOutput={onClearOutput} />
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        <StatCard label="Total Events" value={summary.totalEvents} />
        <StatCard label="Unique Issues" value={summary.uniqueIssues} />
        <StatCard label="Crash-free" value={`${summary.crashFreeRate.toFixed(1)}%`} color={crashFreeColor(summary.crashFreeRate)} />
        <StatCard label="Errors" value={summary.errorsCount} color="#f85149" />
        <StatCard label="Warnings" value={summary.warningsCount} color="#d29922" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
        <div>
          <SectionLabel>Events per day</SectionLabel>
          <ErrorTimeline timeline={timeline} />
        </div>
        <div>
          <SectionLabel>Severity</SectionLabel>
          <SeverityDonut errors={summary.errorsCount} warnings={summary.warningsCount} infos={summary.infosCount} />
        </div>
      </div>

      {/* Type breakdown */}
      <div>
        <SectionLabel>Capture type</SectionLabel>
        <TypeBreakdown typeBreakdown={typeBreakdown} />
      </div>

      {/* Issues */}
      <div>
        <SectionLabel>Top issues ({issues.length})</SectionLabel>
        <IssueTable issues={issues} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--dm-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--dm-surface)',
      border: '1px solid var(--dm-border)',
      borderRadius: 'var(--dm-radius-sm)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--dm-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--dm-text)' }}>
        {value}
      </div>
    </div>
  );
}
