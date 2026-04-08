import React from 'react';

const eventTypeLabels = {
  open: { label: 'פתיחה', color: 'bg-green-100 text-green-800' },
  click: { label: 'קליק', color: 'bg-blue-100 text-blue-800' },
  bounce: { label: 'Bounce', color: 'bg-orange-100 text-orange-800' },
  complaint: { label: 'תלונה', color: 'bg-red-100 text-red-800' },
};

export default function RecentEventsTable({ events }) {
  const recent = [...events]
    .sort((a, b) => new Date(b.opened_at || b.created_date) - new Date(a.opened_at || a.created_date))
    .slice(0, 50);

  if (recent.length === 0) {
    return <p className="text-center text-gray-500 py-8">אין אירועים עדיין</p>;
  }

  return (
    <>
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {recent.map((event) => {
          const typeInfo = eventTypeLabels[event.event_type] || { label: event.event_type, color: 'bg-gray-100 text-gray-800' };
          return (
            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4" style={{ borderRadius: 'var(--crm-border-radius)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeInfo.color}`}>
                  {typeInfo.label}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(event.opened_at || event.created_date).toLocaleString('he-IL')}
                </span>
              </div>
              <div className="text-sm font-medium text-[var(--crm-text)] truncate" dir="ltr">
                {event.subscriber_email}
              </div>
              {event.newsletter_subject && (
                <div className="text-xs text-gray-500 mt-1 truncate">{event.newsletter_subject}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
        <table className="w-full">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">תאריך ושעה</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">מייל</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">סוג אירוע</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">נושא</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.map((event) => {
              const typeInfo = eventTypeLabels[event.event_type] || { label: event.event_type, color: 'bg-gray-100 text-gray-800' };
              return (
                <tr key={event.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(event.opened_at || event.created_date).toLocaleString('he-IL')}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--crm-text)]" style={{ wordBreak: 'break-all' }}>
                    {event.subscriber_email}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{event.newsletter_subject || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}