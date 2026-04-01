import React from 'react';

export default function CampaignTable({ events }) {
  // Group by newsletter_subject
  const campaigns = {};
  events.forEach(e => {
    const subj = e.newsletter_subject || '(ללא נושא)';
    if (!campaigns[subj]) campaigns[subj] = { opens: 0, clicks: 0, bounces: 0, total: 0 };
    campaigns[subj].total++;
    if (e.event_type === 'open') campaigns[subj].opens++;
    else if (e.event_type === 'click') campaigns[subj].clicks++;
    else if (e.event_type === 'bounce') campaigns[subj].bounces++;
  });

  const rows = Object.entries(campaigns)
    .sort((a, b) => b[1].total - a[1].total);

  if (rows.length === 0) {
    return <p className="text-center text-gray-500 py-8">אין נתוני קמפיינים עדיין</p>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <table className="w-full">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">נושא הניוזלטר</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">פתיחות</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">קליקים</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bounces</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(([subject, data]) => (
            <tr key={subject} className="hover:bg-gray-50/50">
              <td className="px-4 py-3 text-sm font-medium text-[var(--crm-text)]">{subject}</td>
              <td className="px-4 py-3 text-sm text-center text-green-700 font-semibold">{data.opens}</td>
              <td className="px-4 py-3 text-sm text-center text-blue-700 font-semibold">{data.clicks}</td>
              <td className="px-4 py-3 text-sm text-center text-orange-600 font-semibold">{data.bounces}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}