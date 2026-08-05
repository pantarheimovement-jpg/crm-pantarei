import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const KIND_OPTIONS = ['קורס', 'יום היכרות', 'אירוע', 'תרומה', 'השכרה', 'בדיקה', 'להתעלם'];
// יום היכרות מנוהל כקורס — הוא דורש בחירת קורס ומקבל תיקון רטרואקטיבי
const COURSE_KINDS = ['קורס', 'יום היכרות'];

function AssignModal({ item, courses, onClose, onDone }) {
  const [kind, setKind] = useState('קורס');
  const [courseId, setCourseId] = useState('');
  const [optionMode, setOptionMode] = useState('existing'); // 'existing' | 'new' | 'none'
  const [optionId, setOptionId] = useState('');
  const [newOptionName, setNewOptionName] = useState(item.summit_product);
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const selectedCourse = courses.find(c => c.id === courseId);
  const needsCourse = COURSE_KINDS.includes(kind);

  const runPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await base44.functions.invoke('assignSumitProduct', {
        mapId: item.id,
        mode: 'preview',
        kind,
        courseId: needsCourse ? courseId : undefined,
        optionId: needsCourse && optionMode === 'existing' ? optionId : undefined,
        newOption: needsCourse && optionMode === 'new' ? { name: newOptionName, price: parseFloat(newOptionPrice) || 0 } : undefined
      });
      setPreview(res.data);
    } catch (e) {
      alert('שגיאה בבדיקה: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      await base44.functions.invoke('assignSumitProduct', {
        mapId: item.id,
        mode: 'apply',
        kind,
        courseId: needsCourse ? courseId : undefined,
        optionId: needsCourse && optionMode === 'existing' ? optionId : undefined,
        newOption: needsCourse && optionMode === 'new' ? { name: newOptionName, price: parseFloat(newOptionPrice) || 0 } : undefined
      });
      onDone();
    } catch (e) {
      alert('שגיאה בשיוך: ' + (e.response?.data?.error || e.message));
    } finally {
      setApplying(false);
    }
  };

  const canPreview = !needsCourse || (courseId && (optionMode === 'none' || (optionMode === 'existing' && optionId) || (optionMode === 'new' && newOptionName)));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-[var(--crm-primary)]">שיוך: {item.summit_product}</h4>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">מה המוצר הזה באמת? *</label>
            <select value={kind} onChange={(e) => { setKind(e.target.value); setPreview(null); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {KIND_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {needsCourse && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">קורס *</label>
                <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setOptionId(''); setPreview(null); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">בחרי קורס...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {courseId && (
                <div>
                  <label className="block text-sm font-medium mb-1">מסלול</label>
                  <div className="flex gap-3 mb-2 text-sm">
                    <label className="flex items-center gap-1"><input type="radio" checked={optionMode === 'existing'} onChange={() => { setOptionMode('existing'); setPreview(null); }} /> קיים</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={optionMode === 'new'} onChange={() => { setOptionMode('new'); setPreview(null); }} /> חדש</label>
                    <label className="flex items-center gap-1"><input type="radio" checked={optionMode === 'none'} onChange={() => { setOptionMode('none'); setPreview(null); }} /> בלי מסלול</label>
                  </div>
                  {optionMode === 'existing' && (
                    <select value={optionId} onChange={(e) => { setOptionId(e.target.value); setPreview(null); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">בחרי מסלול...</option>
                      {(selectedCourse?.options || []).map(o => <option key={o.option_id} value={o.option_id}>{o.name}{o.price ? ` (₪${o.price})` : ''}</option>)}
                    </select>
                  )}
                  {optionMode === 'new' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={newOptionName} onChange={(e) => { setNewOptionName(e.target.value); setPreview(null); }} placeholder="שם המסלול" />
                      <Input type="number" value={newOptionPrice} onChange={(e) => { setNewOptionPrice(e.target.value); setPreview(null); }} placeholder="מחיר ₪" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <Button type="button" onClick={runPreview} disabled={!canPreview || loading} variant="outline" className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'בדיקה — כמה תשלומים ישפיע'}
          </Button>

          {preview && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span>
                {preview.affectedCount > 0
                  ? `השיוך הזה ישפיע על ${preview.affectedCount} תשלומים קודמים בסך ₪${preview.affectedTotal.toLocaleString('he-IL')}`
                  : 'לא נמצאו תשלומים קודמים ממתינים מהמוצר הזה — השיוך יחול על תשלומים עתידיים בלבד'}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={apply} disabled={!preview || applying} className="flex-1 bg-[var(--crm-primary)] text-white">
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שייכי'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">ביטול</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SumitInbox() {
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [maps, coursesData] = await Promise.all([
        base44.entities.SumitProductMap.filter({ status: 'ממתין לשיוך' }, '-last_seen_at'),
        base44.entities.Course.list()
      ]);
      setItems(maps || []);
      setCourses(coursesData || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--crm-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Inbox className="w-8 h-8 text-[var(--crm-primary)]" />
          <div>
            <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
              תיבת נכנסות סאמיט
            </h1>
            <p className="text-sm text-[var(--crm-text)] opacity-70">
              מוצרים שנקלטו מסאמיט ולא זוהו אוטומטית — {items.length} ממתינים לשיוך
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">מוצר</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">קטלוג</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">סכום אחרון</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">כמה פעמים</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">נראה לאחרונה</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">פעולה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[var(--crm-text)]">{item.summit_product}</td>
                  <td className="px-4 py-3 text-gray-600">{item.summit_catalog || '—'}</td>
                  <td className="px-4 py-3 text-center text-green-700 font-medium">{item.last_amount ? `₪${item.last_amount}` : '—'}</td>
                  <td className="px-4 py-3 text-center">{item.times_seen || 1}</td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {item.last_seen_at ? new Date(item.last_seen_at).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" onClick={() => setAssigning(item)} className="bg-[var(--crm-primary)] text-white">
                      שיוך
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">אין מוצרים ממתינים לשיוך 🎉</div>
          )}
        </div>
      </div>

      {assigning && (
        <AssignModal
          item={assigning}
          courses={courses}
          onClose={() => setAssigning(null)}
          onDone={() => { setAssigning(null); load(); }}
        />
      )}
    </div>
  );
}