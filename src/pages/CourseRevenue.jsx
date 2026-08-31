import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, Search, Download, Users, TrendingUp, ChevronDown, ChevronUp, X, Loader2, Clock } from 'lucide-react';
import { useSystemSettings } from '../components/SystemSettingsContext';
import ExportButtons from '../components/shared/ExportButtons';
import PendingAssignmentModal from '../components/revenue/PendingAssignmentModal';
import RevenueListModal from '../components/revenue/RevenueListModal';
import RentalsSection from '../components/revenue/RentalsSection';
import MonthlyRevenueSummary from '../components/revenue/MonthlyRevenueSummary';
import CreditsAndCancellationsSection from '../components/revenue/CreditsAndCancellationsSection';
import RevenueAccordion from '../components/revenue/RevenueAccordion';
import { extractProductHints, looksNonCourse, NON_COURSE_BUCKET_NAME } from '../components/revenue/pendingHints';

const REGISTERED_STATUSES = new Set(['רשום', 'נרשם', 'רשומה ליום היכרות']);
// תחזית בלבד: "נוצרה הוראת קבע" = רשומה שטרם חויבה. נכנסת ל"הכנסות צפויות"
// אך לעולם לא ל-REGISTERED_STATUSES ולא לכסף בפועל (נגבה/משויך).
const FORECAST_STATUSES = new Set([...REGISTERED_STATUSES, 'נוצרה הוראת קבע']);

export default function CourseRevenue() {
  const { designSettings } = useSystemSettings();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [openModal, setOpenModal] = useState(null); // null | 'collected' | 'matched' | 'expected'

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [coursesData, studentsData] = await Promise.all([
          base44.entities.Course.list(),
          (async () => {
            let all = [], skip = 0;
            while (true) {
              const batch = await base44.entities.Student.list('-created_date', 500, skip);
              if (!batch || batch.length === 0) break;
              all = all.concat(batch);
              if (batch.length < 500) break;
              skip += batch.length;
            }
            return all;
          })()
        ]);
        setCourses(coursesData || []);
        setStudents(studentsData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // For each course, compute revenue stats from students' courses[] array
  const courseStats = useMemo(() => {
    return courses.map(course => {
      // Find all course entries across all students matching this course and registered status
      const registeredEntries = [];
      const registeredStudents = [];
      // רשומות לתחזית — כולל "נוצרה הוראת קבע" (טרם חויבה). תצוגה בלבד.
      const forecastEntries = [];

      students.forEach(student => {
        (student.courses || [])
          .filter(c => c.course_id === course.id && FORECAST_STATUSES.has(c.status))
          .forEach(e => forecastEntries.push({ ...e, student }));
        const entries = (student.courses || []).filter(
          c => c.course_id === course.id && REGISTERED_STATUSES.has(c.status)
        );
        if (entries.length > 0) {
          entries.forEach(e => registeredEntries.push({ ...e, student }));
          registeredStudents.push(student);
        } else if (
          !student.courses?.length &&
          student.course_id === course.id &&
          REGISTERED_STATUSES.has(student.status)
        ) {
          // fallback: old flat structure
          const flatEntry = {
            course_id: course.id,
            course_name: course.name,
            status: student.status,
            total_price: student.total_payments,
            installment_amount: null,
            payment_number: student.payment_number,
            payments_total: null,
            student
          };
          registeredEntries.push(flatEntry);
          forecastEntries.push(flatEntry);
          registeredStudents.push(student);
        }
      });

      // כמה שולם בפועל, לפי סדר אמינות יורד:
      //   1. paid_so_far — הסכום שנצבר לקורס הזה בלבד
      //   2. amount_paid — כשלמשתתפת רישום רשום אחד בלבד, כל הכסף שלה שייך לו
      //   3. installment_amount × payment_number — אומדן בלבד. נכון רק כשכל התשלומים
      //      שווים; מי ששילמה ₪1,400 ואז ₪800 מוצגת כאן כ-₪1,600 במקום ₪2,200.
      // סופרים רק כסף ודאי. סכום שאפשר רק לנחש (installment × payment_number)
      // לא נספר כלל — מספר על המסך הוא תמיד מספר אמיתי, אחרת "—".
      //
      // ⚠️ התנאי בודק רישומים *רשומים*, לא את אורך המערך. עד 30.7 הוא ספר את כל
      // המערך, ולכן מי שיש לה גם רשומת "ליד היסטורי" או "לא רלוונטי" נעלמה בשקט:
      // נסרין עואד, ₪180, רישום רשום אחד מתוך שלוש רשומות. 22 משתתפות כאלה.
      // hasUnknown מציין שיש רשומים ששילמו אך הסכום המדויק שלהם לא נמשך מסאמיט.
      let hasUnknown = false;
      const paidSoFar = registeredEntries.reduce((sum, e) => {
        if (e.paid_so_far !== null && e.paid_so_far !== undefined && e.paid_so_far !== '') {
          return sum + (parseFloat(e.paid_so_far) || 0);
        }
        const registeredCourseCount = (e.student?.courses || []).filter(
          c => REGISTERED_STATUSES.has(c.status)
        ).length;
        if (registeredCourseCount === 1 && e.student?.amount_paid) {
          return sum + (parseFloat(e.student.amount_paid) || 0);
        }
        // יש חיוב אך אין סכום ודאי — לא מוסיפים לסכום, רק מסמנים
        if ((parseFloat(e.installment_amount) || 0) || (parseFloat(e.payment_number) || 0)) hasUnknown = true;
        return sum;
      }, 0);

      // הכנסות צפויות רלוונטי רק לתוכניות שנתיות בהוראת קבע — בקורסים שמשלמים בהם
      // מראש "צפוי" = "שולם" והמדד מיותר. מחיר לכל רישום: מחיר המסלול שנבחר
      // (Course.options[] לפי option_id), עם נפילה למחיר הישן total_price, ואז להערכה installment × payments_total.
      const priceFromOption = (optionId) => {
        if (!optionId) return null;
        const opt = (course.options || []).find(o => o.option_id === optionId);
        return opt && opt.price != null ? parseFloat(opt.price) : null;
      };
      const isAnnual = course.is_annual_program === true ||
        forecastEntries.some(e => (parseFloat(e.payments_total) || 0) > 1);

      // התחזית רצה על forecastEntries — כולל "נוצרה הוראת קבע" שטרם חויבה
      const expected = isAnnual ? forecastEntries.reduce((sum, e) => {
        const fromOption = priceFromOption(e.option_id);
        if (fromOption !== null) return sum + fromOption;
        if (e.total_price) return sum + parseFloat(e.total_price);
        const inst = parseFloat(e.installment_amount) || 0;
        const total = parseFloat(e.payments_total) || 0;
        return sum + inst * total;
      }, 0) : null;

      return {
        course,
        registeredCount: registeredStudents.length,
        paidSoFar,
        expected,
        isAnnual,
        hasUnknown,
        forecastCount: forecastEntries.length,
        entries: registeredEntries
      };
    });
  }, [courses, students]);

  const totalPaid = courseStats.reduce((s, c) => s + c.paidSoFar, 0);
  const totalExpected = courseStats.reduce((s, c) => s + (c.expected || 0), 0);
  const totalStudents = courseStats.reduce((s, c) => s + c.registeredCount, 0);

  // סה"כ שנגבה בפועל דרך סאמיט לכל משתתפת (amount_paid) — כולל כספים
  // שעדיין לא שויכו לקורס. ההפרש בין זה לבין "משויך" הוא "ממתין לשיוך".
  const totalCollected = students.reduce((s, st) => s + (parseFloat(st.amount_paid) || 0), 0);
  const matchedTotal = totalPaid;
  const pendingTotal = Math.max(0, totalCollected - matchedTotal);

  // רשימת משתתפות עם כספים ממתינים לשיוך — הסכום הממתין של כל אחת הוא
  // amount_paid פחות מה שכבר שויך לרישום רשום שלה בפועל (paid_so_far).
  // ⚠️ הסינון הוא הפער עצמו, לא תגית — התגית מסומנת רק בקליטה הראשונה
  // של מוצר לא-מוכר, ולא מתעדכנת אם המשתתפת קיבלה חיובים נוספים אחריה.
  const pendingStudents = useMemo(() => {
    return students
      .map(s => {
        const registeredEntries = (s.courses || []).filter(c => REGISTERED_STATUSES.has(c.status));
        const matchedForStudent = registeredEntries.reduce((sum, c) => sum + (parseFloat(c.paid_so_far) || 0), 0);
        const pendingAmount = Math.round(((parseFloat(s.amount_paid) || 0) - matchedForStudent) * 100) / 100;
        const hints = extractProductHints(s.notes);
        return {
          id: s.id,
          name: s.full_name,
          phone: s.phone,
          hints,
          isNonCourse: looksNonCourse(hints, s.notes),
          courses: registeredEntries.map(c => c.course_name),
          courseIds: registeredEntries.map(c => c.course_id),
          pendingAmount
        };
      })
      .filter(s => s.pendingAmount >= 1)
      .sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [students]);

  // רשימות לחיצה עבור שלושת הריבועים האחרים — אותו דפוס כמו pendingStudents
  const collectedList = useMemo(() => {
    return students
      .filter(s => (parseFloat(s.amount_paid) || 0) > 0)
      .map(s => ({ id: s.id, name: s.full_name, sub: s.phone, amount: parseFloat(s.amount_paid) || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [students]);

  const matchedList = useMemo(() => {
    const rows = [];
    courseStats.forEach(({ course, entries }) => {
      entries.forEach(e => {
        let amt = 0;
        if (e.paid_so_far !== null && e.paid_so_far !== undefined && e.paid_so_far !== '') {
          amt = parseFloat(e.paid_so_far) || 0;
        } else {
          const registeredCourseCount = (e.student?.courses || []).filter(c => REGISTERED_STATUSES.has(c.status)).length;
          if (registeredCourseCount === 1 && e.student?.amount_paid) {
            amt = parseFloat(e.student.amount_paid) || 0;
          }
        }
        if (amt > 0) {
          rows.push({ id: `${e.student.id}-${course.id}`, name: e.student.full_name, sub: course.name, amount: amt });
        }
      });
    });
    return rows.sort((a, b) => b.amount - a.amount);
  }, [courseStats]);

  const expectedList = useMemo(() => {
    return courseStats
      .filter(c => c.isAnnual)
      .map(c => ({ id: c.course.id, name: c.course.name, sub: `${c.registeredCount} רשומים`, amount: c.expected || 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [courseStats]);

  // סקשן השכרות — קורסים שסומנו kind === 'השכרה'. אותה לוגיקת סכום כמו matchedList:
  // paid_so_far, ונפילה ל-amount_paid כשלמשתתפת רישום רשום יחיד. תצוגה בלבד — הכספים
  // האלה כבר נספרים ב"משויך לקורסים", זו קטגוריזציה ולא כסף נוסף.
  const rentalRows = useMemo(() => {
    const rows = [];
    courseStats
      .filter(({ course }) => course.kind === 'השכרה')
      .forEach(({ course, entries }) => {
        entries.forEach(e => {
          let amt = 0;
          if (e.paid_so_far !== null && e.paid_so_far !== undefined && e.paid_so_far !== '') {
            amt = parseFloat(e.paid_so_far) || 0;
          } else {
            const registeredCourseCount = (e.student?.courses || []).filter(c => REGISTERED_STATUSES.has(c.status)).length;
            if (registeredCourseCount === 1 && e.student?.amount_paid) {
              amt = parseFloat(e.student.amount_paid) || 0;
            }
          }
          if (amt > 0) {
            rows.push({
              id: `${e.student.id}-${course.id}`,
              name: e.student.full_name,
              date: e.registration_date || null,
              amount: amt,
              context: course.name
            });
          }
        });
      });
    return rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [courseStats]);

  const filteredStats = courseStats.filter(({ course }) => {
    if (course.kind === 'השכרה') return false; // מוצגים בסקשן ההשכרות
    const matchSearch = !search || course.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportRows = filteredStats.map(({ course, registeredCount, paidSoFar, expected }) => [
    course.name,
    course.status || '',
    registeredCount,
    paidSoFar ? `₪${paidSoFar.toLocaleString('he-IL')}` : '—',
    expected ? `₪${expected.toLocaleString('he-IL')}` : '—',
  ]);

  const fmt = (n) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--crm-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                הכנסות לקורסים
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">מעקב תשלומים ועומס קורסים</p>
            </div>
          </div>
          <ExportButtons
            headers={['שם קורס', 'סטטוס', 'רשומים', 'שולם עד כה', 'הכנסות צפויות']}
            rows={exportRows}
            fileName="course-revenue"
            sheetTitle="הכנסות קורסים"
          />
        </div>

        <MonthlyRevenueSummary students={students} totalCollected={totalCollected} />

        {/* Summary KPIs — שלושה מספרים מתאזנים: נגבה בפועל = משויך + ממתין לשיוך, בתוספת הכנסות צפויות לתוכניות שנתיות */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'נגבה בפועל', value: fmt(totalCollected), icon: DollarSign, color: 'var(--crm-accent)', onClick: () => setOpenModal('collected') },
            { label: 'משויך לקורסים', value: fmt(matchedTotal), icon: TrendingUp, color: 'var(--crm-primary)', onClick: () => setOpenModal('matched') },
            { label: 'ממתין לשיוך', value: fmt(pendingTotal), icon: Clock, color: 'var(--crm-action)', onClick: () => setShowPending(true) },
            { label: 'הכנסות צפויות', sublabel: '(תוכניות בהוראת קבע)', value: fmt(totalExpected), icon: TrendingUp, color: 'var(--crm-accent)', onClick: () => setOpenModal('expected') },
          ].map(({ label, sublabel, value, icon: Icon, color, onClick }) => (
            <div
              key={label}
              onClick={onClick}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">
                    {label}
                    {sublabel && <span className="block text-xs opacity-60">{sublabel}</span>}
                  </p>
                  <p className="text-3xl font-bold text-[var(--crm-text)] mt-2">{value}</p>
                  <p className="text-xs text-[var(--crm-primary)] mt-1 underline">לצפייה ברשימה</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: color }}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {showPending && (
          <PendingAssignmentModal
            students={pendingStudents}
            courses={courses}
            bucketCourseId={courses.find(c => c.name === NON_COURSE_BUCKET_NAME)?.id}
            onAssigned={(updated) => setStudents(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))}
            onClose={() => setShowPending(false)}
          />
        )}
        {openModal === 'collected' && (
          <RevenueListModal
            title="נגבה בפועל"
            rows={collectedList}
            subHeader="טלפון"
            amountHeader="סכום שנגבה"
            onClose={() => setOpenModal(null)}
          />
        )}
        {openModal === 'matched' && (
          <RevenueListModal
            title="משויך לקורסים"
            rows={matchedList}
            subHeader="קורס"
            amountHeader="שולם"
            onClose={() => setOpenModal(null)}
          />
        )}
        {openModal === 'expected' && (
          <RevenueListModal
            title="הכנסות צפויות"
            rows={expectedList}
            subHeader="רשומים"
            amountHeader="צפי"
            emptyMessage="אין תוכניות שנתיות מסומנות"
            onClose={() => setOpenModal(null)}
          />
        )}

        <RentalsSection rows={rentalRows} />

        <RevenueAccordion
          icon={TrendingUp}
          iconColor="var(--crm-primary)"
          title="הכנסות לפי קורס"
          count={filteredStats.length}
          defaultOpen
        >
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
...
          {filteredStats.length === 0 && (
            <div className="text-center py-12 text-gray-400">לא נמצאו קורסים</div>
          )}
        </div>
        </RevenueAccordion>

        <CreditsAndCancellationsSection students={students} />
      </div>
    </div>
  );
}