import { useState, useCallback, useRef } from 'react';
import { api } from '../api.ts';
import type { StateData } from '../types';

interface UseScratchpadParams {
  data: StateData | null;
  save: (data: StateData) => void;
  showError: (msg: string) => void;
}

export function useScratchpad({ data, save, showError }: UseScratchpadParams) {
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [splitResult, setSplitResult] = useState<{ name: string }[] | null>(null);
  const splitResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSplitTasks = useCallback(async (text: string) => {
    if (!data) return;
    setSplitting(true);
    try {
      const result = await api.splitTasks(text);
      if (result.tasks && result.tasks.length > 0) {
        const maxId = Math.max(0, ...data.tasks.map(t => t.id));
        const newTasks = result.tasks.map((t, i) => ({
          id: maxId + i + 1,
          name: t.name,
          fullName: t.fullName || t.name,
          description: t.description || '',
          status: 'pending' as const,
          group: t.group || undefined,
          createdAt: new Date().toISOString(),
        }));
        const existingEpics = new Set((data.epics || []).map(e => e.name));
        const newEpics = [...(data.epics || [])];
        for (const t of newTasks) {
          if (t.group && !existingEpics.has(t.group)) {
            newEpics.push({ name: t.group, color: newEpics.length });
            existingEpics.add(t.group);
          }
        }
        const activity = [
          { id: 'act_split_' + Date.now(), time: Date.now(), label: `${newTasks.length} tasks created from scratchpad` },
          ...(data.activity || []),
        ];
        save({ ...data, tasks: [...data.tasks, ...newTasks], epics: newEpics, activity, scratchpad: '' });

        // Arrange: set dependencies and compute phases before showing results
        setArranging(true);
        try {
          const { pid } = await api.launch(0, '/orchestrator arrange');
          const start = Date.now();
          while (Date.now() - start < 120000) {
            await new Promise(r => setTimeout(r, 3000));
            try {
              const procs = await api.listProcesses();
              if (!procs.some(p => p.pid === pid)) break;
            } catch { break; }
          }
        } catch { /* arrange is best-effort */ }

        setSplitResult(newTasks.map(t => ({ name: t.name })));
        if (splitResultTimer.current) clearTimeout(splitResultTimer.current);
        splitResultTimer.current = setTimeout(() => setSplitResult(null), 8000);
        setShowScratchpad(false);
      }
    } catch (err: unknown) {
      showError('Failed to split tasks: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      setSplitting(false);
      setArranging(false);
    }
  }, [data, save, showError]);

  return { showScratchpad, setShowScratchpad, splitting, arranging, splitResult, setSplitResult, splitResultTimer, handleSplitTasks };
}
