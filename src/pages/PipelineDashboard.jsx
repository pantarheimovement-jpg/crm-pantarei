import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSystemSettings } from '../components/SystemSettingsContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Users, UserPlus, Calendar, TrendingUp, CheckSquare, 
  Search, Loader2, ChevronLeft, AlertCircle, Sparkles, Award, Filter
} from 'lucide-react';

export default function PipelineDashboard() {
  const { systemTexts, leadStatuses, designSettings } = useSystemSettings();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, coursesData, tasksData] = await Promise.all([
        base44.entities.Student.list('-created_date'),
        base44.entities.Course.list('-created_date'),
        base44.entities.Task.list('-due_date')
      ]);
      setStudents(studentsData || []);
      setCourses(coursesData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // תאריכים
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const isThisWeek = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return d >= weekStart;
  };

  // סינון משתתפים לפי פילטר תאריכים
  const filteredStudents = useMemo(() => {
    if (dateFilter === 'all') return students;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return students.filter(s => {
      if (!s.registration_date && !s.created_date) return false;
      const dateToCheck = new Date(s.registration_date || s.created_date);
      return dateToCheck >= monthStart;
    });
  }, [students, dateFilter]);

  // מדדי סטטוסים
  const statusMetrics = useMemo(() => {
    const getStats = (statusName) => {
      const all = students.filter(s => s.status === statusName);
      return {
        count: all.length,
        today: all.filter(s => isToday(s.registration_date || s.created_date)).length,
        week: all.filter(s => isThisWeek(s.registration_date || s.created_date)).length
      };
    };

    return {
      registered: getStats('רשום'),
      newLeads: getStats('חדש'),
      trial: getStats('ניסיון')
    };
  }, [students]);

  // יחס המרה + נתונים לגרף
  const conversionData = useMemo(() => {
    const registered = students.filter(s => s.status === 'רשום').length;
    const leads = students.filter(s => s.status !== 'רשום' && s.status !== 'לא רלוונטי').length;
    const total = registered + leads;
    const rate = total === 0 ? 0 : ((registered / total) * 100).toFixed(1);

    return {
      rate,
      chartData: [
        { name: 'נרשמו', value: registered, color: 'var(--crm-primary)' },
        { name: 'בתהליך', value: leads, color: 'var(--crm-accent)' }
      ]
    };
  }, [students]);

  // משימות להיום
  const todaysTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    return tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date).toDateString() === todayStr;
    });
  }, [tasks]);

  // סוגי קורסים ייחודיים
  const courseTypes = useMemo(() => {
    const types = [...new Set(courses.map(c => c.type).filter(Boolean))];
    return types;
  }, [courses]);

  // קורסים עם סטטיסטיקות + פילטר לפי סוג
  const coursesWithStats = useMemo(() => {
    let filteredCourses = courses;
    
    if (courseTypeFilter !== 'all') {
      filteredCourses = courses.filter(c => c.type === courseTypeFilter);
    }

    return filteredCourses.map(course => {
      const courseStudents = students.filter(s => s.course_id === course.id && (s.status === 'רשום' || s.status === 'נרשם'));
      const newToday = courseStudents.filter(s => isToday(s.registration_date || s.created_date)).length;
      const newWeek = courseStudents.filter(s => isThisWeek(s.registration_date || s.created_date)).length;
      
      return {
        ...course,
        studentsCount: courseStudents.length,
        newToday,
        newWeek,
        fillPercent: course.max_students ? Math.round((courseStudents.length / course.max_students) * 100) : 0
      };
    });
  }, [courses, students, courseTypeFilter]);

  // התראות
  const alerts = useMemo(() => {
    const result = [];
    
    coursesWithStats.forEach(course => {
      if (course.max_students && course.fillPercent >= 90) {
        result.push({
          type: 'warning',
          message: `הקורס "${course.name}" מתמלא (${course.fillPercent}%)`
        });
      }
      
      if (course.start_date) {
        const daysUntil = Math.ceil((new Date(course.start_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0 && daysUntil <= 7) {
          result.push({
            type: 'info',
            message: `"${course.name}" מתחיל בעוד ${daysUntil} ימים`
          });
        }
      }
    });

    return result;
  }, [coursesWithStats]);

  // חיפוש
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      window.location.href = `${createPageUrl('Students')}?search=${encodeURIComponent(searchTerm)}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--crm-bg)]">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--crm-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--crm-bg)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[var(--crm-text)] mb-2" style={{ fontFamily: 'var(--font-headings)' }}>
              דשבורד סטודיו
            </h1>
            <p className="text-sm text-[var(--crm-text)] opacity-70">
              מבט מהיר על פעילות הסטודיו
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* חיפוש */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש משתתף..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full md:w-64 bg-white border border-gray-200 rounded-full py-2 px-4 pr-10 text-sm focus:outline-none focus:border-[var(--crm-primary)] transition-colors"
              />
            </div>

            {/* פילטר תאריכים */}
            <div className="bg-white p-1 rounded-full border border-gray-200 flex text-sm">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  dateFilter === 'all' 
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)] font-bold' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                הכל
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  dateFilter === 'month' 
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)] font-bold' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                החודש
              </button>
            </div>
          </div>
        </div>

        {/* התראות */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-4 rounded-xl ${
                  alert.type === 'warning' 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}
                style={{ borderRadius: 'var(--crm-border-radius)' }}
              >
                <AlertCircle className={`w-5 h-5 ${alert.type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${alert.type === 'warning' ? 'text-orange-800' : 'text-blue-800'}`}>
                  {alert.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* כרטיסי מדדים */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* רשומים */}
          <Link to={createPageUrl('Students') + '?status=רשום'}>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[var(--crm-primary)] transition-all cursor-pointer group hover:-translate-y-1"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-primary)', opacity: 0.1 }}>
                  <Users size={24} style={{ color: 'var(--crm-primary)' }} />
                </div>
                {statusMetrics.registered.today > 0 && (
                  <span className="text-xs font-bold text-green-600">+{statusMetrics.registered.today} היום</span>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)]">{statusMetrics.registered.count}</h3>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">משתתפים רשומים</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-50 px-2 py-1 rounded-md">+{statusMetrics.registered.week} השבוע</span>
              </div>
            </div>
          </Link>

          {/* לידים */}
          <Link to={createPageUrl('Students') + '?status=חדש'}>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[var(--crm-accent)] transition-all cursor-pointer group hover:-translate-y-1"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-accent)', opacity: 0.1 }}>
                  <UserPlus size={24} style={{ color: 'var(--crm-accent)' }} />
                </div>
                {statusMetrics.newLeads.today > 0 && (
                  <span className="text-xs font-bold text-green-600">+{statusMetrics.newLeads.today} היום</span>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)]">{statusMetrics.newLeads.count}</h3>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">לידים חדשים</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-50 px-2 py-1 rounded-md">+{statusMetrics.newLeads.week} השבוע</span>
              </div>
            </div>
          </Link>

          {/* ניסיונות */}
          <Link to={createPageUrl('Students') + '?status=ניסיון'}>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[var(--crm-action)] transition-all cursor-pointer group hover:-translate-y-1"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-action)', opacity: 0.1 }}>
                  <Sparkles size={24} style={{ color: 'var(--crm-action)' }} />
                </div>
                {statusMetrics.trial.today > 0 && (
                  <span className="text-xs font-bold text-green-600">+{statusMetrics.trial.today} היום</span>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)]">{statusMetrics.trial.count}</h3>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70">שיעורי ניסיון</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-50 px-2 py-1 rounded-md">+{statusMetrics.trial.week} השבוע</span>
              </div>
            </div>
          </Link>

          {/* יחס המרה עם גרף */}
          <div
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between"
            style={{ borderRadius: 'var(--crm-border-radius)' }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">יחס המרה</p>
                <h3 className="text-4xl font-bold text-[var(--crm-text)]">{conversionData.rate}%</h3>
              </div>
            </div>
            
            {/* גרף עוגה קטן */}
            <div className="h-24 -mx-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionData.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {conversionData.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <p className="text-xs text-gray-400 mt-2">לידים שהפכו ללקוחות</p>
          </div>

        </div>

        {/* טבלת קורסים + משימות */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* טבלת קורסים */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="p-6 border-b border-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-[var(--crm-text)]">פעילות קורסים</h2>
                <Award size={20} className="text-gray-400" />
              </div>
              
              {/* פילטר קטגוריות */}
              {courseTypes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter size={14} className="text-gray-400" />
                  <button
                    onClick={() => setCourseTypeFilter('all')}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      courseTypeFilter === 'all'
                        ? 'bg-[var(--crm-primary)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    הכל
                  </button>
                  {courseTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setCourseTypeFilter(type)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        courseTypeFilter === type
                          ? 'bg-[var(--crm-primary)] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-gray-400 font-medium bg-gray-50/50">
                  <tr>
                    <th className="p-4 font-normal">שם הקורס</th>
                    <th className="p-4 font-normal">סה״כ רשומים</th>
                    <th className="p-4 font-normal">היום</th>
                    <th className="p-4 font-normal">השבוע</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coursesWithStats.map(course => (
                    <tr
                      key={course.id}
                      onClick={() => window.location.href = `${createPageUrl('Students')}?course=${course.id}`}
                      className="hover:bg-[var(--crm-primary)] hover:bg-opacity-5 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 font-semibold text-[var(--crm-text)]">
                        {course.name}
                        {course.fillPercent >= 90 && (
                          <span className="mr-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                            {course.fillPercent}% מלא
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold"
                          style={{ backgroundColor: 'var(--crm-primary)', opacity: 0.1, color: 'var(--crm-primary)' }}
                        >
                          {course.studentsCount}
                          {course.max_students && ` / ${course.max_students}`}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">
                        {course.newToday > 0 ? (
                          <span className="text-green-600 font-bold">+{course.newToday}</span>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-gray-500">
                        {course.newWeek > 0 ? `+${course.newWeek}` : '-'}
                      </td>
                      <td className="p-4 text-left">
                        <ChevronLeft
                          size={16}
                          className="text-gray-300 group-hover:text-[var(--crm-primary)] transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
                  {coursesWithStats.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400">
                        לא נמצאו קורסים
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* משימות להיום */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-gray-400" />
                <h2 className="font-bold text-lg text-[var(--crm-text)]">משימות להיום</h2>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: 'var(--crm-accent)', opacity: 0.2, color: 'var(--crm-accent)' }}
              >
                {todaysTasks.length}
              </span>
            </div>

            <div className="p-4 flex-grow overflow-y-auto max-h-[400px]">
              {todaysTasks.length > 0 ? (
                <div className="space-y-3">
                  {todaysTasks.map(task => (
                    <div
                      key={task.id}
                      className="group p-3 border border-gray-100 rounded-xl hover:shadow-md hover:border-[var(--crm-primary)] transition-all bg-white flex items-start gap-3"
                    >
                      <div
                        className={`mt-1.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                          task.status === 'הושלם' 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300 group-hover:border-[var(--crm-primary)]'
                        }`}
                      />
                      <div className="flex-grow">
                        <p className={`text-sm font-medium ${task.status === 'הושלם' ? 'text-gray-400 line-through' : 'text-[var(--crm-text)]'}`}>
                          {task.description}
                        </p>
                        {task.organization_name && (
                          <p className="text-xs text-gray-400 mt-1">{task.organization_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center">
                  <div className="p-4 bg-gray-50 rounded-full mb-3">
                    <CheckSquare size={24} className="text-gray-300" />
                  </div>
                  <p className="text-sm">אין משימות פתוחות להיום</p>
                  <p className="text-xs text-gray-400 mt-1">נראה שהכל בשליטה!</p>
                </div>
              )}
            </div>

            <Link to={createPageUrl('Tasks')}>
              <button
                className="w-full p-4 text-center text-sm font-medium border-t border-gray-50 hover:bg-gray-50 transition-colors rounded-b-2xl"
                style={{ color: 'var(--crm-primary)' }}
              >
                לכל המשימות ({tasks.length})
              </button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}