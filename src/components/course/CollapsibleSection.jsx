import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white shadow-sm px-6 py-4 hover:bg-gray-50 transition-colors"
        style={{ borderRadius: 'var(--crm-border-radius)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
            {title}
          </span>
          {badge !== undefined && (
            <span className="text-sm text-gray-400">({badge})</span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-[var(--crm-primary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="-mt-4">{children}</div>}
    </div>
  );
}