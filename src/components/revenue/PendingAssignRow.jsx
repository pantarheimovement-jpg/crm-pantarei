import React, { useState } from 'react';
import { Loader2, Check, Undo2 } from 'lucide-react';

export default function PendingAssignRow({ row, courses, bucketCourseId, onAssign, onRevert }) {
  const [courseId, setCourseId] = useState(row.courseIds[0] || '');
  const [amount, setAmount] = useState(String(row.pendingAmount));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null); // { courseName, amount, undo }

  const fmt = (n) => `₪${Math.round(n).toLocaleString('he-IL')}`;
  const numeric = parseFloat(amount) || 0;

  // הסבר בשפה אנושית למה אי אפשר ללחוץ — במקום כפתור דהוי בלי סיבה
  let blockedReason = '';
  if (!courseId) blockedReason = 'צריך לבחור קורס';
  else if (numeric < 1) blockedReason = 'צריך להזין סכום';
  else if (numeric > row.pendingAmount + 0.01) blockedReason = `יש לה רק ${fmt(row.pendingAmount)} שלא שויכו`;

  const handle = async () => {
    setSaving(true);
    try {
      const res = await onAssign(row, courseId, numeric);
      setDone({ courseName: courses.find(c => c.id === courseId)?.name || '', amount: numeric, undo: res.undo });
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    setSaving(true);
    try {
      await onRevert(done.undo);
      setDone(null);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <tr className="border-b bg-green-50">
        <td className="p-2 font-medium whitespace-nowrap">{row.name}</td>
        <td className="p-2 text-center text-green-700" colSpan={3}>
          שויך {fmt(done.amount)} ל"{done.courseName}"
        </td>
        <td className="p-2 text-center">
          <button
            onClick={handleUndo}
            disabled={saving}
            className="px-3 py-1 rounded-full text-xs border border-gray-300 text-gray-600 flex items-center gap-1 mx-auto"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Undo2 className="w-3 h-3" />בטל</>}
          </button>
        </td>
      </tr>
    );
  }

  // הקורסים שהמשתתפת כבר רשומה אליהם מופיעים ראשונים — הבחירה הנפוצה
  const own = courses.filter(c => row.courseIds.includes(c.id));
  const rest = courses.filter(c => !row.courseIds.includes(c.id));

  return (
    <tr className="border-b align-top">
      <td className="p-2 font-medium whitespace-nowrap">
        {row.name}
        <span className="block text-xs text-gray-400 font-normal">{row.phone || '—'}</span>
        {row.isNonCourse && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-normal">
            כנראה לא קורס
          </span>
        )}
        {row.hints?.length > 0 && (
          <span className="block text-[11px] text-gray-500 font-normal mt-1 max-w-[220px] whitespace-normal">
            שילמה על: {row.hints.join(' · ')}
          </span>
        )}
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
        {bucketCourseId && courseId !== bucketCourseId && (
          <button
            onClick={() => setCourseId(bucketCourseId)}
            className="block mt-1 text-[11px] text-orange-700 underline"
          >
            זה לא קורס → לדלי ההשכרות/תרומות
          </button>
        )}
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
          disabled={!!blockedReason || saving}
          className="px-3 py-1 rounded-full text-xs text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--crm-primary)' }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="flex items-center gap-1"><Check className="w-3 h-3" />שייך</span>}
        </button>
        {blockedReason && <span className="block text-[11px] text-gray-400 mt-1">{blockedReason}</span>}
      </td>
    </tr>
  );
}