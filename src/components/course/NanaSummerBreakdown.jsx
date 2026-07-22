import React, { useState } from 'react';

const OPTIONS = [
  { key: '5-16.7', label: 'שבועיים מלאים', dates: '5-16.7' },
  { key: '5-9.7',  label: 'שבוע ראשון',    dates: '5-9.7' },
  { key: '12-16.7',label: 'שבוע שני',       dates: '12-16.7' },
  { key: '5-7.7',  label: 'שלושה ימים',     dates: '5-7.7' },
  { key: '12-14.7',label: 'שלושה ימים',     dates: '12-14.7' },
  // נמכר בסאמיט כמוצר "סמסטר קיץ- יום בודד" — היה חסר כאן, ולכן הנרשמים אליו לא נספרו (22.7)
  { key: 'יום בודד', label: 'יום בודד',      dates: '—' },
];

const paidOf = (s) => s.total_payments || 0;

export default function NanaSummerBreakdown({ students }) {
  const [popup, setPopup] = useState(null); // { label, names }

  const stats = OPTIONS.map(opt => {
    const group = students.filter(s => s.nana_option === opt.key);
    return { ...opt, count: group.length, totalPaid: group.reduce((sum, s) => sum + paidOf(s), 0), names: group.map(s => s.full_name) };
  });

  // מי שאין לה אפשרות רישום כלל. עד כה היא נעדרה מהמונה אבל הופיעה ברשימה שנפתחת ממנו —
  // ולכן המספר והרשימה לא הסכימו זה עם זה. מוצג כשורה נפרדת כדי שאופיר תראה את מי צריך להשלים.
  const unassigned = students.filter(s => !OPTIONS.some(o => o.key === s.nana_option));
  if (unassigned.length > 0) {
    stats.push({
      key: '__none__', label: 'ללא אפשרות רישום', dates: '—',
      count: unassigned.length,
      totalPaid: unassigned.reduce((sum, s) => sum + paidOf(s), 0),
      names: unassigned.map(s => s.full_name)
    });
  }

  // הסה"כ מחושב מכל הרשומים ולא מסכום הדליים, כך שהוא תמיד תואם לרשימה שנפתחת ממנו.
  const grandTotal = students.reduce((sum, s) => sum + paidOf(s), 0);
  const grandCount = students.length;
  const allNames = students.map(s => s.full_name);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-5 mb-6">
      <h3 className="text-lg font-bold text-[var(--crm-primary)] mb-4">סיכום רישומים לפי אפשרות</h3>
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="bg-purple-50 text-[var(--crm-primary)]">
            <th className="py-2 px-3 rounded-r-lg">אפשרות</th>
            <th className="py-2 px-3">תאריכים</th>
            <th className="py-2 px-3">רשומים</th>
            <th className="py-2 px-3 rounded-l-lg">סכום ששולם</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((row, i) => (
            <tr key={row.key} className={i % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'}>
              <td className="py-2 px-3 font-medium">{row.label}</td>
              <td className="py-2 px-3 text-gray-500">{row.dates}</td>
              <td className="py-2 px-3">
                {row.count > 0 ? (
                  <button
                    onClick={() => setPopup({ label: `${row.label} (${row.dates})`, names: row.names })}
                    className="text-[var(--crm-primary)] font-semibold underline underline-offset-2 hover:opacity-70 cursor-pointer"
                  >
                    {row.count}
                  </button>
                ) : <span>0</span>}
              </td>
              <td className="py-2 px-3 font-medium text-green-700">₪{row.totalPaid.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-purple-200 font-bold bg-purple-50">
            <td className="py-2 px-3" colSpan={2}>סה״כ</td>
            <td className="py-2 px-3">
              <button
                onClick={() => setPopup({ label: 'כל הרשומים', names: allNames })}
                className="text-[var(--crm-primary)] font-bold underline underline-offset-2 hover:opacity-70 cursor-pointer"
              >
                {grandCount}
              </button>
            </td>
            <td className="py-2 px-3 text-green-700">₪{grandTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {popup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPopup(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h4 className="text-base font-bold text-[var(--crm-primary)] mb-3">{popup.label}</h4>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {popup.names.map((name, i) => (
                <li key={i} className="text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0">{name}</li>
              ))}
            </ul>
            <button onClick={() => setPopup(null)} className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700">סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}