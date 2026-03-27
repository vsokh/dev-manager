import React from 'react';
import type { QualityFinding } from '../../types';
import { DIM_LABELS } from './shared';
import { FINDINGS_TITLE } from '../../constants/strings.ts';

export function FindingsPanel({ findings }: { findings: QualityFinding[] }) {
  if (!findings || findings.length === 0) return null;

  return (
    <div>
      <div className="label-sm mb-8">{FINDINGS_TITLE}</div>
      {findings.map((f, i) => {
        const dotColor = f.severity === 'high' ? 'var(--dm-danger)' : f.severity === 'medium' ? 'var(--dm-amber)' : 'var(--dm-accent)';
        return (
          <div key={i} className={`finding-card finding-card--${f.severity} flex gap-8 items-start text-12 mb-4`} style={{
            padding: '8px 10px',
          }}>
            <span className="shrink-0 mt-4" style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
            <div>
              <div>{f.finding}</div>
              <div className="text-muted text-10" style={{ marginTop: 1 }}>{DIM_LABELS[f.dimension as string] || f.dimension}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
