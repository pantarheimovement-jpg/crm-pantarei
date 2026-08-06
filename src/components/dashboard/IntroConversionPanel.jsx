import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import IntroConversionRow from './IntroConversionRow';

// אותו מיפוי שמשמש את צד השרת (base44/shared/introDayPrograms.ts) — יום היכרות
// מזוהה לפי שם/קטלוג, כי "יום היכרות 9.9" קיים גם לנענע וגם לתדרים.
const PROGRAMS = [
  { match: /נענע/, program_id: '698481146122f14c8f89df73', program_name: 'נענע – בית ספר למחול ותנועה סומטית' },
  { match: /LBMS|לאבאן|ברטניי/i, program_id: '697a280406466f42ce5b27c1', program_name: 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף' },
  { match: /dancefullness|תדרים/i, program_id: '69a0414f292336bd32533bd1', program_name: 'dancefullness – תדרים בתנועה' }
];

const INTRO_ATTENDED = ['רשומה ליום היכרות', 'רשום', 'נרשם', 'היה ביום היכרות'];
const PROGRAM_REGISTERED = ['רשום', 'נרשם', 'הסתיים'];

const isIntroDay = (c) => c?.kind === 'יום היכרות' || /יום היכרות/.test(String(c?.name || ''));

export default function IntroConversionPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // עימוד מלא — האחוזים חייבים להתבסס על כל המשתתפות, לא על 50 הראשונות
      const students = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Student.list('-created_date', 500, skip);
        if (!batch?.length) break;
        students.push(...batch);
        if (batch.length < 500) break;
        skip += batch.length;
      }
      const courses = await base44.entities.Course.list();

      const result = PROGRAMS.map((p) => {
        const introCourses = (courses || []).filter(
          (c) => isIntroDay(c) && p.match.test(`${c.name || ''} ${c.summit_catalog || ''}`)
        );
        const introIds = new Set(introCourses.map((c) => c.id));

        const attendedStudents = students.filter((s) =>
          (s.courses || []).some((r) => introIds.has(r.course_id) && INTRO_ATTENDED.includes(r.status))
        );
        const didConvert = (s) =>
          (s.courses || []).some((r) => r.course_id === p.program_id && PROGRAM_REGISTERED.includes(r.status));

        const byDay = introCourses
          .map((c) => {
            const att = attendedStudents.filter((s) =>
              (s.courses || []).some((r) => r.course_id === c.id && INTRO_ATTENDED.includes(r.status))
            );
            return {
              course_id: c.id,
              course_name: c.name,
              attended: att.length,
              converted: att.filter(didConvert).length
            };
          })
          .filter((d) => d.attended > 0);

        return {
          program_name: p.program_name,
          attended: attendedStudents.length,
          converted: attendedStudents.filter(didConvert).length,
          notConverted: attendedStudents.filter((s) => !didConvert(s)).map((s) => s.full_name),
          byDay
        };
      });

      setRows(result);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden" style={{ borderRadius: 'var(--crm-border-radius)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full p-6 flex items-center justify-between text-right ${open ? 'border-b border-gray-50' : ''}`}
      >
        <div>
          <h2 className="font-bold text-lg text-[var(--crm-text)]">המרה מימי היכרות</h2>
          <p className="text-xs text-gray-400 mt-0.5">מי שהייתה ביום היכרות של התוכנית (כל התאריכים) — וכמה נרשמו בפועל</p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-gray-400" />
          {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {!open ? null : loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--crm-primary)]" />
        </div>
      ) : (
        rows.map((p) => <IntroConversionRow key={p.program_name} program={p} />)
      )}
    </div>
  );
}