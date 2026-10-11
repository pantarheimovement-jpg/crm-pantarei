import React from 'react';
import { Clock } from 'lucide-react';

// בחירת מועד שליחה מתוזמן. ערך ריק = שליחה מיידית.
export default function ScheduleSendPicker({ value, onChange }) {
  const enabled = value !== null;
  const minValue = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <label className="flex items-center gap-2 font-medium text-[var(--crm-text)] cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={e => onChange(e.target.checked ? '' : null)} />
        <Clock className="w-4 h-4" /> תזמון שליחה למועד מאוחר יותר
      </label>
      {enabled && (
        <div className="mt-3">
          <input
            type="datetime-local"
            value={value}
            min={minValue}
            onChange={e => onChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">לפי שעון ישראל. השליחה תתחיל עד 5 דקות אחרי המועד, באותו קצב רגיל.</p>
        </div>
      )}
    </div>
  );
}