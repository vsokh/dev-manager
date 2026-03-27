import React, { useEffect, useRef, useState } from 'react';
import type { TaskOutput } from '../../hooks/useProcessOutput.ts';
import {
  OUTPUT_NO_OUTPUT, OUTPUT_CLEAR, OUTPUT_RUNNING, OUTPUT_EXITED,
  OUTPUT_EXITED_ERROR, OUTPUT_STDERR_LABEL,
} from '../../constants/strings.ts';

interface OutputViewerProps {
  taskId: number;
  taskName: string;
  output: TaskOutput | undefined;
  onClear: (taskId: number) => void;
}

export function OutputViewer({ taskId, taskName: _taskName, output, onClear }: OutputViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const lines = output?.lines || [];
  const hasOutput = lines.length > 0;
  const isRunning = output?.running || false;
  const exitCode = output?.exitCode;

  // Auto-expand when first output arrives (sync in render, same pattern as TaskDetail prevResetKey)
  const [prevHadOutput, setPrevHadOutput] = useState(false);
  if (hasOutput && !prevHadOutput) {
    setPrevHadOutput(true);
    setExpanded(true);
  }

  // Auto-scroll to bottom when new output arrives, but only if user was already at bottom
  useEffect(() => {
    if (!expanded || !scrollRef.current) return;
    if (wasAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length, expanded]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    wasAtBottomRef.current = atBottom;
  };

  const statusDot = isRunning
    ? 'var(--dm-success)'
    : exitCode != null
      ? exitCode === 0 ? 'var(--dm-success)' : 'var(--dm-danger)'
      : 'var(--dm-border)';

  const statusText = isRunning
    ? OUTPUT_RUNNING
    : exitCode != null
      ? exitCode === 0 ? OUTPUT_EXITED : OUTPUT_EXITED_ERROR + ' (' + exitCode + ')'
      : null;

  return (
    <div style={{ borderTop: '1px solid var(--dm-border)' }}>
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex-center gap-6 w-full border-none cursor-pointer text-11 text-left"
        style={{
          padding: '4px 12px',
          background: 'none',
          fontFamily: 'var(--dm-font)',
          color: 'var(--dm-text-muted)',
        }}
      >
        <span className="text-9" style={{
          transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>{'\u25B6'}</span>
        <span className="shrink-0" style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: statusDot,
        }} />
        <span className="font-500">Output</span>
        {hasOutput && (
          <span style={{ opacity: 0.5 }}>({lines.length} lines)</span>
        )}
        {statusText && (
          <span className="text-10" style={{
            fontStyle: 'italic',
            color: isRunning ? 'var(--dm-success)' : exitCode === 0 ? 'var(--dm-text-light)' : 'var(--dm-danger)',
          }}>{statusText}</span>
        )}
      </button>

      {/* Output content */}
      {expanded && (
        <div className="px-12 pb-8">
          {!hasOutput ? (
            <div className="text-11 py-8" style={{
              color: 'var(--dm-text-light)',
              fontStyle: 'italic',
            }}>
              {OUTPUT_NO_OUTPUT}
            </div>
          ) : (
            <>
              <div className="flex mb-4" style={{
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onClear(taskId); }}
                  className="btn btn-secondary btn-xs text-10"
                  style={{ padding: '2px 8px' }}
                >{OUTPUT_CLEAR}</button>
              </div>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="output-viewer-scroll overflow-y-auto p-8 text-11 leading-normal"
                style={{
                  maxHeight: '200px',
                  background: 'var(--dm-bg)',
                  border: '1px solid var(--dm-border)',
                  borderRadius: 'var(--dm-radius-sm)',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {lines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      color: line.stream === 'stderr' ? 'var(--dm-danger)' : 'var(--dm-text)',
                    }}
                  >
                    {line.stream === 'stderr' && (
                      <span className="text-9 font-600 mr-4" style={{
                        color: 'var(--dm-danger)', opacity: 0.7,
                      }}>{OUTPUT_STDERR_LABEL}</span>
                    )}
                    {line.text}
                  </div>
                ))}
                {isRunning && (
                  <span className="output-cursor" style={{
                    display: 'inline-block', width: '6px', height: '12px',
                    background: 'var(--dm-accent)', verticalAlign: 'text-bottom',
                  }} />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
