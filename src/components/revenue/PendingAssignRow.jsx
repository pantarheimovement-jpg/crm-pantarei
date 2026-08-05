import React, { useState } from 'react';
import { Loader2, Check } from 'lucide-react';

export default function PendingAssignRow({ row, courses, onAssign }) {
  const [courseId, setCourseId] = useState(row.courseIds[0] || '');
  const [amount, setAmount] = useState(String(row.pendingAmount));
  const [saving, setSaving] = useState(false);

  const fmt = (n) => `₪${Math.round(n).toLocaleString('he-IL')}`;
  const numeric = parseFloat(amount) || 0;
  const valid = courseId && numeric >= 1 && numeric <= row.pendingAmount + 0.01;

  const handle = async () => {
    setSaving(true);
    try {
      await onAssign(row, courseId, numeric);
    } finally {
      setSaving(false);
    }
  };

  // הקורסים שהמשתתפת כבר רשומה אליהם מופיעים ראשונים — הבחירה הנפוצה
  const own = courses.filter(c => row.courseIds.includes(c.id));
  const rest = courses.filter(c => !row.courseIds.includes(c.id));

  return (
    <tr className="border-b align-top">
      <td className="p-2 font-medium whitespace-nowrap">
        {row.name}
        <span className="block text-xs text-gray-400 font-normal">{row.phone || '—'}</span>
      </td>
      <td className="p-2 text-center text-orange-700 font-semibold whitespace-nowrap">{fmt(row.pendingAmount)}</td>
      <td className="p-2">
        <select
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
          className="w-full max-w-[240px] px-2 py-1 border border-gray-300 rounded text-xs"
        >
          <option value="">בחרי קורס...</option>
          {own.length > 0 && (
            <optgroup label="קורסים שלה">
              {own.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          )}
          <optgroup label="כל הקורסים">
            {rest.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        </select>
      </td>
      <td className="p-2">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-center"
        />
      </td>
      <td className="p-2 text-center">
        <button
          onClick={handle}
          disabled={!valid || saving}
          className="px-3 py-1 rounded-full text-xs text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--crm-primary)' }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="flex items-center gap-1"><Check className="w-3 h-3" />שייך</span>}
        </button>
      </td>
    </tr>
  );
}