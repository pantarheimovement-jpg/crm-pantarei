import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function IntroConversionRow({ program }) {
  const [open, setOpen] = useState(false);
  const pct = program.attended === 0 ? 0 : Math.round((program.converted / program.attended) * 100);

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full p-4 hover:bg-gray-50 transition-colors text-right">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="font-semibold text-sm text-[var(--crm-text)]">{program.program_name}</span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500">{program.converted} מתוך {program.attended}</span>
            <span className="text-lg font-bold text-[var(--crm-primary)]">{pct}%</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--crm-primary)' }} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2">לפי יום היכרות</h4>
            {program.byDay.length === 0 ? (
              <p className="text-xs text-gray-400">אין ימי היכרות עם נרשמות</p>
            ) : (
              <div className="space-y-1">
                {program.byDay.map((d) => (
                  <div key={d.course_id} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="text-[var(--crm-text)]">{d.course_name}</span>
                    <span className="text-gray-500">
                      {d.converted}/{d.attended} · {d.attended ? Math.round((d.converted / d.attended) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2">עדיין לא נרשמו ({program.notConverted.length})</h4>
            {program.notConverted.length === 0 ? (
              <p className="text-xs text-gray-400">כולן נרשמו 🎉</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {program.notConverted.map((n, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}