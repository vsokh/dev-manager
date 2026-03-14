import React, { useState, useEffect } from 'react';
import { useProject } from './hooks/useProject.js';
import { ProjectPicker } from './components/ProjectPicker.jsx';
import { Header } from './components/Header.jsx';
import { SectionHeader } from './components/SectionHeader.jsx';
import { TaskBoard } from './components/TaskBoard.jsx';
import { TaskDetail } from './components/TaskDetail.jsx';
import { CommandQueue } from './components/CommandQueue.jsx';
import { ActivityFeed } from './components/ActivityFeed.jsx';

export function App() {
  const project = useProject();
  const { connected, status, projectName, data, save, connect, reconnect, disconnect, lastProjectName } = project;

  // Selection state (local only)
  const [selectedTask, setSelectedTask] = useState(null);

  // Project path for protocol launcher (per project, stored in localStorage)
  const [projectPath, setProjectPathState] = useState('');
  const [launchedId, setLaunchedId] = useState(null);

  // Re-read project path when projectName changes (after connection)
  useEffect(() => {
    if (!projectName) return;
    try {
      const paths = JSON.parse(localStorage.getItem('dm_project_paths') || '{}');
      setProjectPathState(paths[projectName] || '');
    } catch {}
  }, [projectName]);

  // If not connected, show picker
  if (!connected || !data) {
    return (
      <ProjectPicker
        onConnect={connect}
        onReconnect={reconnect}
        lastProjectName={lastProjectName}
        status={status}
      />
    );
  }

  // Convenience accessors
  const tasks = data.tasks || [];
  const features = data.features || [];
  const queue = data.queue || [];
  const taskNotes = data.taskNotes || {};
  const activity = data.activity || [];

  // Helpers to update data and trigger save
  const updateData = (partial) => {
    const next = { ...data, ...partial };
    save(next);
  };

  const addActivity = (label) => {
    const entry = { id: 'act_' + Date.now(), time: Date.now(), label };
    const next = [entry, ...(data.activity || [])].slice(0, 20);
    return next;
  };

  // Task handlers
  const handleSelectTask = (id) => {
    setSelectedTask(prev => prev === id ? null : id);
  };

  const handleUpdateTask = (id, updates) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    const newActivity = addActivity((tasks.find(t => t.id === id)?.name || 'Task') + (updates.status ? ' marked ' + updates.status : ' updated'));
    updateData({ tasks: newTasks, activity: newActivity });
  };

  const handleUpdateNotes = (id, note) => {
    updateData({ taskNotes: { ...taskNotes, [id]: note } });
  };

  const handleAddTask = (taskData) => {
    const maxId = tasks.reduce((max, t) => Math.max(max, typeof t.id === 'number' ? t.id : 0), 0);
    const newTask = { ...taskData, id: maxId + 1 };
    const newTasks = [...tasks, newTask];
    const newActivity = addActivity('"' + newTask.name + '" added');
    updateData({ tasks: newTasks, activity: newActivity });
  };

  const handleDeleteTask = (id) => {
    const task = tasks.find(t => t.id === id);
    const newTasks = tasks.filter(t => t.id !== id);
    const newQueue = queue.filter(q => q.task !== id);
    const { [id]: _, ...newTaskNotes } = taskNotes;
    const newActivity = addActivity((task?.name || 'Task') + ' deleted');
    updateData({ tasks: newTasks, queue: newQueue, taskNotes: newTaskNotes, activity: newActivity });
    setSelectedTask(null);
  };

  const handleQueue = (task) => {
    if (queue.some(q => q.task === task.id)) return;
    const newQueue = [...queue, {
      task: task.id,
      taskName: task.name,
      notes: taskNotes[task.id] || '',
    }];
    const newActivity = addActivity(task.name + ' queued');
    updateData({ queue: newQueue, activity: newActivity });
  };

  const handleRemoveFromQueue = (key) => {
    const newQueue = queue.filter(q => q.task !== key);
    updateData({ queue: newQueue });
  };

  const handleClearQueue = () => {
    updateData({ queue: [] });
  };

  const handleRemoveActivity = (id) => {
    const newActivity = activity.filter(a => a.id !== id);
    updateData({ activity: newActivity });
  };

  const setProjectPath = (path) => {
    setProjectPathState(path);
    try {
      const paths = JSON.parse(localStorage.getItem('dm_project_paths') || '{}');
      paths[projectName] = path;
      localStorage.setItem('dm_project_paths', JSON.stringify(paths));
    } catch {}
  };

  const handleLaunchTask = (itemKey, cmd, taskName) => {
    if (!projectPath) return; // UI shows "set path" prompt
    const path = projectPath.replace(/\\/g, '/');
    // Short tab title: first 2-3 meaningful words
    const filler = new Set(['the','a','an','for','to','of','in','as','and','with','me','my','its','is','be']);
    const words = taskName.split(/\s+/).filter(w => !filler.has(w.toLowerCase()));
    const title = words.slice(0, 2).join(' ') || taskName.split(/\s+/).slice(0, 2).join(' ');
    const url = 'claudecode:' + path + '?' + cmd + '?' + title;
    window.open(url, '_self');
    setLaunchedId(itemKey);
    setTimeout(() => setLaunchedId(null), 3000);
  };

  // Selected task data
  const selectedTaskData = tasks.find(t => t.id === selectedTask) || null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header projectName={projectName} status={status} onDisconnect={disconnect} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '24px 32px' }}>

        {/* Top row: Tasks + Detail */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', marginBottom: '16px',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <SectionHeader title="Product" />
            <div style={{ padding: '16px' }}>
              <TaskBoard
                tasks={tasks}
                features={features}
                selectedTask={selectedTask}
                onSelectTask={handleSelectTask}
                onAddTask={handleAddTask}
              />
            </div>
          </div>

          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column',
          }}>
            <SectionHeader title="Detail" />
            <TaskDetail
              task={selectedTaskData}
              onQueue={handleQueue}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              notes={taskNotes[selectedTask] || ''}
              onUpdateNotes={handleUpdateNotes}
            />
          </div>
        </div>

        {/* Bottom row: Queue + Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <SectionHeader title="Queue" count={queue.length > 0 ? queue.length : null} />
            <CommandQueue queue={queue} onLaunch={handleLaunchTask} onRemove={handleRemoveFromQueue} onClear={handleClearQueue} launchedId={launchedId} projectPath={projectPath} onSetPath={setProjectPath} />
          </div>

          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <SectionHeader title="Activity" />
            <ActivityFeed activity={activity} onRemove={handleRemoveActivity} />
          </div>
        </div>
      </div>
    </div>
  );
}
