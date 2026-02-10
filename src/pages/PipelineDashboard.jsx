import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSystemSettings } from '../components/SystemSettingsContext';
import { Button } from '@/components/ui/button';
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
  const [introTasks, setIntroTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState('all');

  useEffect(() => {
    loadData();

    // רענון אוטומטי כשהדף חוזר להיות visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    // רענון כשחוזרים לדף מדף אחר באפליקציה
    const handleFocus = () => {
      loadData();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, coursesData, tasksData, introTasksData] = await Promise.all([
        base44.entities.Student.list('-created_date'),
        base44.entities.Course.list('-created_date'),
        base44.entities.Task.list('-scheduled_date'),
        base44.entities.Task.filter({ name: "שיחת היכרות" }, '-scheduled_date')
      ]);
      setStudents(studentsData || []);
      setCourses(coursesData || []);
      setTasks(tasksData || []);
      
      const relevantIntroTasks = (introTasksData || []).filter(t => t.status !== "הושלם" && t.status !== "אבוד");
      setIntroTasks(relevantIntroTasks);
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
    
    let startDate;
    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return students.filter(s => {
      if (!s.registration_date && !s.created_date) return false;
      const dateToCheck = new Date(s.registration_date || s.created_date);
      return dateToCheck >= startDate;
    });
  }, [students, dateFilter]);

  // מדדי סטטוסים - תומך במערך courses
  const statusMetrics = useMemo(() => {
    const getStats = (statusName) => {
      let all;
      if (statusName === 'חדש') {
        // ליד חדש: סטודנטים שיש להם קורס אחד לפחות עם סטטוס "חדש" במערך courses
        all = filteredStudents.filter(s => {
          if (s.courses && s.courses.length > 0) {
            return s.courses.some(c => c.status === 'חדש' || c.status === 'ליד חדש');
          }
          return s.status === 'חדש' || s.status === 'ליד חדש';
        });
      } else {
        all = filteredStudents.filter(s => s.status === statusName);
      }
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
  }, [filteredStudents]);

  // יחס המרה + נתונים לגרף - חישוב ספציפי לקורס
  const conversionData = useMemo(() => {
    let convertedCount = 0;
    let leadsCount = 0;
    
    filteredStudents.forEach(student => {
      if (student.courses && student.courses.length > 0) {
        student.courses.forEach(course => {
          // בדיקה אם הסטודנט היה ליד באותו קורס והפך לרשום
          if (course.status === 'רשום' || course.status === 'נרשם') {
            convertedCount++;
          } else if (course.status === 'חדש' || course.status === 'ליד חדש' || course.status === 'ניסיון') {
            leadsCount++;
          }
        });
      } else {
        // fallback למבנה ישן
        if (student.status === 'רשום' || student.status === 'נרשם') {
          convertedCount++;
        } else if (student.status !== 'לא רלוונטי') {
          leadsCount++;
        }
      }
    });
    
    const total = convertedCount + leadsCount;
    const rate = total === 0 ? 0 : ((convertedCount / total) * 100).toFixed(1);

    return {
      rate,
      chartData: [
        { name: 'נרשמו', value: convertedCount, color: 'var(--crm-primary)' },
        { name: 'בתהליך', value: leadsCount, color: 'var(--crm-accent)' }
      ]
    };
  }, [filteredStudents]);

  // משימות להיום
  const todaysTasks = useMemo(() => {
    const todayStr = new Date().toDateString();
    return tasks.filter(t => {
      if (!t.scheduled_date) return false;
      return new Date(t.scheduled_date).toDateString() === todayStr && t.status !== 'הושלם' && t.status !== 'אבוד';
    });
  }, [tasks]);

  // סוגי קורסים ייחודיים
  const courseTypes = useMemo(() => {
    const types = [...new Set(courses.map(c => c.type).filter(Boolean))];
    return types;
  }, [courses]);

  // קורסים עם סטטיסטיקות + פילטר לפי סוג - חישוב דינמי עם תמיכה במערך courses
  const coursesWithStats = useMemo(() => {
    let filteredCourses = courses;
    
    if (courseTypeFilter !== 'all') {
      filteredCourses = courses.filter(c => c.type === courseTypeFilter);
    }

    return filteredCourses.map(course => {
      // חישוב דינמי של סטודנטים רשומים - תמיכה במערך courses
      const registeredStudents = students.filter(student => {
        // בדיקה במערך courses
        if (student.courses && Array.isArray(student.courses)) {
          const courseEntry = student.courses.find(c => c.course_id === course.id);
          return courseEntry && (courseEntry.status === 'רשום' || courseEntry.status === 'נרשם');
        }
        // fallback למבנה ישן
        return student.course_id === course.id && (student.status === 'רשום' || student.status === 'נרשם');
      });
      
      const newToday = registeredStudents.filter(s => isToday(s.registration_date || s.created_date)).length;
      const newWeek = registeredStudents.filter(s => isThisWeek(s.registration_date || s.created_date)).length;
      
      return {
        ...course,
        studentsCount: registeredStudents.length,
        newToday,
        newWeek,
        fillPercent: course.max_students ? Math.round((registeredStudents.length / course.max_students) * 100) : 0
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
    if (e && e.key === 'Enter' && searchTerm.trim()) {
      window.location.href = `${createPageUrl('Students')}?search=${encodeURIComponent(searchTerm)}`;
    }
  };
  
  const handleSearchClick = () => {
    if (searchTerm.trim()) {
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
            {/* חיפוש משופר */}
            <div className="relative flex-1 md:flex-initial flex gap-2">
              <div className="relative flex-1">
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
              <button
                onClick={handleSearchClick}
                className="bg-[var(--crm-primary)] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[var(--crm-primary)]/90 transition-colors"
              >
                חפש
              </button>
            </div>

            {/* פילטר תאריכים מורחב */}
            <div className="bg-white p-1 rounded-full border border-gray-200 flex text-xs">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  dateFilter === 'all' 
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)] font-bold' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                הכל
              </button>
              <button
                onClick={() => setDateFilter('today')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  dateFilter === 'today' 
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)] font-bold' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                היום
              </button>
              <button
                onClick={() => setDateFilter('week')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  dateFilter === 'week' 
                    ? 'bg-[var(--crm-action)] text-[var(--crm-text)] font-bold' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                השבוע
              </button>
              <button
                onClick={() => setDateFilter('month')}
                className={`px-3 py-1.5 rounded-full transition-all ${
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

        {/* התראת שיחות היכרות */}
        {introTasks.length > 0 && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 mb-6 rounded-l-xl flex justify-between items-center shadow-sm">
            <div>
              <h3 className="font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                שיחות היכרות פתוחות ({introTasks.length})
              </h3>
              <p className="text-sm text-red-600 mt-1">
                {introTasks.filter(t => t.scheduled_date && new Date(t.scheduled_date) <= new Date()).length > 0 
                  ? `⚠️ יש ${introTasks.filter(t => t.scheduled_date && new Date(t.scheduled_date) <= new Date()).length} שיחות שעבר התאריך המתוזמן!`
                  : 'יש לבצע שיחות היכרות ללידים חדשים'}
              </p>
            </div>
            <Link to={createPageUrl('Tasks')}>
              <Button
                className="bg-red-500 text-white hover:bg-red-600"
                style={{ borderRadius: 'var(--crm-button-radius)' }}
              >
                צפה במשימות
              </Button>
            </Link>
          </div>
        )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* רשומים */}
          <div
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            style={{ borderRadius: 'var(--crm-border-radius)' }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-primary)' }}>
                <Users size={24} style={{ color: 'white' }} />
              </div>
            </div>
            <Link to={createPageUrl('Students') + '?status=רשום'}>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)] cursor-pointer hover:text-[var(--crm-primary)] transition-colors">
                {statusMetrics.registered.count}
              </h3>
            </Link>
            <p className="text-sm font-medium text-[var(--crm-text)] opacity-70 mb-4">משתתפים רשומים</p>
            <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-xs flex-wrap">
              <Link to={createPageUrl('Students') + '?status=רשום&date=today'}>
                <span className="bg-[#6D436D] text-white px-2.5 py-1 rounded-md font-medium cursor-pointer hover:bg-[#5D335D] transition-colors">
                  +{statusMetrics.registered.today} היום
                </span>
              </Link>
              <Link to={createPageUrl('Students') + '?status=רשום&date=week'}>
                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                  +{statusMetrics.registered.week} השבוע
                </span>
              </Link>
            </div>
          </div>

          {/* לידים */}
          <div
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            style={{ borderRadius: 'var(--crm-border-radius)' }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--crm-accent)' }}>
                <UserPlus size={24} style={{ color: 'white' }} />
              </div>
            </div>
            <Link to={createPageUrl('Students') + '?status=חדש'}>
              <h3 className="text-3xl font-bold mb-1 text-[var(--crm-text)] cursor-pointer hover:text-[var(--crm-accent)] transition-colors">
                {statusMetrics.newLeads.count}
              </h3>
            </Link>
            <p className="text-sm font-medium text-[var(--crm-text)] opacity-70 mb-4">לידים חדשים</p>
            <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-xs flex-wrap">
              <Link to={createPageUrl('Students') + '?status=חדש&date=today'}>
                <span className="bg-[#E5C0B0] text-white px-2.5 py-1 rounded-md font-medium cursor-pointer hover:bg-[#D5B0A0] transition-colors">
                  +{statusMetrics.newLeads.today} היום
                </span>
              </Link>
              <Link to={createPageUrl('Students') + '?status=חדש&date=week'}>
                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-medium cursor-pointer hover:bg-gray-200 transition-colors">
                  +{statusMetrics.newLeads.week} השבוע
                </span>
              </Link>
            </div>
          </div>

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
            
            <p className="text-xs text-gray-400 mt-2">
              {conversionData.chartData[0].value} נרשמו מתוך {conversionData.chartData[0].value + conversionData.chartData[1].value}
            </p>
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
                      onClick={() => window.location.href = createPageUrl('Courses') + '?course=' + course.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
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
                          className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold text-white"
                          style={{ backgroundColor: 'var(--crm-primary)' }}
                        >
                          {course.studentsCount}
                          {course.max_students && ` / ${course.max_students}`}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">
                        {course.newToday > 0 ? (
                          <span className="text-[#6D436D] font-bold">+{course.newToday}</span>
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

          {/* שיחות */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-gray-400" />
                <h2 className="font-bold text-base text-[var(--crm-text)]">שיחות</h2>
              </div>
              <Link
                to={createPageUrl('Tasks')}
                className="text-xs text-[var(--crm-primary)] hover:underline"
              >
                כל השיחות
              </Link>
            </div>

            <div className="p-4 flex-grow overflow-y-auto max-h-[380px] space-y-4">
              {/* שיחות להיום */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-600">שיחות להיום</h4>
                  <Link
                    to={createPageUrl('Tasks') + '?date=today'}
                    className="text-xs text-[var(--crm-primary)] hover:underline"
                  >
                    צפה
                  </Link>
                </div>
                {todaysTasks.length === 0 ? (
                  <p className="text-xs text-gray-400">אין שיחות להיום</p>
                ) : (
                  <div className="space-y-2">
                    {todaysTasks.slice(0, 2).map(task => (
                      <div key={task.id} className="p-2 bg-gray-50 rounded-lg text-xs">
                        <p className="font-medium text-[var(--crm-text)]">{task.name}</p>
                        {task.student_name && <p className="text-gray-500">{task.student_name}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* שיחות מתוזמנות */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-600">שיחות מתוזמנות</h4>
                  <Link
                    to={createPageUrl('Tasks') + '?status=בבדיקה'}
                    className="text-xs text-[var(--crm-primary)] hover:underline"
                  >
                    צפה
                  </Link>
                </div>
                {tasks.filter(t => t.scheduled_date && t.status !== 'הושלם').length === 0 ? (
                  <p className="text-xs text-gray-400">אין שיחות מתוזמנות</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => t.scheduled_date && t.status !== 'הושלם').slice(0, 2).map(task => (
                      <div key={task.id} className="p-2 bg-gray-50 rounded-lg text-xs flex justify-between">
                        <span className="font-medium text-[var(--crm-text)]">{task.student_name || task.name}</span>
                        <span className="text-gray-500">{new Date(task.scheduled_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* שיחות היכרות ללידים חדשים */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-600">שיחות היכרות ללידים חדשים</h4>
                  <Link
                    to={createPageUrl('Tasks') + '?search=שיחת היכרות'}
                    className="text-xs text-[var(--crm-primary)] hover:underline"
                  >
                    צפה
                  </Link>
                </div>
                {tasks.filter(t => t.name?.includes('שיחת היכרות') && t.status !== 'הושלם' && t.status !== 'אבוד').length === 0 ? (
                  <p className="text-xs text-gray-400">אין שיחות היכרות</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => t.name?.includes('שיחת היכרות') && t.status !== 'הושלם' && t.status !== 'אבוד').slice(0, 3).map(task => (
                      <div key={task.id} className="p-2 bg-gray-50 rounded-lg text-xs flex justify-between items-center">
                        <div className="flex-1">
                          <span className="font-medium text-[var(--crm-text)] block">{task.student_name || 'ללא שם'}</span>
                          {task.scheduled_date && (
                            <span className="text-gray-400 text-xs">
                              {new Date(task.scheduled_date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}