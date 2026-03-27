import React, { useMemo } from 'react';
import type { QualityReport, QualityHistoryEntry } from '../types';
import type { TaskOutput } from '../hooks/useProcessOutput.ts';
import { gradeClass } from './quality/shared';
import { Pill } from './quality/Tooltip';
import { HealthcheckButton, AutofixButton } from './quality/LaunchButtons';
import { RadarChart } from './quality/RadarChart';
import { TimelineChart } from './quality/TimelineChart';
import { Scorecard } from './quality/Scorecard';
import { FindingsPanel } from './quality/FindingsPanel';
import {
  QUALITY_LOADING, QUALITY_UNAVAILABLE, QUALITY_RETRY, QUALITY_NO_DATA,
  QUALITY_RADAR, QUALITY_HISTORY, QUALITY_BASELINE,
} from '../constants/strings.ts';

interface QualityPanelProps {
  latest: QualityReport | null;
  history: QualityHistoryEntry[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  healthcheckOutput?: TaskOutput;
  autofixOutput?: TaskOutput;
  onClearOutput?: (taskId: number) => void;
}

export function QualityPanel({ latest, history, loading, error, onRetry, healthcheckOutput, autofixOutput, onClearOutput }: QualityPanelProps) {
  const prev = useMemo(() => history.length > 1 ? history[history.length - 2] : null, [history]);

  if (loading) {
    return <div className="text-muted p-24 text-13">{QUALITY_LOADING}</div>;
  }

  if (error) {
    return (
      <div className="text-center" style={{ padding: 40 }}>
        <div className="mb-8" style={{ fontSize: 32, opacity: 0.3 }}>&#9888;</div>
        <div className="text-muted text-13 leading-relaxed mb-16">
          {QUALITY_UNAVAILABLE}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-secondary text-12"
          >
            {QUALITY_RETRY}
          </button>
        )}
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="text-center" style={{ padding: 40 }}>
        <div className="mb-8" style={{ fontSize: 32, opacity: 0.3 }}>&#9776;</div>
        <div className="text-muted text-13 leading-relaxed mb-16">
          {QUALITY_NO_DATA}
        </div>
        <div className="flex gap-6 justify-center">
          <HealthcheckButton processOutput={healthcheckOutput} onClearOutput={onClearOutput} />
          <AutofixButton processOutput={autofixOutput} onClearOutput={onClearOutput} />
        </div>
      </div>
    );
  }

  const b = latest.baseline || {};
  const scoreDelta = prev ? (latest.overallScore - prev.overallScore).toFixed(1) : null;

  return (
    <div style={{ padding: '0 16px 16px' }}>

      {/* -- Header row: grade + score + baseline pills -- */}
      <div className="flex-center flex-wrap mb-12" style={{ gap: 14 }}>
        <div className="flex-center justify-center text-24 font-700 shrink-0" style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--dm-accent-bg-subtle)', color: gradeClass(latest.grade),
        }}>
          {latest.grade}
        </div>
        <div>
          <div className="font-700" style={{ fontSize: 28, lineHeight: 1 }}>
            {latest.overallScore.toFixed(1)}
            <span className="text-muted text-14 font-400">/10</span>
          </div>
          <div className="text-muted text-11">
            {scoreDelta !== null ? (
              <span style={{ color: +scoreDelta > 0 ? 'var(--dm-success)' : +scoreDelta < 0 ? 'var(--dm-danger)' : 'var(--dm-text-muted)' }}>
                {+scoreDelta > 0 ? '+' : ''}{scoreDelta}
              </span>
            ) : QUALITY_BASELINE}
            {prev ? ` vs ${prev.date}` : ''}
            {' \u00b7 '}
            <code className="text-10">{latest.commitRef}</code>
            {' \u00b7 '}
            {latest.date}
          </div>
        </div>
        <div className="flex gap-6" style={{ marginLeft: 'auto' }}>
          <HealthcheckButton processOutput={healthcheckOutput} onClearOutput={onClearOutput} />
          <AutofixButton processOutput={autofixOutput} onClearOutput={onClearOutput} />
        </div>
      </div>

      {/* Baseline pills */}
      <div className="flex flex-wrap gap-6 mb-16">
        <Pill ok={b.buildPasses}>{b.buildPasses ? 'Build passing' : 'Build FAILING'}</Pill>
        <Pill ok={(b.lintErrors ?? 0) === 0} warn={(b.lintErrors ?? 0) > 0 && (b.lintErrors ?? 0) < 10}>Lint: {b.lintErrors ?? '?'} errors</Pill>
        <Pill ok={b.testsPassing}>{b.testCount ?? '?'} tests</Pill>
        {b.testCoveragePercent != null && (
          <Pill
            ok={b.testCoveragePercent >= 80}
            warn={b.testCoveragePercent >= 50 && b.testCoveragePercent < 80}
          >
            {b.testCoveragePercent}% coverage
          </Pill>
        )}
        <Pill ok>{b.bundleGzipKB ?? '?'}KB gzip</Pill>
        {b.depVulnerabilities && (
          <Pill
            ok={(b.depVulnerabilities.total ?? 0) === 0}
            warn={(b.depVulnerabilities.total ?? 0) > 0 && (b.depVulnerabilities.critical ?? 0) === 0 && (b.depVulnerabilities.high ?? 0) === 0}
          >
            {b.depVulnerabilities.total ?? 0} vulns{(b.depVulnerabilities.critical ?? 0) > 0 ? ` (${b.depVulnerabilities.critical} crit)` : (b.depVulnerabilities.high ?? 0) > 0 ? ` (${b.depVulnerabilities.high} high)` : ''}
          </Pill>
        )}
        {b.sentry && (
          <Pill
            ok={(b.sentry.unresolvedCount ?? 0) < 5}
            warn={(b.sentry.unresolvedCount ?? 0) >= 5 && (b.sentry.unresolvedCount ?? 0) < 15}
          >
            Sentry: {b.sentry.unresolvedCount ?? '?'} unresolved
          </Pill>
        )}
      </div>

      {/* -- Charts row -- */}
      <div className="gap-12 mb-16" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div className="flex-col items-center p-12" style={{
          background: 'var(--dm-bg)', borderRadius: 'var(--dm-radius-sm)',
        }}>
          <div className="label-sm mb-8">{QUALITY_RADAR}</div>
          <RadarChart latest={latest} prev={prev} width={360} height={340} />
        </div>
        <div className="flex-col items-center p-12" style={{
          background: 'var(--dm-bg)', borderRadius: 'var(--dm-radius-sm)',
        }}>
          <div className="label-sm mb-8">{QUALITY_HISTORY}</div>
          <TimelineChart history={history} width={280} height={200} />
        </div>
      </div>

      {/* -- Scorecard table -- */}
      <Scorecard latest={latest} prev={prev} history={history} />

      {/* -- Findings -- */}
      <FindingsPanel findings={latest.topFindings ?? []} />
    </div>
  );
}
