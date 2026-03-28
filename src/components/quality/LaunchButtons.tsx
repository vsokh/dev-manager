import React, { useState, useRef } from 'react';
import {
  LAUNCH_HEALTHCHECK_CMD, LAUNCH_HEALTHCHECK, LAUNCH_HEALTHCHECK_ACTIVE,
  LAUNCH_AUTOFIX_CMD, LAUNCH_AUTOFIX, LAUNCH_AUTOFIX_ACTIVE,
} from '../../constants/strings.ts';
import { api } from '../../api.ts';
import type { TaskOutput } from '../../hooks/useProcessOutput.ts';
import { OutputViewer } from '../queue/OutputViewer.tsx';

// Unique task IDs for system operations (negative to avoid conflicts with real tasks)
const TASK_ID_CODEHEALTH = -1;
const TASK_ID_AUTOFIX = -2;

interface LaunchButtonProps {
  processOutput?: TaskOutput;
  onClearOutput?: (taskId: number) => void;
}

function DualLaunchButton({
  label, activeLabel, taskId, command, terminalTitle,
  processOutput, onClearOutput,
  btnClass, idleClass, runClass,
}: {
  label: string;
  activeLabel: string;
  taskId: number;
  command: string;
  terminalTitle: string;
  processOutput?: TaskOutput;
  onClearOutput?: (taskId: number) => void;
  btnClass: string;
  idleClass: string;
  runClass: string;
}) {
  const [launching, setLaunching] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const pidRef = useRef<number | null>(null);
  const launchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const running = !!processOutput?.running;
  // Once real output arrives, launching is irrelevant for busy calculation
  const busy = running || (launching && !running);
  const hasOutput = (processOutput?.lines.length ?? 0) > 0 || running;

  const handleTerminal = async () => {
    if (busy) return;
    try {
      await api.launchTerminal(taskId, command, undefined, terminalTitle);
      setFlashing(true);
      setTimeout(() => setFlashing(false), 1500);
    } catch (err) {
      console.error(`Failed to open ${terminalTitle} terminal:`, err);
    }
  };

  const clearLaunchTimer = () => {
    if (launchTimerRef.current) { clearTimeout(launchTimerRef.current); launchTimerRef.current = null; }
  };

  const handleBg = async () => {
    if (busy) return;
    try {
      setLaunching(true);
      // Safety timeout: clear launching if server never responds
      clearLaunchTimer();
      launchTimerRef.current = setTimeout(() => setLaunching(false), 10000);
      const res = await api.launch(taskId, command);
      pidRef.current = res.pid;
    } catch (err) {
      console.error(`Failed to launch ${terminalTitle}:`, err);
      clearLaunchTimer();
      setLaunching(false);
    }
  };

  const handleStop = async () => {
    const pid = pidRef.current || processOutput?.pid;
    if (pid) { try { await api.killProcess(pid); } catch { /* ok */ } }
    pidRef.current = null;
    clearLaunchTimer();
    setLaunching(false);
    onClearOutput?.(taskId);
  };

  const cls = `${btnClass} ${busy ? runClass : idleClass}`;

  return (
    <div>
      <div style={{ display: 'inline-flex', borderRadius: 'var(--dm-radius-sm)', overflow: 'hidden' }}>
        {/* Main: open terminal (or stop if busy) */}
        <button
          onClick={busy ? handleStop : handleTerminal}
          title={busy ? 'Click to stop' : 'Open in terminal'}
          className={cls}
          style={{
            padding: '6px 12px', position: 'relative', overflow: 'hidden',
            borderRadius: 0, borderTopLeftRadius: 'var(--dm-radius-sm)', borderBottomLeftRadius: 'var(--dm-radius-sm)',
          }}
        >
          {busy && <span className="system-launch-pulse" />}
          {busy ? activeLabel : flashing ? 'Opened' : label}
        </button>
        {/* Small arrow: run in background */}
        <button
          onClick={handleBg}
          disabled={busy}
          title={busy ? 'Running...' : 'Run in background'}
          className={cls}
          style={{
            padding: '6px 6px', position: 'relative', overflow: 'hidden',
            borderRadius: 0, borderTopRightRadius: 'var(--dm-radius-sm)', borderBottomRightRadius: 'var(--dm-radius-sm)',
            marginLeft: 1, fontSize: 10, lineHeight: 1,
          }}
        >
          {busy && <span className="system-launch-pulse" />}
          {'\u25BC'}
        </button>
      </div>
      {/* Live output when running in background */}
      {hasOutput && onClearOutput && (
        <div style={{ marginTop: 6 }}>
          <OutputViewer taskId={taskId} taskName={terminalTitle} output={processOutput} onClear={onClearOutput} />
        </div>
      )}
    </div>
  );
}

export function HealthcheckButton({ processOutput, onClearOutput }: LaunchButtonProps) {
  return (
    <DualLaunchButton
      label={LAUNCH_HEALTHCHECK} activeLabel={LAUNCH_HEALTHCHECK_ACTIVE}
      taskId={TASK_ID_CODEHEALTH} command={LAUNCH_HEALTHCHECK_CMD} terminalTitle="Healthcheck"
      processOutput={processOutput} onClearOutput={onClearOutput}
      btnClass="healthcheck-btn" idleClass="healthcheck-btn--idle" runClass="healthcheck-btn--launched"
    />
  );
}

export function AutofixButton({ processOutput, onClearOutput }: LaunchButtonProps) {
  return (
    <DualLaunchButton
      label={LAUNCH_AUTOFIX} activeLabel={LAUNCH_AUTOFIX_ACTIVE}
      taskId={TASK_ID_AUTOFIX} command={LAUNCH_AUTOFIX_CMD} terminalTitle="Autofix"
      processOutput={processOutput} onClearOutput={onClearOutput}
      btnClass="autofix-btn" idleClass="autofix-btn--idle" runClass="autofix-btn--launched"
    />
  );
}

export { TASK_ID_CODEHEALTH, TASK_ID_AUTOFIX };
