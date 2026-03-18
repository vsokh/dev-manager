import React, { useMemo } from 'react';
import { EPIC_PALETTE } from '../../constants/colors.js';
import { hashString } from '../../utils/hash.js';

export function EpicField({ task, epics, onUpdateTask }) {
  const epicColorMap = useMemo(() => {
    const map = {};
    (epics || []).forEach(e => {
      const idx = (e.color != null ? e.color : hashString(e.name)) % EPIC_PALETTE.length;
      map[e.name] = EPIC_PALETTE[idx];
    });
    return map;
  }, [epics]);

  return (
    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span className="label">Epic</span>
      {task.group && epicColorMap[task.group] ? (
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: epicColorMap[task.group].text,
          display: "inline-block",
        }} />
      ) : null}
      <input
        value={task.group || ''}
        onInput={e => onUpdateTask(task.id, { group: e.target.value || undefined })}
        placeholder="None"
        list="epic-list"
        className="input-epic"
        style={{ flex: 1, padding: '3px 8px', fontSize: '12px' }}
      />
      <datalist id="epic-list">
        {(epics || []).map(e => (
          <option key={e.name} value={e.name} />
        ))}
      </datalist>
    </div>
  );
}
