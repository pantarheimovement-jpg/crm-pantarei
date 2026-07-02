import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldX } from 'lucide-react';
import CourseHeader from '../components/course/CourseHeader';
import StudentsList from '../components/course/StudentsList';
import AttendanceManager from '../components/course/AttendanceManager';
import NanaSummerBreakdown from '../components/course/NanaSummerBreakdown';
import CollapsibleSection from '../components/course/CollapsibleSection';

export default function CourseView() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [leadStudents, setLeadStudents] = useState([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, [courseId]);

  const checkAccessAndLoad = async () => {
    setLoading(true);
    setAccessDenied(false);

    // Get current user and course data
    const [user, allCourses] = await Promise.all([
      base44.auth.me(),
      base44.entities.Course.list()
    ]);

    const courseData = allCourses.find(c => c.id === courseId);

    if (!courseData) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // Check access: admin OR teacher_email matches
    const userIsAdmin = user?.role === 'admin';
    setIsAdmin(userIsAdmin);

    if (!userIsAdmin) {
      if (!courseData.teacher_email || user?.email !== courseData.teacher_email) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
    }

    setCourse(courseData);

    // Load ALL students with pagination
    let allStudents = [];
    let page = 0;
    const pageSize = 100;
    while (true) {
      const batch = await base44.entities.Student.list('-created_date', pageSize, page * pageSize);
      if (!batch || batch.length === 0) break;
      allStudents = allStudents.concat(batch);
      if (batch.length < pageSize) break;
      page++;
      await new Promise(r => setTimeout(r, 300));
    }
    let registered = [];
    let leadStudentsList = [];
    let leads = 0;

    (allStudents || []).forEach(student => {
      let isLinked = false;
      let courseStatus = null;

      if (student.courses && Array.isArray(student.courses)) {
        const entry = student.courses.find(c => c.course_id === courseId);
        if (entry) {
          isLinked = true;
          courseStatus = entry.status;
        }
      } else if (student.course_id === courseId) {
        isLinked = true;
        courseStatus = student.status;
      }

      if (isLinked) {
        if (courseStatus === 'נרשם' || courseStatus === 'רשום') {
          registered.push({ ...student, courseStatus });
        } else if (courseStatus !== 'לא רלוונטי') {
          leadStudentsList.push({ ...student, courseStatus });
          leads++;
        }
      }
    });

    setRegisteredStudents(registered);
    setLeadStudents(leadStudentsList);
    setLeadsCount(leads);
    setLoading(false);
  };

  const STATUS_PRIORITY = ['רשום', 'נרשם', 'ליד חדש', 'חדש', 'לחזור לקראת הרשמה', 'במעקב ראשוני', 'היה ביום היכרות', 'הודעה מוואטסאפ לבדיקה', 'לא רלוונטי'];

  const handleCancelRegistration = async (student) => {
    if (!confirm(`לבטל את הרישום של ${student.full_name} לקורס "${course.name}"?\nהסטטוס בקורס ישתנה ל"לא רלוונטי" והיא תוסר מקבוצת הרשומים ברשימת התפוצה.`)) return;

    // עדכון סטטוס הקורס במערך הקורסים
    let updatedCourses;
    if (student.courses && student.courses.length > 0) {
      updatedCourses = student.courses.map(c =>
        c.course_id === courseId ? { ...c, status: 'לא רלוונטי' } : c
      );
    } else {
      updatedCourses = [{ course_id: courseId, course_name: course.name, status: 'לא רלוונטי' }];
    }

    // חישוב סטטוס כללי מחדש לפי שאר הקורסים
    let generalStatus = 'לא רלוונטי';
    let best = STATUS_PRIORITY.length;
    for (const c of updatedCourses) {
      const idx = STATUS_PRIORITY.indexOf(c.status);
      const p = idx === -1 ? STATUS_PRIORITY.length : idx;
      if (p < best) { best = p; generalStatus = c.status; }
    }

    await base44.entities.Student.update(student.id, { courses: updatedCourses, status: generalStatus });

    // הסרה מקבוצת "רשומים" ברשימת התפוצה
    if (student.email) {
      const subs = await base44.entities.Subscribers.filter({ email: student.email.toLowerCase().trim() });
      const sub = subs?.[0];
      if (sub) {
        const groups = (sub.groups || []).filter(g => g !== `${course.name} - רשומים`);
        await base44.entities.Subscribers.update(sub.id, { groups });
      }
    }

    // עדכון מונה המשתתפים בקורס
    await base44.entities.Course.update(courseId, {
      current_students: Math.max(0, (course.current_students || 0) - 1)
    });

    await checkAccessAndLoad();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--crm-primary)]" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
        <ShieldX className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">גישה נדחתה</h1>
        <p className="text-gray-500 max-w-md">
          אין לך הרשאה לצפות בקורס זה. 
          אם את מורה בקורס, בקשי מהאדמין לשייך את כתובת המייל שלך לקורס.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <CourseHeader 
          course={course} 
          registeredCount={registeredStudents.length}
          leadsCount={leadsCount}
        />

        {course?.name === 'סמסטר קיץ נענע' && (
          <CollapsibleSection title="סיכום רשומים לפי אפשרות">
            <NanaSummerBreakdown students={registeredStudents} />
          </CollapsibleSection>
        )}

        <CollapsibleSection title="מעקב נוכחות">
          <AttendanceManager 
            courseId={courseId} 
            students={registeredStudents} 
          />
        </CollapsibleSection>

        <CollapsibleSection title="משתתפים רשומים" badge={registeredStudents.length}>
          <StudentsList 
            students={registeredStudents}
            title="משתתפים רשומים"
            onCancelRegistration={isAdmin ? handleCancelRegistration : undefined}
          />
        </CollapsibleSection>

        {leadStudents.length > 0 && (
          <CollapsibleSection title="לידים משויכים" badge={leadStudents.length}>
            <StudentsList 
              students={leadStudents}
              title="לידים משויכים"
            />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}