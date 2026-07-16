import React from 'react';
import { X } from 'lucide-react';

// נוסח התבנית המאושרת במטא — intro_day_reminder_he
const TEMPLATE_TEXT = (p) => `היי ${p.name}
התעניינת לאחרונה ב-${p.course}.
מזמינים אותך להצטרף אלינו ליום היכרות שיתקיים ב-${p.date}
במרכז פנטהריי למחול ותנועה סומטית, קיבוץ גניגר.
לקריאה בהרחבה על התכנית והרשמה ליום היכרות:
${p.link}
נשמח לראותך🌿`;

export default function WaMessagePreview({ open, onClose, mode, freeText, params }) {
  if (!open) return null;
  const sampleName = params?.name || 'דנה';
  const text = mode === 'template'
    ? TEMPLATE_TEXT({ name: sampleName, course: params?.course || '—', date: params?.date || '—', link: params?.link || '—' })
    : (freeText || '').replace(/\{\{name\}\}/g, sampleName);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="font-bold text-lg">תצוגה מקדימה — וואטסאפ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5" style={{ backgroundColor: '#E5DDD5' }}>
          <div className="bg-[#DCF8C6] rounded-xl rounded-tr-none p-3 shadow-sm mr-auto max-w-[90%]" dir="rtl">
            <p className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">{text}</p>
            <p className="text-[10px] text-gray-500 text-left mt-1">19:51 ✓✓</p>
          </div>
          {mode === 'template' && (
            <div className="bg-white rounded-xl p-2 text-center text-sm font-medium text-[#00A5F4] shadow-sm mt-1 mr-auto max-w-[90%]">
              הסרה
            </div>
          )}
        </div>
        <div className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">
          השם ({sampleName}) הוא דוגמה — כל נמען/ת מקבל/ת את השם שלו/ה.
        </div>
      </div>
    </div>
  );
}