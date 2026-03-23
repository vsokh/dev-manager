import React from 'react';
import { PIPELINE_STAGES, getItemStatus } from './queueItemUtils.ts';
import type { Task, QueueItem } from '../../types';

interface PipelineLegendProps {
  queue: QueueItem[];
  taskMap: Map<number, Task>;
}

export function PipelineLegend({ queue, taskMap }: PipelineLegendProps) {
  // Count tasks in each stage
  const counts: Record<string, number> = {};
  for (const item of queue) {
    const status = getItemStatus(item, taskMap);
    if (status !== 'queued' && status !== 'paused') {
      counts[status] = (counts[status] || 0) + 1;
    }
  }

  const hasActive = Object.keys(counts).length > 0;
  if (!hasActive) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px',
      padding: '6px 12px', marginBottom: '4px',
      fontSize: '10px',
    }}>
      {PIPELINE_STAGES.map((stage, i) => {
        const count = counts[stage.id] || 0;
        const isActive = count > 0;
        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <span style={{
                color: 'var(--dm-text-light)',
                fontSize: '8px',
                opacity: 0.4,
                margin: '0 1px',
              }}>{'\u203A'}</span>
            )}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              padding: '2px 6px',
              borderRadius: '3px',
              background: isActive ? stage.bg : 'transparent',
              color: isActive ? '#fff' : 'var(--dm-text-muted)',
              fontWeight: isActive ? 700 : 400,
              opacity: isActive ? 1 : 0.4,
              transition: 'all 0.3s',
            }}>
              {stage.label}
              {count > 1 && (
                <span style={{ fontSize: '9px', opacity: 0.8 }}>{count}</span>
              )}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}
