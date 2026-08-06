import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';

const fmt = (n) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—';

export default function RentalsSection({ rows }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6" style={{ borderRadius: 'var(--crm-border-radius)' }} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between flex-wrap gap-3 text-right"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--crm-accent)' }}>
            <Building2 size={20} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
            השכרות
          </h2>
          <span className="text-sm text-gray-400">({rows.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold text-[var(--crm-primary)]">{fmt(total)}</p>
          {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {!open ? null : rows.length === 0 ? (
        <div className="text-center py-8 text-gray-400">אין רשומות השכרה</div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right font-medium text-gray-600">מי</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">מתי</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">כמה</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">מוצר / הקשר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-[var(--crm-text)]">{r.name}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {r.date ? new Date(r.date).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td className="px-3 py-2 text-center text-green-700 font-semibold">{fmt(r.amount)}</td>
                  <td className="px-3 py-2 text-gray-600">{r.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <p className="mt-3 text-xs text-gray-500">
          הסכומים כלולים ב"משויך לקורסים" — זו קטגוריזציה, לא כסף נוסף.
        </p>
      )}
    </div>
  );
}