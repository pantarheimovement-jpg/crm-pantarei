import React, { useState } from 'react';
import { Plus, Trash2, Edit, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EMPTY_OPTION = {
  name: '', price: '', summit_product_name: '', payment_link: '',
  dates_text: '', start_date: '', capacity: '', status: 'פתוח להרשמה', is_manual: true
};

export default function CourseOptionsEditor({ options = [], onChange }) {
  const [editing, setEditing] = useState(null); // null | 'new' | option_id
  const [draft, setDraft] = useState(EMPTY_OPTION);

  const startNew = () => { setDraft(EMPTY_OPTION); setEditing('new'); };
  const startEdit = (opt) => { setDraft(opt); setEditing(opt.option_id); };
  const cancel = () => { setEditing(null); setDraft(EMPTY_OPTION); };

  const save = () => {
    if (!draft.name?.trim()) return;
    const cleaned = {
      ...draft,
      price: draft.price ? parseFloat(draft.price) : undefined,
      capacity: draft.capacity ? parseFloat(draft.capacity) : undefined
    };
    if (editing === 'new') {
      const option_id = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      onChange([...options, { ...cleaned, option_id, current_students: 0 }]);
    } else {
      onChange(options.map((o) => o.option_id === editing ? { ...o, ...cleaned } : o));
    }
    cancel();
  };

  const remove = (option_id) => {
    if (!confirm('להסיר את האפשרות הזו? שיוכים קיימים שמפנים אליה יישארו ללא אפשרות מוגדרת.')) return;
    onChange(options.filter((o) => o.option_id !== option_id));
  };

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden">
      <div className="bg-purple-50 px-4 py-2 flex items-center justify-between">
        <p className="text-sm font-bold text-purple-800">🎫 מסלולים (אפשרויות רישום)</p>
        {editing === null && (
          <Button type="button" size="sm" onClick={startNew} className="bg-purple-600 hover:bg-purple-700 text-white h-7 px-2">
            <Plus className="w-3.5 h-3.5 mr-1" /> מסלול חדש
          </Button>
        )}
      </div>

      {options.length > 0 && (
        <div className="divide-y divide-purple-100">
          {options.map((opt) => (
            <div key={opt.option_id} className="px-4 py-2 flex items-center justify-between gap-2 text-sm">
              <div className="flex-1">
                <span className="font-medium">{opt.name}</span>
                {opt.price ? <span className="text-gray-500"> · ₪{opt.price}</span> : null}
                {opt.status && <span className="text-gray-400 text-xs"> · {opt.status}</span>}
                <span className="text-gray-400 text-xs"> · {opt.current_students || 0} רשומים{opt.capacity ? `/${opt.capacity}` : ''}</span>
                {opt.is_manual === false && (
                  <span className="text-purple-500 text-xs flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3" /> נוצר אוטומטית מסאמיט
                  </span>
                )}
              </div>
              <button type="button" onClick={() => startEdit(opt)} className="text-purple-600 hover:text-purple-800">
                <Edit className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => remove(opt.option_id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {options.length === 0 && editing === null && (
        <p className="px-4 py-3 text-sm text-gray-400">אין מסלולים מוגדרים לקורס זה</p>
      )}

      {editing !== null && (
        <div className="p-4 space-y-3 bg-white border-t border-purple-100">
          <div className="flex justify-between items-center">
            <p className="text-sm font-bold text-purple-800">{editing === 'new' ? 'מסלול חדש' : 'עריכת מסלול'}</p>
            <button type="button" onClick={cancel}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">שם המסלול *</label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="למשל: יסודות ב'" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">מחיר ₪</label>
              <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">סטטוס</label>
              <select
                value={draft.status || 'פתוח להרשמה'}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="פתוח להרשמה">פתוח להרשמה</option>
                <option value="מלא">מלא</option>
                <option value="לא פתוח להרשמה">לא פתוח להרשמה</option>
                <option value="הסתיים">הסתיים</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">מקומות</label>
              <Input type="number" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">שם המוצר בסאמיט (לשיוך אוטומטי)</label>
              <Input value={draft.summit_product_name || ''} onChange={(e) => setDraft({ ...draft, summit_product_name: e.target.value })} placeholder="השם המדויק כפי שמופיע בסאמיט" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">מועדים (טקסט חופשי)</label>
              <Input value={draft.dates_text || ''} onChange={(e) => setDraft({ ...draft, dates_text: e.target.value })} placeholder="למשל: 5-9.7" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">תאריך המסלול</label>
              <Input type="date" value={draft.start_date || ''} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">קישור תשלום ישיר למסלול</label>
              <Input value={draft.payment_link || ''} onChange={(e) => setDraft({ ...draft, payment_link: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" onClick={save} className="bg-purple-600 hover:bg-purple-700 text-white">שמור מסלול</Button>
            <Button type="button" variant="outline" onClick={cancel}>ביטול</Button>
          </div>
        </div>
      )}
    </div>
  );
}