import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSystemSettings } from '../components/SystemSettingsContext';
import {
  Users, UserPlus, Calendar, CheckSquare, Search, Loader2, 
  ChevronLeft, AlertCircle, Sparkles, Award, TrendingUp
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function PipelineDashboard() {
  const { systemTexts, designSettings } = useSystemSettings();
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

  // יחס המרה
  const conversionData = useMemo(() => {
    const registered = students.filter(s => s.status === 'רשום' || s.status === 'נרשם').length;
    const leads = students.filter(s => s.status !== 'רשום' && s.status !== 'נרשם' && s.status !== 'לא רלוונטי').length;
    const total = registered + leads;
    const rate = total === 0 ? 0 : ((registered / total) * 100).toFixed(1);
    
    return {
      rate,
      registered,
      leads,
      pieData: [
        { name: 'רשומים', value: registered, color: designSettings?.primary_color || '#6D436D' },
        { name: 'לידים', value: leads, color: designSettings?.accent_color || '#D29486' }
      ]
    };
  }, [students, designSettings]);

  // משימות להיום
  const todaysTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    return tasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date).toDateString() === todayStr;
    });
  }, [tasks]);

  // קורסים עם סטטיסטיקות
  const coursesWithStats = useMemo(() => {
    const result = courses.map(course => {
      const courseStudents = students.filter(s => 
        s.course_id === course.id && 
        (s.status === 'רשום' || s.status === 'נרשם')
      );
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

    // סינון לפי סוג קורס
    if (courseTypeFilter === 'all') return result;
    return result.filter(c => c.type === courseTypeFilter);
  }, [courses, students, courseTypeFilter]);

  // קטגוריות קורסים ייחודיות
  const courseTypes = useMemo(() => {
    return [...new Set(courses.map(c => c.type).filter(Boolean))];
  }, [courses]);

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
                style={{ fontFamily: 'var(--font-body)' }}
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
                style={{ fontFamily: 'var(--font-body)' }}
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
                style={{ fontFamily: 'var(--font-body)' }}
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
                style={{ borderRadius: 'var(--crm-border-radius)', fontFamily: 'var(--font-body)' }}
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
          <Link to={createPageUrl('Students') + '?statusFilter=רשום'}>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[var(--crm-primary)] transition-all cursor-pointer group hover:-translate-y-1"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-primary)', opacity: 0.1 }}>
                  <Users size={24} style={{ color: 'var(--crm-primary)' }} />
                </div>
                {statusMetrics.registered.today > 0 && (
                  <span className="text-xs font-bold text-green-600" style={{ fontFamily: 'var(--font-body)' }}>
                    +{statusMetrics.registered.today} היום
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                {statusMetrics.registered.count}
              </h3>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
                משתתפים רשומים
              </p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-50 px-2 py-1 rounded-md" style={{ fontFamily: 'var(--font-body)' }}>
                  +{statusMetrics.registered.week} השבוע
                </span>
              </div>
            </div>
          </Link>

          {/* לידים */}
          <Link to={createPageUrl('Students') + '?statusFilter=חדש'}>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[var(--crm-accent)] transition-all cursor-pointer group hover:-translate-y-1"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-accent)', opacity: 0.1 }}>
                  <UserPlus size={24} style={{ color: 'var(--crm-accent)' }} />
                </div>
                {statusMetrics.newLeads.today > 0 && (
                  <span className="text-xs font-bold text-green-600" style={{ fontFamily: 'var(--font-body)' }}>
                    +{statusMetrics.newLeads.today} היום
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                {statusMetrics.newLeads.count}
              </h3>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
                לידים חדשים
              </p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-50 px-2 py-1 rounded-md" style={{ fontFamily: 'var(--font-body)' }}>
                  +{statusMetrics.newLeads.week} השבוע
                </span>
              </div>
            </div>
          </Link>

          {/* ניסיונות */}
          <Link to={createPageUrl('Students') + '?statusFilter=ניסיון'}>
            <div
              className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[var(--crm-action)] transition-all cursor-pointer group hover:-translate-y-1"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-action)', opacity: 0.1 }}>
                  <Sparkles size={24} style={{ color: 'var(--crm-action)' }} />
                </div>
                {statusMetrics.trial.today > 0 && (
                  <span className="text-xs font-bold text-green-600" style={{ fontFamily: 'var(--font-body)' }}>
                    +{statusMetrics.trial.today} היום
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                {statusMetrics.trial.count}
              </h3>
              <p className="text-sm font-medium text-[var(--crm-text)] opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
                שיעורי ניסיון
              </p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
                <span className="bg-gray-50 px-2 py-1 rounded-md" style={{ fontFamily: 'var(--font-body)' }}>
                  +{statusMetrics.trial.week} השבוע
                </span>
              </div>
            </div>
          </Link>

          {/* יחס המרה עם גרף */}
          <div
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            style={{ borderRadius: 'var(--crm-border-radius)' }}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                    יחס המרה
                  </p>
                  <h3 className="text-4xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                    {conversionData.rate}%
                  </h3>
                </div>
              </div>
              
              {/* גרף עוגה */}
              {conversionData.registered + conversionData.leads > 0 && (
                <div className="flex-1 flex items-center justify-center -mx-4">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={conversionData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {conversionData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          fontFamily: 'var(--font-body)', 
                          fontSize: '12px',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              <div className="text-xs text-gray-400 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                {conversionData.registered} רשומים / {conversionData.leads} לידים
              </div>
            </div>
          </div>

        </div>

        {/* טבלת קורסים + משימות */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* טבלת קורסים */}
          <div 
            className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" 
            style={{ borderRadius: 'var(--crm-border-radius)' }}
          >
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-lg text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                פעילות קורסים
              </h2>
              <Award size={20} className="text-gray-400" />
            </div>

            {/* פילטר סוג קורס */}
            {courseTypes.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/30">
                <div className="flex gap-2 overflow-x-auto">
                  <button
                    onClick={() => setCourseTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      courseTypeFilter === 'all'
                        ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    כל הסוגים
                  </button>
                  {courseTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => setCourseTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                        courseTypeFilter === type
                          ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-gray-400 font-medium bg-gray-50/50">
                  <tr>
                    <th className="p-4 font-normal" style={{ fontFamily: 'var(--font-body)' }}>שם הקורס</th>
                    <th className="p-4 font-normal" style={{ fontFamily: 'var(--font-body)' }}>סה״כ רשומים</th>
                    <th className="p-4 font-normal" style={{ fontFamily: 'var(--font-body)' }}>היום</th>
                    <th className="p-4 font-normal" style={{ fontFamily: 'var(--font-body)' }}>השבוע</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coursesWithStats.map(course => (
                    <tr
                      key={course.id}
                      onClick={() => window.location.href = `${createPageUrl('Students')}?courseFilter=${course.id}`}
                      className="hover:bg-[var(--crm-primary)] hover:bg-opacity-5 transition-colors cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-body)' }}>
                            {course.name}
                          </span>
                          {course.type && (
                            <span className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                              {course.type}
                            </span>
                          )}
                        </div>
                        {course.fillPercent >= 90 && (
                          <span className="inline-block mt-1 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            {course.fillPercent}% מלא
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold"
                          style={{ 
                            backgroundColor: 'var(--crm-primary)', 
                            opacity: 0.1, 
                            color: 'var(--crm-primary)',
                            fontFamily: 'var(--font-body)'
                          }}
                        >
                          {course.studentsCount}
                          {course.max_students && ` / ${course.max_students}`}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500" style={{ fontFamily: 'var(--font-body)' }}>
                        {course.newToday > 0 ? (
                          <span className="text-green-600 font-bold">+{course.newToday}</span>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-gray-500" style={{ fontFamily: 'var(--font-body)' }}>
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
                      <td colSpan="5" className="p-8 text-center text-gray-400" style={{ fontFamily: 'var(--font-body)' }}>
                        לא נמצאו קורסים
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* משימות להיום */}
          <div 
            className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" 
            style={{ borderRadius: 'var(--crm-border-radius)' }}
          >
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-gray-400" />
                <h2 className="font-bold text-lg text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                  משימות להיום
                </h2>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ 
                  backgroundColor: 'var(--crm-accent)', 
                  opacity: 0.2, 
                  color: 'var(--crm-accent)',
                  fontFamily: 'var(--font-body)'
                }}
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
                      style={{ borderRadius: 'var(--crm-border-radius)' }}
                    >
                      <div
                        className={`mt-1.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                          task.status === 'הושלם' 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300 group-hover:border-[var(--crm-primary)]'
                        }`}
                      />
                      <div className="flex-grow">
                        <p 
                          className={`text-sm font-medium ${task.status === 'הושלם' ? 'text-gray-400 line-through' : 'text-[var(--crm-text)]'}`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {task.description}
                        </p>
                        {task.organization_name && (
                          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                            {task.organization_name}
                          </p>
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
                  <p className="text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                    אין משימות פתוחות להיום
                  </p>
                  <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                    נראה שהכל בשליטה!
                  </p>
                </div>
              )}
            </div>

            <Link to={createPageUrl('Tasks')}>
              <button
                className="w-full p-4 text-center text-sm font-medium border-t border-gray-50 hover:bg-gray-50 transition-colors rounded-b-2xl"
                style={{ color: 'var(--crm-primary)', fontFamily: 'var(--font-body)' }}
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