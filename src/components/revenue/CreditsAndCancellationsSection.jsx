import React, { useMemo } from 'react';
import { Receipt, XCircle } from 'lucide-react';
import { parseSummitEvents } from './parseSummitEvents';
import RevenueAccordion from './RevenueAccordion';

const fmt = (n) => `₪${Math.round(n).toLocaleString('he-IL')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL') : '—';

// קריאה בלבד — זיכויים מובנים מהערות סאמיט + ביטולי הרשמה לפי סטטוס משתתפ.ת.
// אזכורי "זיכוי" בטקסט חופשי ללא סכום מובנה (₪...) מדולגים בכוונה.
export default function CreditsAndCancellationsSection({ students }) {
  const credits = useMemo(
    () => parseSummitEvents(students).filter(e => e.type === 'credit').sort((a, b) => b.date.localeCompare(a.date)),
    [students]
  );

  const cancellations = useMemo(
    () => (students || [])
      .filter(s => /ביטול/.test(s.status || ''))
      .map(s => {
        const entry = (s.courses || []).find(c => /ביטול/.test(c.status || '')) || null;
        return { id: s.id, name: s.full_name, course: entry?.course_name || '—', date: entry?.registration_date || null };
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [students]
  );

  const creditsTotal = credits.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* זיכויים כספיים */}
      <RevenueAccordion icon={Receipt} title="זיכויים כספיים" count={credits.length} summary={fmt(creditsTotal)}>
        <p className="text-xs text-gray-500 mb-3">{credits.length} זיכויים · סה"כ {fmt(creditsTotal)} · לפי מסמכי זיכוי מסאמיט</p>
        {credits.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">אין זיכויים רשומים</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="py-2 text-right font-medium">שם</th>
                <th className="py-2 text-right font-medium">קורס / הקשר</th>
                <th className="py-2 text-center font-medium">תאריך</th>
                <th className="py-2 text-center font-medium">סכום</th>
                <th className="py-2 text-center font-medium">מסמך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {credits.map((c, i) => (
                <tr key={i}>
                  <td className="py-2 font-medium text-[var(--crm-text)]">{c.studentName}</td>
                  <td className="py-2 text-gray-600">{c.course || '—'}</td>
                  <td className="py-2 text-center text-gray-600">{fmtDate(c.date)}</td>
                  <td className="py-2 text-center font-semibold text-red-600">{fmt(c.amount)}</td>
                  <td className="py-2 text-center text-gray-500">{c.docNumber || 'ידני'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RevenueAccordion>

      {/* ביטולי הרשמה */}
      <RevenueAccordion icon={XCircle} iconColor="#f87171" title="ביטולי הרשמה" count={cancellations.length}>
        <p className="text-xs text-gray-500 mb-3">{cancellations.length} משתתפות בסטטוס ביטול הרשמה</p>
        {cancellations.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">אין ביטולי הרשמה</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="py-2 text-right font-medium">שם</th>
                <th className="py-2 text-right font-medium">קורס</th>
                <th className="py-2 text-center font-medium">תאריך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cancellations.map(c => (
                <tr key={c.id}>
                  <td className="py-2 font-medium text-[var(--crm-text)]">{c.name}</td>
                  <td className="py-2 text-gray-600">{c.course}</td>
                  <td className="py-2 text-center text-gray-600">{fmtDate(c.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RevenueAccordion>
    </div>
  );
}