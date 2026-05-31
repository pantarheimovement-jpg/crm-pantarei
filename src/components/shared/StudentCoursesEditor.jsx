import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X, Loader2, Tag, ChevronDown } from 'lucide-react';
import CourseCombobox from './CourseCombobox';

export default function StudentCoursesEditor({ student, onUpdated }) {
  const [courses, setCourses] = useState([]);
  const [studentCourses, setStudentCourses] = useState(student?.courses || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingStatusIdx, setEditingStatusIdx] = useState(null);

  const COURSE_STATUSES = ['ליד חדש', 'במעקב ראשוני', 'היה ביום היכרות', 'לחזור לקראת הרשמה', 'רשום', 'לא רלוונטי'];

  // סדר עדיפות סטטוסים לחישוב סטטוס כללי
  const STATUS_PRIORITY = ['רשום', 'נרשם', 'ליד חדש', 'חדש', 'לחזור לקראת הרשמה', 'במעקב ראשוני', 'היה ביום היכרות', 'הודעה מוואטסאפ לבדיקה', 'לא רלוונטי'];

  useEffect(() => {
    base44.entities.Course.list().then(data => {
      setCourses(data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setStudentCourses(student?.courses || []);
  }, [student]);

  const handleAddCourse = async () => {
    if (!newCourseId) return;
    if (studentCourses.some(c => c.course_id === newCourseId)) {
      alert('הקורס כבר קיים ברשימה');
      return;
    }
    if (studentCourses.length >= 4) {
      alert('ניתן להוסיף עד 4 קורסים');
      return;
    }

    setSaving(true);
    const updatedCourses = [
      ...studentCourses,
      {
        course_id: newCourseId,
        course_name: newCourseName,
        status: 'ליד חדש',
        registration_date: new Date().toISOString().split('T')[0]
      }
    ];

    await base44.entities.Student.update(student.id, { courses: updatedCourses });
    setStudentCourses(updatedCourses);
    setNewCourseId('');
    setNewCourseName('');
    setShowAddForm(false);
    setSaving(false);
    if (onUpdated) onUpdated();
  };

  const handleRemoveCourse = async (courseId) => {
    if (!confirm('האם להסיר קורס זה?')) return;
    setSaving(true);
    const updatedCourses = studentCourses.filter(c => c.course_id !== courseId);
    
    // חישוב סטטוס כללי מחדש
    const generalStatus = calcGeneralStatus(updatedCourses);
    
    await base44.entities.Student.update(student.id, { courses: updatedCourses, status: generalStatus });
    setStudentCourses(updatedCourses);
    setSaving(false);
    if (onUpdated) onUpdated();
  };

  const calcGeneralStatus = (coursesArr) => {
    if (!coursesArr || coursesArr.length === 0) return student?.status || 'ליד חדש';
    let bestStatus = coursesArr[0].status;
    let bestPriority = STATUS_PRIORITY.indexOf(bestStatus);
    if (bestPriority === -1) bestPriority = STATUS_PRIORITY.length;
    
    for (const c of coursesArr) {
      const idx = STATUS_PRIORITY.indexOf(c.status);
      const priority = idx === -1 ? STATUS_PRIORITY.length : idx;
      if (priority < bestPriority) {
        bestPriority = priority;
        bestStatus = c.status;
      }
    }
    return bestStatus;
  };

  const handleStatusChange = async (courseId, newStatus) => {
    setSaving(true);
    const updatedCourses = studentCourses.map(c => 
      c.course_id === courseId ? { ...c, status: newStatus } : c
    );
    
    // חישוב סטטוס כללי מחדש
    const generalStatus = calcGeneralStatus(updatedCourses);
    
    await base44.entities.Student.update(student.id, { courses: updatedCourses, status: generalStatus });
    setStudentCourses(updatedCourses);
    setEditingStatusIdx(null);
    setSaving(false);
    if (onUpdated) onUpdated();
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">קורסים ({studentCourses.length}/4)</label>
        {studentCourses.length < 4 && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs text-[var(--crm-primary)] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            הוסף קורס
          </button>
        )}
      </div>

      {studentCourses.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-400">אין קורסים משויכים</p>
      )}

      {studentCourses.map((course, idx) => (
        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">{course.course_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setEditingStatusIdx(editingStatusIdx === idx ? null : idx)}
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white bg-[#6D436D] flex items-center gap-1 hover:bg-[#5D335D] transition-colors"
                disabled={saving}
              >
                {course.status}
                <ChevronDown className="w-3 h-3" />
              </button>
              {editingStatusIdx === idx && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                  {COURSE_STATUSES.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(course.course_id, status)}
                      className={`block w-full text-right px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                        course.status === status ? 'bg-purple-50 font-bold text-[#6D436D]' : 'text-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleRemoveCourse(course.course_id)}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {showAddForm && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <CourseCombobox
            courses={courses}
            value={newCourseId}
            onChange={(id, name) => { setNewCourseId(id); setNewCourseName(name); }}
            placeholder="חפש קורס להוספה..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddCourse}
              disabled={!newCourseId || saving}
              className="flex-1 bg-[var(--crm-primary)] text-white py-2 rounded-lg text-sm font-medium hover:bg-[var(--crm-primary)]/90 disabled:bg-gray-300"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'הוסף'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewCourseId(''); setNewCourseName(''); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}