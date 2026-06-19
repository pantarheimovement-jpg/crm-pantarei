import React from 'react';

const OPTIONS = [
  { key: '5-16.7', label: 'שבועיים מלאים', dates: '5-16.7' },
  { key: '5-9.7',  label: 'שבוע ראשון',    dates: '5-9.7' },
  { key: '12-16.7',label: 'שבוע שני',       dates: '12-16.7' },
  { key: '5-7.7',  label: 'שלושה ימים',     dates: '5-7.7' },
  { key: '12-14.7',label: 'שלושה ימים',     dates: '12-14.7' },
];

export default function NanaSummerBreakdown({ students }) {
  const stats = OPTIONS.map(opt => {
    const group = students.filter(s => s.nana_option === opt.key);
    const totalPaid = group.reduce((sum, s) => sum + (s.total_payments || 0), 0);
    return { ...opt, count: group.length, totalPaid };
  });

  const grandTotal = stats.reduce((sum, s) => sum + s.totalPaid, 0);
  const grandCount = stats.reduce((sum, s) => sum + s.count, 0);

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
              <td className="py-2 px-3">{row.count}</td>
              <td className="py-2 px-3 font-medium text-green-700">₪{row.totalPaid.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-purple-200 font-bold bg-purple-50">
            <td className="py-2 px-3" colSpan={2}>סה״כ</td>
            <td className="py-2 px-3">{grandCount}</td>
            <td className="py-2 px-3 text-green-700">₪{grandTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}