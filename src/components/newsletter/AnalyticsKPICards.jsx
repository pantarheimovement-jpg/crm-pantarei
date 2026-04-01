import React from 'react';
import { Mail, MousePointer, RotateCcw, AlertTriangle } from 'lucide-react';

const cards = [
  { key: 'open', label: 'פתיחות', icon: Mail, color: '#6D436D' },
  { key: 'click', label: 'קליקים', icon: MousePointer, color: '#D29486' },
  { key: 'bounce', label: 'Bounces', icon: RotateCcw, color: '#E67E22' },
  { key: 'complaint', label: 'תלונות', icon: AlertTriangle, color: '#E74C3C' },
];

export default function AnalyticsKPICards({ events }) {
  const counts = { open: 0, click: 0, bounce: 0, complaint: 0 };
  events.forEach(e => { if (counts[e.event_type] !== undefined) counts[e.event_type]++; });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">{label}</p>
              <p className="text-3xl font-bold text-[var(--crm-text)] mt-2">{counts[key].toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: color }}>
              <Icon size={24} style={{ color: 'white' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}