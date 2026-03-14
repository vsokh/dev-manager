import React, { useState, useMemo } from 'react';
import { suggestSkills } from '../skills.js';

export function CardForm({ card, onSave, onCancel, groups }) {
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [group, setGroup] = useState(card?.group || '');
  const [manual, setManual] = useState(card?.manual || false);
  const [manualSkills, setManualSkills] = useState(card?.skills?.join(', ') || '');
  const [userEditedSkills, setUserEditedSkills] = useState(!!card?.skills?.length);

  const { skills: suggested, matches } = useMemo(() => suggestSkills(title + ' ' + description), [title, description]);
  const displaySkills = userEditedSkills ? manualSkills : suggested.join(', ');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const finalSkills = userEditedSkills
      ? manualSkills.split(',').map(s => s.trim()).filter(Boolean)
      : suggested;
    onSave({
      id: card?.id,
      name: title.trim(),
      fullName: title.trim(),
      description: description.trim(),
      group: group.trim() || undefined,
      skills: manual ? [] : finalSkills,
      manual,
      status: card?.status || 'pending',
    });
  };

  const inputStyle = {
    width: '100%', padding: '6px 8px', fontSize: '13px', fontFamily: 'var(--font)',
    border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)',
    outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px',
      boxShadow: 'var(--shadow-md)',
    }}>
      <input
        value={title} onInput={e => setTitle(e.target.value)}
        placeholder="Task title..." autoFocus
        style={{ ...inputStyle, fontWeight: 600, marginBottom: '8px' }}
      />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          value={group} onInput={e => setGroup(e.target.value)}
          placeholder="Epic (e.g. Auth, DevToolbar)..."
          list="group-list"
          style={{ ...inputStyle, flex: 1, fontSize: '12px' }}
        />
        {groups && groups.length > 0 ? (
          <datalist id="group-list">
            {groups.map(g => <option key={g} value={g} />)}
          </datalist>
        ) : null}
      </div>
      <textarea
        value={description} onInput={e => setDescription(e.target.value)}
        placeholder="Description (what needs to be done)..."
        rows="2"
        style={{ ...inputStyle, marginBottom: '8px', resize: 'vertical' }}
      />
      <label style={{
        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px',
        fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none',
      }}>
        <input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} />
        Manual task <span style={{ fontSize: '10px', opacity: 0.7 }}>(done by you, not Claude)</span>
      </label>
      {!manual ? <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Skills</span>
          {!userEditedSkills && suggested.length > 0 ? (
            <span style={{ fontSize: '10px', color: 'var(--accent)', fontStyle: 'italic' }}>auto-detected</span>
          ) : null}
        </div>
        <input
          value={displaySkills}
          onInput={e => { setManualSkills(e.target.value); setUserEditedSkills(true); }}
          onFocus={() => { if (!userEditedSkills) { setManualSkills(suggested.join(', ')); setUserEditedSkills(true); } }}
          placeholder="Auto-detected from title, or type manually..."
          style={{ ...inputStyle, fontSize: '12px', color: userEditedSkills ? 'var(--text)' : 'var(--accent)' }}
        />
        {suggested.length > 0 && !userEditedSkills ? (
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-light)', lineHeight: 1.5 }}>
              matched: {matches.map(m => (
                <code key={m.word} style={{
                  background: 'var(--accent-light)', padding: '0 4px', borderRadius: '3px',
                  fontSize: '10px', fontFamily: 'monospace', marginRight: '3px',
                  color: 'var(--accent)',
                }}>"{m.word}"</code>
              ))}
            </div>
          </div>
        ) : null}
      </div> : null}
      <div style={{ display: 'flex', gap: '8px' }}>
        {onCancel ? (
          <button type="button" onClick={onCancel} style={{
            padding: '6px 12px', background: 'var(--bg)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px',
            fontWeight: 500, fontFamily: 'var(--font)', cursor: 'pointer',
          }}>Cancel</button>
        ) : null}
        <button type="submit" style={{
          flex: 1, padding: '6px 12px', background: 'var(--accent)', color: 'white',
          border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px',
          fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer',
        }}>{card ? 'Save' : 'Add task'}</button>
      </div>
    </form>
  );
}
