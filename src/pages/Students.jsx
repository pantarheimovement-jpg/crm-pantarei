import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSystemSettings } from '../components/SystemSettingsContext';
import { Users, Plus, Search, Filter, Phone, Mail, Tag, Calendar, Trash2, Edit, X, Loader2, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Students() {
  const { systemTexts, leadStatuses } = useSystemSettings();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    status: 'חדש',
    lead_source: 'אחר',
    interest_area: '',
    trial_date: '',
    registration_date: '',
    course_id: '',
    course_name: '',
    notes: '',
    tags: [],
    payment_number: '',
    total_payments: ''
  });

  useEffect(() => {
    loadStudents();
    loadCourses();
  }, []);

  useEffect(() => {
    // קריאת פרמטרים מה-URL ועדכון הסינונים בהתאם
    const urlParams = new URLSearchParams(window.location.search);
    const urlStatus = urlParams.get('status');
    const urlCourse = urlParams.get('course');
    const urlSearch = urlParams.get('search');
    
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    if (urlCourse) {
      setCourseFilter(urlCourse);
    }
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [window.location.search]);

  const loadStudents = async () => {
    try {
      const data = await base44.entities.Student.list('-created_date');
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await base44.entities.Course.list();
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleSave = async () => {
    try {
      const originalStudent = editingStudent ? students.find(s => s.id === editingStudent.id) : null;
      const wasRegistered = originalStudent?.status === 'נרשם' || originalStudent?.status === 'רשום';
      const isNowRegistered = formData.status === 'נרשם' || formData.status === 'רשום';

      // נקה שדות מספריים ריקים
      const cleanedData = {
        ...formData,
        payment_number: formData.payment_number === '' ? null : formData.payment_number,
        total_payments: formData.total_payments === '' ? null : formData.total_payments
      };

      if (editingStudent) {
        await base44.entities.Student.update(editingStudent.id, cleanedData);
      } else {
        await base44.entities.Student.create(cleanedData);
      }

      // עדכון חכם של current_students בקורס
      if (formData.course_id) {
        const course = await base44.entities.Course.list();
        const selectedCourse = course.find(c => c.id === formData.course_id);
        if (selectedCourse) {
          let newCount = selectedCourse.current_students || 0;
          if (!wasRegistered && isNowRegistered) {
            newCount++;
          } else if (wasRegistered && !isNowRegistered) {
            newCount = Math.max(0, newCount - 1);
          }
          if (newCount !== (selectedCourse.current_students || 0)) {
            await base44.entities.Course.update(formData.course_id, { current_students: newCount });
          }
        }
      }

      await loadStudents();
      closeModal();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('שגיאה בשמירת המשתתף');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק משתתף זה?')) return;
    try {
      const student = students.find(s => s.id === id);
      const isRegistered = student?.status === 'נרשם' || student?.status === 'רשום';
      
      await base44.entities.Student.delete(id);
      
      // עדכון מונה הקורס אם המשתתף היה רשום
      if (isRegistered && student?.course_id) {
        const courses = await base44.entities.Course.list();
        const course = courses.find(c => c.id === student.course_id);
        if (course) {
          const newCount = Math.max(0, (course.current_students || 0) - 1);
          await base44.entities.Course.update(course.id, { current_students: newCount });
        }
      }
      
      await loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('שגיאה במחיקת המשתתף');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`האם למחוק ${selectedIds.length} משתתפים?`)) return;
    
    try {
      const allCourses = await base44.entities.Course.list();
      const courseUpdates = {};
      
      for (const id of selectedIds) {
        const student = students.find(s => s.id === id);
        const isRegistered = student?.status === 'נרשם' || student?.status === 'רשום';
        
        await base44.entities.Student.delete(id);
        
        if (isRegistered && student?.course_id) {
          if (!courseUpdates[student.course_id]) {
            const course = allCourses.find(c => c.id === student.course_id);
            if (course) {
              courseUpdates[student.course_id] = course.current_students || 0;
            }
          }
          if (courseUpdates[student.course_id] !== undefined) {
            courseUpdates[student.course_id] = Math.max(0, courseUpdates[student.course_id] - 1);
          }
        }
      }
      
      for (const [courseId, newCount] of Object.entries(courseUpdates)) {
        await base44.entities.Course.update(courseId, { current_students: newCount });
      }
      
      setSelectedIds([]);
      await loadStudents();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('שגיאה במחיקה: ' + error.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const openModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData(student);
    } else {
      setEditingStudent(null);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        status: 'חדש',
        lead_source: 'אחר',
        interest_area: '',
        trial_date: '',
        registration_date: '',
        course_id: '',
        course_name: '',
        notes: '',
        tags: [],
        payment_number: '',
        total_payments: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  const filteredStudents = students.filter(student => {
    // חיפוש
    const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.phone?.includes(searchTerm) ||
                         student.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // סינון לפי סטטוס
    let matchesStatus = true;
    if (statusFilter === 'leads') {
      matchesStatus = student.status !== 'נרשם' && student.status !== 'רשום' && student.status !== 'לא רלוונטי';
    } else if (statusFilter === 'registered') {
      matchesStatus = student.status === 'נרשם' || student.status === 'רשום';
    } else if (statusFilter !== 'all') {
      matchesStatus = student.status === statusFilter;
    }
    
    // סינון לפי קורס
    const matchesCourse = !courseFilter || student.course_id === courseFilter;
    
    // סינון לפי תאריך (מה-URL)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    let matchesDate = true;
    
    if (dateParam === 'today') {
      const today = new Date().toDateString();
      const studentDate = student.registration_date || student.created_date;
      matchesDate = studentDate && new Date(studentDate).toDateString() === today;
    } else if (dateParam === 'week') {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const studentDate = student.registration_date || student.created_date;
      matchesDate = studentDate && new Date(studentDate) >= weekStart;
    }
    
    return matchesSearch && matchesStatus && matchesCourse && matchesDate;
  });

  const getStatusColor = (status) => {
    const statusObj = leadStatuses.find(s => s.name === status);
    return statusObj?.color || '#6D436D';
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
            <Users className="w-8 h-8 text-[var(--crm-primary)]" />
            <div>
              <h1 className="text-3xl font-bold text-[var(--crm-text)]" style={{ fontFamily: 'var(--font-headings)' }}>
                {systemTexts?.entity_student_plural || 'משתתפים'}
              </h1>
              <p className="text-sm text-[var(--crm-text)] opacity-70">
                ניהול {systemTexts?.entity_student_plural || 'משתתפים'} בקורסים
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
              {systemTexts?.entity_student_singular || 'משתתף'} חדש
            </Button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-full shadow-sm mb-6" style={{ borderRadius: 'var(--crm-button-radius)' }}>
          {[
            { key: 'all', label: 'הכל' },
            { key: 'leads', label: 'לידים בטיפול' },
            { key: 'registered', label: 'רשומים' }
          ].map(filter => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-6 py-2 rounded-full transition-all font-medium ${
                statusFilter === filter.key
                  ? 'bg-[var(--crm-action)] text-[var(--crm-text)]'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              style={{ borderRadius: 'var(--crm-button-radius)' }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent"
              >
                <option value="">כל הקורסים</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-[var(--crm-primary)] text-white' : 'bg-gray-100'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-[var(--crm-primary)] text-white' : 'bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Students List - Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => (
              <div
                key={student.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow relative"
                style={{ borderRadius: 'var(--crm-border-radius)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds([...selectedIds, student.id]);
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== student.id));
                    }
                  }}
                  className="absolute top-4 left-4 w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded"
                />
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--crm-text)] mb-1">
                      {student.full_name}
                    </h3>
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getStatusColor(student.status) }}
                    >
                      {student.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(student)}
                      className="text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {student.phone && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <Phone className="w-4 h-4" />
                      {student.phone}
                    </div>
                  )}
                  {student.email && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <Mail className="w-4 h-4" />
                      {student.email}
                    </div>
                  )}
                  {student.courses && student.courses.length > 0 ? (
                    <div className="space-y-1">
                      {student.courses.map((course, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                          <Tag className="w-4 h-4" />
                          <span className="font-medium">{course.course_name}</span>
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: getStatusColor(course.status) }}
                          >
                            {course.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : student.course_name ? (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <Tag className="w-4 h-4" />
                      {student.course_name}
                    </div>
                  ) : null}
                  {student.trial_date && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <Calendar className="w-4 h-4" />
                      ניסיון: {new Date(student.trial_date).toLocaleDateString('he-IL')}
                    </div>
                  )}
                  {student.payment_number && student.total_payments && (
                    <div className="flex items-center gap-2 text-[var(--crm-text)] opacity-80">
                      <span className="font-medium">תשלומים:</span>
                      {student.payment_number} מתוך {student.total_payments} 
                      <span className="text-xs">({student.total_payments - student.payment_number} נותרו)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Students List - Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                        onChange={toggleSelectAll}
                        className="w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">טלפון</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">מייל</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">קורסים וסטטוסים</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">תשלומים</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, student.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== student.id));
                            }
                          }}
                          className="w-5 h-5 text-[var(--crm-primary)] border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--crm-text)]">{student.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {student.courses && student.courses.length > 0 ? (
                            student.courses.map((course, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-[var(--crm-text)]">{course.course_name}</span>
                                <span
                                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: getStatusColor(course.status) }}
                                >
                                  {course.status}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              {student.course_name && (
                                <>
                                  <span className="font-medium text-[var(--crm-text)]">{student.course_name}</span>
                                  <span
                                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                    style={{ backgroundColor: getStatusColor(student.status) }}
                                  >
                                    {student.status}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.payment_number && student.total_payments 
                          ? `${student.payment_number}/${student.total_payments} (${student.total_payments - student.payment_number} נותרו)`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(student)}
                            className="text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">לא נמצאו משתתפים</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[var(--crm-text)]">
                {editingStudent ? 'עריכת משתתף' : 'משתתף חדש'}
              </h2>
              <button onClick={closeModal}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">שם מלא *</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="שם מלא"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="050-1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מייל</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {leadStatuses.map(status => (
                      <option key={status.id} value={status.name}>{status.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מקור ליד</label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => setFormData({...formData, lead_source: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="פייסבוק">פייסבוק</option>
                    <option value="אינסטגרם">אינסטגרם</option>
                    <option value="המלצה">המלצה</option>
                    <option value="אתר">אתר</option>
                    <option value="אחר">אחר</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">קורס ראשי (לתצוגה)</label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => {
                      const course = courses.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        course_id: e.target.value,
                        course_name: course?.name || ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">בחר קורס</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    זהו הקורס שיוצג בתצוגה הכללית. מערך הקורסים המלא מתנהל אוטומטית על ידי המערכת
                  </p>
                </div>

                {formData.courses && formData.courses.length > 0 && (
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium mb-3">כל הקורסים והסטטוסים</label>
                    <div className="space-y-2">
                      {formData.courses.map((course, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-[var(--crm-text)]">{course.course_name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {course.registration_date && `רישום: ${new Date(course.registration_date).toLocaleDateString('he-IL')}`}
                              {course.trial_date && ` | ניסיון: ${new Date(course.trial_date).toLocaleDateString('he-IL')}`}
                            </div>
                          </div>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: getStatusColor(course.status) }}
                          >
                            {course.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">תאריך ניסיון</label>
                  <Input
                    type="date"
                    value={formData.trial_date}
                    onChange={(e) => setFormData({...formData, trial_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">תאריך רישום</label>
                  <Input
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) => setFormData({...formData, registration_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">מספר תשלום</label>
                  <Input
                    type="number"
                    value={formData.payment_number}
                    onChange={(e) => setFormData({...formData, payment_number: e.target.value})}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">סה"כ תשלומים</label>
                  <Input
                    type="number"
                    value={formData.total_payments}
                    onChange={(e) => setFormData({...formData, total_payments: e.target.value})}
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">הערות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="הערות נוספות..."
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