import React, { useState } from 'react';
import {
  QUEUE_PATH_PLACEHOLDER, QUEUE_SAVE, QUEUE_CANCEL, QUEUE_SET_PATH, QUEUE_EDIT,
} from '../../constants/strings.ts';

interface ProjectPathConfigProps {
  projectPath: string;
  onSetPath: (path: string) => void;
  showBorder: boolean;
}

export function ProjectPathConfig({ projectPath, onSetPath, showBorder }: ProjectPathConfigProps) {
  const [editingPath, setEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(projectPath || '');

  const handleSavePath = () => {
    if (pathInput.trim()) {
      onSetPath(pathInput.trim());
      setEditingPath(false);
    }
  };

  if (editingPath) {
    return (
      <div className="flex gap-6" style={{ padding: '8px 12px', borderTop: '1px solid var(--dm-border)' }}>
        <input
          type="text"
          value={pathInput}
          onInput={(e: React.FormEvent<HTMLInputElement>) => setPathInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSavePath()}
          placeholder={QUEUE_PATH_PLACEHOLDER}
          autoFocus
          className="mono flex-1 text-12"
          style={{
            padding: '6px 8px',
            border: '1px solid var(--dm-border)', borderRadius: 'var(--dm-radius-sm)',
            background: 'var(--dm-bg)', color: 'var(--dm-text)',
          }}
        />
        <button onClick={handleSavePath} className="btn btn-primary btn-xs" style={{
          padding: '6px 10px',
        }}>{QUEUE_SAVE}</button>
        <button onClick={() => setEditingPath(false)} className="btn btn-secondary btn-xs" style={{
          padding: '6px 8px',
        }}>{QUEUE_CANCEL}</button>
      </div>
    );
  }

  return (
    <div className="flex-center gap-6 text-11" style={{
      padding: '4px 12px 6px',
      borderTop: showBorder ? '1px solid var(--dm-border)' : 'none',
    }}>
      {projectPath ? (
        <>
          <span className="queue-path truncate flex-1" style={{ opacity: 0.7 }}>{projectPath}</span>
          <button onClick={() => { setPathInput(projectPath); setEditingPath(true); }} className="btn-link text-light text-11 shrink-0">{QUEUE_EDIT}</button>
        </>
      ) : (
        <button onClick={() => setEditingPath(true)} className="btn-link text-amber text-11">{QUEUE_SET_PATH}</button>
      )}
    </div>
  );
}
