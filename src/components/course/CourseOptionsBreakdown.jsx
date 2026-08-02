import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function CourseOptionsBreakdown({ students, courseId, course }) {
  const [selected, setSelected] = useState(null);
  const fmt = (n) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—';

  const groups = {};
  students.forEach(s => {
    const entry = (s.courses || []).find(c => c.course_id === courseId);
    if (!entry) return;
    const key = entry.option_id || entry.option || 'ללא אפשרות מוגדרת';
    const label = entry.option || key;
    if (!groups[key]) groups[key] = { label, count: 0, paid: 0, names: [] };
    groups[key].paid += parseFloat(entry.paid_so_far) || 0;
    groups[key].count++;
    groups[key].names.push(s.full_name);
  });

  const rows = Object.entries(groups).sort((a, b) => b[1].paid - a[1].paid);
  const totalCount = rows.reduce((sum, [, g]) => sum + g.count, 0);
  const totalPaid = rows.reduce((sum, [, g]) => sum + g.paid, 0);
  const totalExpected = rows.reduce((sum, [key, g]) => {
    const opt = (course?.options || []).find(o => o.option_id === key);
    return sum + (opt ? (opt.price || 0) * g.count : 0);
  }, 0);

  return (
    <div className="bg-white rounded-xl p-4">
      <h3 className="font-bold text-[var(--crm-primary)] mb-3">סיכום רישומים לפי אפשרות</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-purple-50 text-[var(--crm-primary)]">
            <th className="text-right p-2">אפשרות</th>
            <th className="text-center p-2">רשומים</th>
            <th className="text-center p-2">שולם בפועל</th>
            <th className="text-center p-2">צפוי</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, g]) => {
            const opt = (course?.options || []).find(o => o.option_id === key);
            const expected = opt ? (opt.price || 0) * g.count : null;
            return (
              <tr key={key} className="border-b">
                <td className="p-2 font-medium">{g.label}</td>
                <td className="p-2 text-center">
                  <button onClick={() => setSelected({ option: g.label, names: g.names })} className="text-[var(--crm-primary)] font-bold underline">
                    {g.count}
                  </button>
                </td>
                <td className="p-2 text-center text-green-700 font-medium">{fmt(g.paid)}</td>
                <td className="p-2 text-center text-gray-500">{expected !== null ? fmt(expected) : '—'}</td>
              </tr>
            );
          })}
          <tr className="bg-purple-50 font-bold">
            <td className="p-2">סה"כ</td>
            <td className="p-2 text-center">{totalCount}</td>
            <td className="p-2 text-center text-green-700">{fmt(totalPaid)}</td>
            <td className="p-2 text-center text-gray-600">{totalExpected ? fmt(totalExpected) : '—'}</td>
          </tr>
        </tbody>
      </table>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-[var(--crm-primary)]">{selected.option}</h4>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <ul className="space-y-1 text-sm">
              {selected.names.map((n, i) => <li key={i} className="border-b pb-1">{n}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}