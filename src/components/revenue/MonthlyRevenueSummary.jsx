import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { parseSummitEvents } from './parseSummitEvents';
import RevenueAccordion from './RevenueAccordion';

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const fmt = (n) => `₪${Math.round(n).toLocaleString('he-IL')}`;

export default function MonthlyRevenueSummary({ students, totalCollected }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based

  const events = useMemo(() => parseSummitEvents(students), [students]);

  const years = useMemo(() => {
    const ys = new Set(events.map(e => Number(e.date.slice(0, 4))));
    ys.add(now.getFullYear());
    return [...ys].sort((a, b) => a - b);
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  // נטו לכל חודש בשנה שנבחרה: תשלומים פחות זיכויים, לפי תאריך חיוב אמיתי מסאמיט
  const monthlyNet = useMemo(() => {
    const arr = Array(12).fill(0);
    events.forEach(e => {
      if (Number(e.date.slice(0, 4)) !== year) return;
      const m = Number(e.date.slice(5, 7)) - 1;
      arr[m] += e.type === 'credit' ? -e.amount : e.amount;
    });
    return arr;
  }, [events, year]);

  const yearNet = monthlyNet.reduce((a, b) => a + b, 0);
  const paymentsTotal = events.reduce((s, e) => s + (e.type === 'payment' ? e.amount : 0), 0);
  const gap = Math.max(0, (totalCollected || 0) - paymentsTotal);
  const maxNet = Math.max(...monthlyNet, 1);

  return (
    <RevenueAccordion
      icon={Calendar}
      iconColor="var(--crm-primary)"
      title="נגבה בפועל (מסאמיט, לפי תאריך חיוב)"
      summary={fmt(yearNet)}
      className="mb-8"
    >
      <div className="flex items-center justify-end flex-wrap gap-3 mb-4">
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
          <p className="text-sm text-[var(--crm-text)] opacity-70">נגבה ב{MONTHS[month]} {year}</p>
          <p className="text-2xl font-bold text-[var(--crm-text)] mt-1">{fmt(monthlyNet[month])}</p>
        </div>
        <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
          <p className="text-sm text-[var(--crm-text)] opacity-70">נגבה בשנת {year}</p>
          <p className="text-2xl font-bold text-[var(--crm-text)] mt-1">{fmt(yearNet)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {MONTHS.map((m, i) => (
          <div key={m} className="flex items-center gap-3 text-sm">
            <span className={`w-16 shrink-0 ${i === month ? 'font-bold text-[var(--crm-primary)]' : 'text-gray-600'}`}>{m}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full"
                style={{ width: `${Math.max(0, (monthlyNet[i] / maxNet) * 100)}%`, backgroundColor: 'var(--crm-primary)' }}
              />
            </div>
            <span className="w-24 shrink-0 text-left font-medium text-[var(--crm-text)]">{monthlyNet[i] ? fmt(monthlyNet[i]) : '—'}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
        💡 טבלה זו מציגה את שנת {year} בלבד, נטו (בניכוי זיכויים), ורק תשלומים עם תאריך חיוב מסאמיט.
        לעומת זאת הכרטיס "נגבה בפועל" ({fmt(totalCollected)}) הוא הסכום המצטבר מכל הזמנים ומכל מקורות התשלום
        (כולל קבלות ידניות והיסטוריות) — ולכן גבוה יותר. זהו הבדל מתוכנן, לא פער.
      </p>
    </RevenueAccordion>
  );
}