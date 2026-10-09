import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

// מחיר מלא אישי למשתתפת בקורס (כולל הנחה) — נשמר ב-courses[].total_price
export default function EditablePriceCell({ student, courseId, value, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const num = draft === '' ? null : parseFloat(draft);
    if (num === (value ?? null)) { setEditing(false); return; }
    setSaving(true);
    const courses = (student.courses || []).map(c =>
      c.course_id === courseId ? { ...c, total_price: num } : c
    );
    await base44.entities.Student.update(student.id, { courses });
    onSaved({ ...student, courses });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        autoFocus
        disabled={saving}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
      />
    );
  }
  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      className="text-[var(--crm-primary)] hover:underline"
      title="לחצי לעריכת המחיר שסוכם"
    >
      {value ? `₪${Math.round(value).toLocaleString('he-IL')}` : 'הזנת מחיר'}
    </button>
  );
}