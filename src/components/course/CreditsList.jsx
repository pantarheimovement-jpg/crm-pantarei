import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, Save, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import UseCreditDialog from './UseCreditDialog';

const fmt = (n) => `₪${(n || 0).toLocaleString('he-IL')}`;

export default function CreditsList({ course, students, allCourses, onChanged }) {
  const [notes, setNotes] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [useFor, setUseFor] = useState(null);

  const entryOf = (s) => (s.courses || []).find(c => c.course_id === course.id) || {};

  useEffect(() => {
    const init = {};
    students.forEach(s => { init[s.id] = entryOf(s).credit_note || ''; });
    setNotes(init);
  }, [students]);

  const active = students.filter(s => entryOf(s).status !== 'נוצל');
  const used = students.filter(s => entryOf(s).status === 'נוצל');
  const total = active.reduce((sum, s) => sum + (entryOf(s).paid_so_far || 0), 0);

  const saveNote = async (student) => {
    setSavingId(student.id);
    const courses = student.courses.map(c => c.course_id === course.id ? { ...c, credit_note: notes[student.id] } : c);
    await base44.entities.Student.update(student.id, { courses });
    setSavingId(null);
    onChanged();
  };

  const useCredit = async (student, target) => {
    const amount = entryOf(student).paid_so_far || 0;
    const today = new Date().toISOString().slice(0, 10);
    const usedFor = `${target.name} (${new Date().toLocaleDateString('he-IL')})`;
    const hasTarget = student.courses.some(c => c.course_id === target.id);
    let courses = student.courses.map(c => {
      if (c.course_id === course.id) return { ...c, status: 'נוצל', credit_used_for: usedFor };
      if (c.course_id === target.id) return { ...c, status: 'רשום', paid_so_far: (c.paid_so_far || 0) + amount, paid_source: 'ידני', registration_date: c.registration_date || today };
      return c;
    });
    if (!hasTarget) {
      courses.push({ course_id: target.id, course_name: target.name, status: 'רשום', registration_date: today, paid_so_far: amount, paid_source: 'ידני' });
    }
    await base44.entities.Student.update(student.id, { courses, status: 'רשום', is_customer: true });
    await Promise.all([
      base44.entities.Course.update(course.id, { current_students: Math.max(0, (course.current_students || 0) - 1) }),
      !hasTarget && base44.entities.Course.update(target.id, { current_students: (target.current_students || 0) + 1 }),
    ]);
    setUseFor(null);
    onChanged();
  };

  const targets = allCourses.filter(c => c.id !== course.id && c.kind !== 'זיכוי');

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-[var(--crm-primary)]" />
        <h2 className="text-xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>זיכויים פתוחים</h2>
        <span className="text-sm text-gray-400">({active.length}) · סה"כ {fmt(total)}</span>
      </div>

      {active.length === 0 ? (
        <p className="text-center text-gray-400 py-6">אין זיכויים פתוחים</p>
      ) : (
        <div className="space-y-3">
          {active.map(s => (
            <div key={s.id} className="p-3 bg-gray-50 rounded-lg flex flex-col md:flex-row md:items-center gap-3">
              <div className="md:w-44 shrink-0">
                <div className="font-medium text-[var(--crm-text)]">{s.full_name}</div>
                <div className="text-lg font-bold text-[var(--crm-primary)]">{fmt(entryOf(s).paid_so_far)}</div>
              </div>
              <input
                type="text"
                value={notes[s.id] || ''}
                onChange={e => setNotes({ ...notes, [s.id]: e.target.value })}
                placeholder="על מה הזיכוי? (למשל: ביטול סדנה 19.9)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="flex gap-2 shrink-0">
                <button onClick={() => saveNote(s)} disabled={savingId === s.id || (notes[s.id] || '') === (entryOf(s).credit_note || '')}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[var(--crm-primary)] text-white disabled:opacity-40">
                  <Save className="w-3.5 h-3.5" /> שמור
                </button>
                <button onClick={() => setUseFor(s)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-[var(--crm-primary)] text-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10">
                  <ArrowLeftRight className="w-3.5 h-3.5" /> נוצל לקורס אחר
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {used.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> זיכויים שנוצלו ({used.length})</h3>
          <div className="space-y-1">
            {used.map(s => {
              const e = entryOf(s);
              return (
                <div key={s.id} className="text-sm text-gray-500 flex flex-wrap gap-x-3 px-3 py-1.5">
                  <span className="font-medium text-gray-700">{s.full_name}</span>
                  <span>{fmt(e.paid_so_far)}</span>
                  {e.credit_note && <span>· {e.credit_note}</span>}
                  <span>· נוצל עבור: {e.credit_used_for}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {useFor && (
        <UseCreditDialog
          student={useFor}
          amount={entryOf(useFor).paid_so_far || 0}
          courses={targets}
          onConfirm={(target) => useCredit(useFor, target)}
          onClose={() => setUseFor(null)}
        />
      )}
    </div>
  );
}