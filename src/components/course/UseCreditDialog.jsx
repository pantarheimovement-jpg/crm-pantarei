import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import CourseCombobox from '../shared/CourseCombobox';

export default function UseCreditDialog({ student, amount, courses, onConfirm, onClose }) {
  const [targetId, setTargetId] = useState('');
  const [saving, setSaving] = useState(false);
  const target = courses.find(c => c.id === targetId);

  const handleConfirm = async () => {
    if (!target) return;
    setSaving(true);
    await onConfirm(target);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">ניצול זיכוי — {student.full_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600">
          זיכוי של <b>₪{amount}</b> יסומן כנוצל, והמשתתפת תירשם לקורס שתבחרי עם הסכום כתשלום שבוצע.
        </p>
        <CourseCombobox courses={courses} value={targetId} onChange={id => setTargetId(id)} />
        <div className="flex gap-3">
          <button onClick={handleConfirm} disabled={!target || saving}
            className="flex-1 py-2.5 bg-[var(--crm-primary)] text-white rounded-full font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />מעביר...</> : 'אשר והעבר'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-full hover:bg-gray-50">ביטול</button>
        </div>
      </div>
    </div>
  );
}