import { useState, useEffect, useRef, useCallback } from 'react';
import { connectWebSocket } from '../api.ts';

export interface OutputLine {
  text: string;
  stream: 'stdout' | 'stderr';
  timestamp: number;
}

export interface TaskOutput {
  lines: OutputLine[];
  pid: number | null;
  running: boolean;
  exitCode: number | null;
  error: string | null;
}

const MAX_LINES_PER_TASK = 500;
const WS_RECONNECT_DELAY = 3000;

/**
 * Strip ANSI escape codes from text.
 * Matches CSI sequences, OSC sequences, and other control codes.
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B(?:\[[0-9;]*[A-Za-z]|\].*?(?:\x07|\x1B\\)|\[[?]?[0-9;]*[hl]|[()][AB012]|[=>])/g, '');
}

function emptyOutput(): TaskOutput {
  return { lines: [], pid: null, running: false, exitCode: null, error: null };
}

/**
 * Hook that connects to the bridge server WebSocket and accumulates
 * live process output per task.
 */
export function useProcessOutput() {
  const [outputs, setOutputs] = useState<Record<number, TaskOutput>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (wsRef.current && wsRef.current.readyState <= 1) return;

      try {
        const ws = connectWebSocket(
          (msg) => {
            if (!mounted) return;

            if (msg.type === 'output' && msg.taskId != null) {
              const taskId = Number(msg.taskId);
              const cleanText = stripAnsi(msg.text || '');
              if (!cleanText) return;

              const newLine: OutputLine = {
                text: cleanText,
                stream: msg.stream === 'stderr' ? 'stderr' : 'stdout',
                timestamp: Date.now(),
              };

              setOutputs(prev => {
                const existing = prev[taskId] || emptyOutput();
                const lines = [...existing.lines, newLine];
                const trimmed = lines.length > MAX_LINES_PER_TASK ? lines.slice(-MAX_LINES_PER_TASK) : lines;
                return {
                  ...prev,
                  [taskId]: {
                    ...existing,
                    lines: trimmed,
                    pid: msg.pid ?? existing.pid,
                    running: true,
                    exitCode: null,
                    error: null,
                  },
                };
              });
            }

            if (msg.type === 'exit' && msg.taskId != null) {
              const taskId = Number(msg.taskId);
              setOutputs(prev => {
                const existing = prev[taskId] || emptyOutput();
                return {
                  ...prev,
                  [taskId]: {
                    ...existing,
                    running: false,
                    exitCode: msg.code ?? null,
                    error: msg.error ?? null,
                  },
                };
              });
            }
          },
          () => {
            // onClose: reconnect after delay
            wsRef.current = null;
            if (mounted) {
              reconnectTimer = setTimeout(connect, WS_RECONNECT_DELAY);
            }
          },
        );
        wsRef.current = ws;
      } catch {
        reconnectTimer = setTimeout(connect, WS_RECONNECT_DELAY);
      }
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const clearOutput = useCallback((taskId: number) => {
    setOutputs(prev => {
      const existing = prev[taskId];
      if (!existing) return prev;
      return {
        ...prev,
        [taskId]: { ...existing, lines: [] },
      };
    });
  }, []);

  const clearAllOutput = useCallback(() => {
    setOutputs({});
  }, []);

  return { outputs, clearOutput, clearAllOutput };
}
