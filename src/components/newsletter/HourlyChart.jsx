import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HourlyChart({ events }) {
  // Count opens by hour
  const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${i}:00`, count: 0 }));
  events.forEach(e => {
    if (e.event_type === 'open' && e.hour_of_day != null) {
      hourCounts[e.hour_of_day].count++;
    }
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <h3 className="font-bold text-lg text-[var(--crm-text)] mb-4">פתיחות לפי שעה ביום</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={hourCounts} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value) => [value, 'פתיחות']}
              labelFormatter={(label) => `שעה: ${label}`}
            />
            <Bar dataKey="count" fill="#6D436D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}