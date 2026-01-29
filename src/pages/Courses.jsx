import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useSystemSettings } from '../components/SystemSettingsContext';
import { GraduationCap, Plus, Search, Edit, Trash2, X, Loader2, Users, Calendar, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Courses() {
  const { systemTexts } = useSystemSettings();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'קורס קבוע',
    description: '',
    schedule: '',
    location: '',
    price: '',
    max_students: '',
    current_students: 0,
    start_date: '',
    end_date: '',
    status: 'פתוח להרשמה',
    image_url: ''
  });

  useEffect(() => {
    loadCourses();
  }, []);

  // גלילה והדגשת קורס ספציפי מה-URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('course');
    if (courseId && courses.length > 0) {
      const courseElement = document.getElementById(`course-${courseId}`);
      if (courseElement) {
        courseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        courseElement.classList.add('ring-4', 'ring-[var(--crm-primary)]', 'ring-opacity-50');
        setTimeout(() => {
          courseElement.classList.remove('ring-4', 'ring-[var(--crm-primary)]', 'ring-opacity-50');
        }, 2000);
      }
    }
  }, [courses]);

  const loadCourses = async () => {
    try {
      const [coursesData, studentsData] = await Promise.all([
        base44.entities.Course.list('-created_date'),
        base44.entities.Student.list()
      ]);
      
      // חישוב דינמי של מספר המשתתפים הרשומים בכל קורס
      const coursesWithCounts = (coursesData || []).map(course => {
        let registeredCount = 0;
        
        (studentsData || []).forEach(student => {
          // בדיקה במערך courses
          if (student.courses && Array.isArray(student.courses)) {
            const courseEntry = student.courses.find(c => c.course_id === course.id);
            if (courseEntry && (courseEntry.status === 'נרשם' || courseEntry.status === 'רשום')) {
              registeredCount++;
            }
          } 
          // fallback למבנה ישן
          else if (student.course_id === course.id && (student.status === 'נרשם' || student.status === 'רשום')) {
            registeredCount++;
          }
        });
        
        return {
          ...course,
          current_students: registeredCount
        };
      });
      
      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingCourse) {
        await base44.entities.Course.update(editingCourse.id, formData);
      } else {
        await base44.entities.Course.create(formData);
      }
      await loadCourses();
      closeModal();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('שגיאה בשמירת הקורס');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק קורס זה?')) return;
    try {
      await base44.entities.Course.delete(id);
      await loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('שגיאה במחיקת הקורס');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`האם למחוק ${selectedIds.length} קורסים?`)) return;
    
    try {
      for (const id of selectedIds) {
        await base44.entities.Course.delete(id);
      }
      setSelectedIds([]);
      await loadCourses();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('שגיאה במחיקה');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCourses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCourses.map(c => c.id));
    }
  };

  const openModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData(course);
    } else {
      setEditingCourse(null);
      setFormData({
        name: '',
        type: 'קורס קבוע',
        description: '',
        schedule: '',
        location: '',
        price: '',
        max_students: '',
        current_students: 0,
        start_date: '',
        end_date: '',
        status: 'פתוח להרשמה',
        image_url: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
  };

  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      'פתוח להרשמה': '#297058',
      'מלא': '#D29486',
      'בתהליך': '#FAD980',
      'הסתיים': '#9E9E9E'
    };
    return colors[status] || '#6D436D';
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                {systemTexts?.entity_course_plural || 'קורסים'}
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">
                ניהול {systemTexts?.entity_course_plural || 'קורסים'} וסדנאות
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-50"
                style={{ borderRadius: 'var(--crm-button-radius)' }}
              >
                <Trash2 className="w-5 h-5 mr-2" />
                מחק {selectedIds.length}
              </Button>
            )}
            <Button
              onClick={() => openModal()}
              className="bg-[var(--crm-action)] text-[var(--crm-text)] hover:bg-[var(--crm-action)]/90"
              style={{ borderRadius: 'var(--crm-button-radius)' }}
            >
              <Plus className="w-5 h-5 mr-2" />
              {systemTexts?.entity_course_singular || 'קורס'} חדש
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <div className="flex gap-4 items-center">
            {filteredCourses.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredCourses.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">בחר הכל</span>
              </label>
            )}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="חיפוש קורס..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              id={`course-${course.id}`}
              key={course.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all relative"
              style={{ borderRadius: 'var(--crm-border-radius)' }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(course.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds([...selectedIds, course.id]);
                  } else {
                    setSelectedIds(selectedIds.filter(id => id !== course.id));
                  }
                }}
                className="absolute top-4 left-4 w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded z-10"
              />
              {course.image_url && (
                <img
                  src={course.image_url}
                  alt={course.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[var(--crm-text)] mb-2">
                      {course.name}
                    </h3>
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getStatusColor(course.status) }}
                    >
                      {course.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(course)}
                      className="text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {course.description && (
                  <p className="text-sm text-[var(--crm-text)] opacity-70 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {course.schedule && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <Calendar className="w-4 h-4" />
                      {course.schedule}
                    </div>
                  )}
                  {course.location && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <MapPin className="w-4 h-4" />
                      {course.location}
                    </div>
                  )}
                  {course.price && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <DollarSign className="w-4 h-4" />
                      ₪{course.price}
                    </div>
                  )}
                  {(course.max_students || course.current_students) && (
                    <Link 
                      to={createPageUrl('Students') + '?course=' + course.id}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-[var(--crm-text)] opacity-80 hover:text-[var(--crm-primary)] hover:opacity-100 transition-all"
                    >
                      <Users className="w-4 h-4" />
                      <span className="font-medium underline">
                        {course.current_students || 0} / {course.max_students || '∞'}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">לא נמצאו קורסים</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[var(--crm-text)]">
                {editingCourse ? 'עריכת קורס' : 'קורס חדש'}
              </h2>
              <button onClick={closeModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">שם הקורס *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="שם הקורס"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">סוג</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="קורס קבוע">קורס קבוע</option>
                    <option value="סדנה">סדנה</option>
                    <option value="פרטי">פרטי</option>
                    <option value="אונליין">אונליין</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="פתוח להרשמה">פתוח להרשמה</option>
                    <option value="מלא">מלא</option>
                    <option value="בתהליך">בתהליך</option>
                    <option value="הסתיים">הסתיים</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">לוח זמנים</label>
                  <Input
                    value={formData.schedule}
                    onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                    placeholder="למשל: ימי שני ורביעי 18:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מיקום</label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="מיקום הקורס"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מחיר</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מספר משתתפים מקסימלי</label>
                  <Input
                    type="number"
                    value={formData.max_students}
                    onChange={(e) => setFormData({...formData, max_students: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">תאריך התחלה</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">תאריך סיום</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="תיאור הקורס..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-[var(--crm-primary)] text-white hover:bg-[var(--crm-primary)]/90"
                  style={{ borderRadius: 'var(--crm-button-radius)' }}
                >
                  שמור
                </Button>
                <Button
                  onClick={closeModal}
                  variant="outline"
                  className="flex-1"
                  style={{ borderRadius: 'var(--crm-button-radius)' }}
                >
                  ביטול
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}