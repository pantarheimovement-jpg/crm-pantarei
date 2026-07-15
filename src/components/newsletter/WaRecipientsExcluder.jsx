import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function WaRecipientsExcluder({ recipients, excludedIds, onToggle }) {
  const [open, setOpen] = useState(false);
  const selectedCount = recipients.filter(r => !excludedIds.has(r.id)).length;

  return (
    <div className="mt-3 border border-green-200 bg-green-50/50 rounded-lg">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700">
        <span>📱 נמעני וואטסאפ בקבוצה — נבחרו {selectedCount} מתוך {recipients.length}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="max-h-56 overflow-y-auto px-4 pb-3 space-y-1.5 border-t border-green-100 pt-2">
          {recipients.length === 0 && <p className="text-xs text-gray-500">אין מנויים עם וואטסאפ בקבוצה זו</p>}
          {recipients.map(r => (
            <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white rounded px-1 py-0.5">
              <input type="checkbox" checked={!excludedIds.has(r.id)} onChange={() => onToggle(r.id)} className="accent-green-600" />
              <span className="font-medium">{r.name || 'ללא שם'}</span>
              <span className="text-gray-400 text-xs" dir="ltr">{r.whatsapp}</span>
            </label>
          ))}
          <p className="text-xs text-gray-500 pt-1">הורדת סימון = המנוי/ה לא יקבלו את הדיוור הזה בוואטסאפ (נשארים בקבוצה).</p>
        </div>
      )}
    </div>
  );
}