import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// כותרת סגירה/פתיחה בסגנון מודול ההשכרות — עטיפת תצוגה בלבד
export default function RevenueAccordion({ icon: Icon, iconColor = 'var(--crm-accent)', title, count, summary, defaultOpen = false, className = '', children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`} style={{ borderRadius: 'var(--crm-border-radius)' }} dir="rtl">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between flex-wrap gap-3 text-right"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-xl" style={{ backgroundColor: iconColor }}>
              <Icon size={20} className="text-white" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
            {title}
          </h2>
          {count !== undefined && <span className="text-sm text-gray-400">({count})</span>}
        </div>
        <div className="flex items-center gap-2">
          {summary && <p className="text-2xl font-bold text-[var(--crm-primary)]">{summary}</p>}
          {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}