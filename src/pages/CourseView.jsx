import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldX } from 'lucide-react';
import CourseHeader from '../components/course/CourseHeader';
import StudentsList from '../components/course/StudentsList';
import AttendanceManager from '../components/course/AttendanceManager';

export default function CourseView() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [registeredStudents, setRegisteredStudents] = useState([]);
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

    // Load students linked to this course
    const allStudents = await base44.entities.Student.list();
    let registered = [];
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
        } else {
          leads++;
        }
      }
    });

    setRegisteredStudents(registered);
    setLeadsCount(leads);
    setLoading(false);
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

        <AttendanceManager 
          courseId={courseId} 
          students={registeredStudents} 
        />

        <StudentsList 
          students={registeredStudents}
          title="משתתפים רשומים"
        />
      </div>
    </div>
  );
}