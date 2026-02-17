import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  CheckSquare, Plus, Search, Edit2, Trash2, Calendar,
  X, Loader2, CheckCircle, Circle, Download, AlertCircle, Upload, ExternalLink, Check, Phone, Mail, Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ImportModal from '../components/shared/ImportModal';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    student_id: '',
    student_name: '',
    status: 'ממתין',
    scheduled_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    full_name: '',
    phone: '',
    email: '',
    interest_area: '',
    lead_source: 'ידני',
    notes: ''
  });
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('task_id');
    
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        openEditModal(task);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [tasks]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, studentsData] = await Promise.all([
        base44.entities.Task.list('-created_date'),
        base44.entities.Student.list()
      ]);
      setTasks(tasksData || []);
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('אנא הזיני שם משימה');
      return;
    }

    setSaving(true);
    try {
      let studentId = formData.student_id;
      let studentName = formData.student_name;

      // אם הוזן שם משתתף חדש (טקסט חופשי) בלי לבחור מהרשימה
      if (!studentId && studentName && studentName.trim()) {
        // בדיקה אם המשתתף כבר קיים לפי שם
        const existingStudent = students.find(s => 
          s.full_name.toLowerCase() === studentName.trim().toLowerCase()
        );

        if (existingStudent) {
          // עדכון הסטטוס ל"נוצר משיחה" אם צריך
          const existingCourses = existingStudent.courses || [];

          await base44.entities.Student.update(existingStudent.id, {
            ...existingStudent,
            status: 'נוצר משיחה',
            courses: existingCourses.length > 0 ? [
              ...existingCourses.slice(0, -1),
              { ...existingCourses[existingCourses.length - 1], status: 'נוצר משיחה' }
            ] : existingCourses
          });

          studentId = existingStudent.id;
          studentName = existingStudent.full_name;
          await loadData();
        } else {
          // יצירת משתתף חדש
          const newStudent = await base44.entities.Student.create({
            full_name: studentName.trim(),
            phone: '',
            status: 'נוצר משיחה'
          });
          studentId = newStudent.id;
          studentName = newStudent.full_name;

          // רענון רשימת המשתתפים
          await loadData();
        }
      } else if (studentId) {
        // אם נבחר מהרשימה
        const selectedStudent = students.find(s => s.id === studentId);
        studentName = selectedStudent ? selectedStudent.full_name : studentName;
      }

      const dataToSave = {
        ...formData,
        student_id: studentId,
        student_name: studentName
      };

      if (selectedTask) {
        await base44.entities.Task.update(selectedTask.id, dataToSave);
        alert('השיחה עודכנה בהצלחה!');
      } else {
        await base44.entities.Task.create(dataToSave);
        alert('השיחה נוספה בהצלחה!');
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedTask(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('שגיאה בשמירת השיחה');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם את בטוחה שאת רוצה למחוק משימה זו?')) return;

    try {
      await base44.entities.Task.delete(id);
      alert('המשימה נמחקה בהצלחה');
      loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('שגיאה במחיקת המשימה');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`האם למחוק ${selectedIds.length} משימות?`)) return;
    
    try {
      for (const id of selectedIds) {
        await base44.entities.Task.delete(id);
      }
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('שגיאה במחיקה');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasks.map(t => t.id));
    }
  };

  const handleToggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'הושלם' ? 'בבדיקה' : 'הושלם';
      await base44.entities.Task.update(task.id, { ...task, status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('שגיאה בעדכון סטטוס');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      student_id: '',
      student_name: '',
      status: 'ממתין',
      scheduled_date: ''
    });
  };

  const handleCreateNewStudent = async () => {
    if (!newStudentData.full_name || !newStudentData.phone) {
      alert('נא למלא שם וטלפון');
      return;
    }
    
    try {
      const newStudent = await base44.entities.Student.create({
        full_name: newStudentData.full_name,
        phone: newStudentData.phone,
        email: newStudentData.email || '',
        interest_area: newStudentData.interest_area || '',
        lead_source: newStudentData.lead_source,
        notes: newStudentData.notes || '',
        status: 'ליד חדש'
      });
      
      setFormData({
        ...formData,
        student_id: newStudent.id,
        student_name: newStudent.full_name
      });
      
      await loadData();
      setShowCreateStudentModal(false);
      setNewStudentData({ full_name: '', phone: '', email: '', interest_area: '', lead_source: 'ידני', notes: '' });
      alert('משתתף נוצר בהצלחה');
    } catch (error) {
      console.error('Error creating student:', error);
      alert('שגיאה ביצירת משתתף');
    }
  };

  const openStudentCard = async (studentId) => {
    try {
      const student = students.find(s => s.id === studentId);
      if (student) {
        setViewingStudent(student);
        setShowStudentModal(true);
      }
    } catch (error) {
      console.error('Error loading student:', error);
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
      name: task.name || '',
      description: task.description || '',
      student_id: task.student_id || '',
      student_name: task.student_name || '',
      status: task.status || 'בבדיקה',
      scheduled_date: task.scheduled_date || ''
    });
    setShowEditModal(true);
  };

  const handleImport = async (items) => {
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      if (!item.name) {
        errorCount++;
        continue;
      }

      try {
        let studentId = '';
        let studentName = '';
        if (item.student_name) {
          const student = students.find(s => s.full_name.toLowerCase() === item.student_name.toLowerCase());
          if (student) {
            studentId = student.id;
            studentName = student.full_name;
          } else {
            studentName = item.student_name;
          }
        }

        await base44.entities.Task.create({
          name: item.name,
          description: item.description || '',
          student_id: studentId,
          student_name: studentName,
          status: item.status || 'בבדיקה',
          scheduled_date: item.scheduled_date || ''
        });
        successCount++;
      } catch (error) {
        console.error('Error importing task:', error);
        errorCount++;
      }
    }

    alert(`הייבוא הושלם:\n✅ נוצרו בהצלחה: ${successCount}\n❌ נכשלו: ${errorCount}`);
    loadData();
  };

  const exportToCSV = () => {
    const headers = ['שם המשימה', 'תיאור', 'משתתף', 'סטטוס', 'תאריך מתוזמן'];
    const rows = filteredTasks.map(task => [
      task.name,
      task.description || '',
      task.student_name || '',
      task.status,
      task.scheduled_date || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calls_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };



  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm ||
      task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.student_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    answered: tasks.filter(t => t.status === 'ענתה').length,
    notAnswered: tasks.filter(t => t.status === 'לא ענתה').length,
    completed: tasks.filter(t => t.status === 'הושלם').length,
    scheduled: tasks.filter(t => t.scheduled_date && new Date(t.scheduled_date) >= new Date() && t.status !== 'הושלם').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-[#005e6c]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">שיחות ופגישות</h1>
                <p className="mt-1 text-sm text-gray-500">{filteredTasks.length} שיחות</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-500 rounded-lg hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  מחק {selectedIds.length}
                </button>
              )}
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                ייבוא
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                ייצא CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#005e6c] rounded-lg hover:bg-[#004a54] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                שיחה חדשה
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">ענתה</p>
            <p className="text-2xl font-bold text-green-600">{stats.answered}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">לא ענתה</p>
            <p className="text-2xl font-bold text-red-600">{stats.notAnswered}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">הושלמו</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">מתוזמנות</p>
            <p className="text-2xl font-bold text-purple-600">{stats.scheduled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {filteredTasks.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredTasks.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-[#005e6c] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">בחר הכל</span>
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="חיפוש..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="ממתין">ממתין</option>
              <option value="ענתה">ענתה</option>
              <option value="לא ענתה">לא ענתה</option>
              <option value="לא רלוונטי">לא רלוונטי</option>
              <option value="בבדיקה">בבדיקה</option>
              <option value="הושלם">הושלם</option>
              <option value="אבוד">אבוד</option>
            </select>

            <select
              value={formData.student_id}
              onChange={(e) => setFormData({...formData, student_id: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
            >
              <option value="">כל המשתתפים</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>{student.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#005e6c]" />
          </div>
        ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">לא נמצאו שיחות</p>
        </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(task.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, task.id]);
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== task.id));
                      }
                    }}
                    className="mt-1 w-5 h-5 text-[#005e6c] border-gray-300 rounded flex-shrink-0"
                  />
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="mt-1 flex-shrink-0"
                  >
                    {task.status === 'הושלם' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 group/task relative">
                    <h3 className={`text-base font-bold ${task.status === 'הושלם' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.name}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                      {task.student_name && (
                        <>
                          {(() => {
                            const student = students.find(s => s.id === task.student_id);
                            return student?.phone ? (
                              <span className="text-gray-600 flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {student.phone}
                              </span>
                            ) : (
                              <span className="text-gray-600">משתתף: {task.student_name}</span>
                            );
                          })()}
                        </>
                      )}
                      {task.scheduled_date && (
                        <span className={`flex items-center gap-1 ${new Date(task.scheduled_date) <= new Date() && task.status !== 'הושלם' ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                          <Calendar className="w-4 h-4" />
                          {new Date(task.scheduled_date).toLocaleDateString('he-IL')}
                          {new Date(task.scheduled_date) <= new Date() && task.status !== 'הושלם' && (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Tooltip on hover */}
                    {task.student_id && (() => {
                      const student = students.find(s => s.id === task.student_id);
                      return student ? (
                        <div className="absolute right-0 top-0 mt-12 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-64 opacity-0 invisible group-hover/task:opacity-100 group-hover/task:visible transition-all duration-200">
                          <div className="space-y-2 text-xs">
                            <div className="font-bold text-gray-900">{student.full_name}</div>
                            {student.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="w-3 h-3" />
                                {student.phone}
                              </div>
                            )}
                            {student.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-3 h-3" />
                                {student.email}
                              </div>
                            )}
                            {student.course_name && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Tag className="w-3 h-3" />
                                {student.course_name}
                              </div>
                            )}
                            <div className="pt-2 border-t border-gray-100 text-gray-400">
                              נוצר: {new Date(task.created_date).toLocaleDateString('he-IL')}
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        task.status === 'ענתה' ? 'bg-green-100 text-green-800' :
                        task.status === 'לא ענתה' ? 'bg-red-100 text-red-800' :
                        task.status === 'הושלם' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'אבוד' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(task)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="ערוך"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="מחק"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        entityName="שיחות"
        columns={[
          { key: 'name', label: 'שם המשימה', required: true, example: 'שיחת היכרות' },
          { key: 'description', label: 'תיאור נוסף', required: false, example: 'שיחה ראשונית עם המשתתף' },
          { key: 'student_name', label: 'שם משתתף', required: false, example: 'שרה כהן' },
          { key: 'status', label: 'סטטוס', required: false, example: 'ענתה' },
          { key: 'scheduled_date', label: 'תאריך מתוזמן', required: false, example: '2026-02-01' }
        ]}
      />

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedTask ? 'ערוך שיחה' : 'שיחה חדשה'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedTask(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם המשימה *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    placeholder="למשל: שיחת היכרות, פגישת מעקב..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תיאור נוסף
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    placeholder="פרטים נוספים..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">משתתף</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.student_id}
                        onChange={(e) => {
                          const selectedStudent = students.find(s => s.id === e.target.value);
                          setFormData({
                            ...formData, 
                            student_id: e.target.value,
                            student_name: selectedStudent ? selectedStudent.full_name : ''
                          });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                      >
                        <option value="">בחר משתתף</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>{student.full_name}</option>
                        ))}
                      </select>
                      
                      {formData.student_id && (
                        <button
                          type="button"
                          onClick={() => openStudentCard(formData.student_id)}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                          title="צפה בכרטיס משתתף"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => setShowCreateStudentModal(true)}
                        className="px-4 py-2 border border-[#005e6c] text-[#005e6c] rounded-lg hover:bg-[#005e6c]/10 flex items-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        חדש
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
                      <option value="ממתין">ממתין</option>
                      <option value="בבדיקה">בבדיקה</option>
                      <option value="ענתה">ענתה</option>
                      <option value="לא ענתה">לא ענתה</option>
                      <option value="לא רלוונטי">לא רלוונטי</option>
                      <option value="הושלם">הושלם</option>
                      <option value="אבוד">אבוד</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">תאריך מתוזמן</label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#005e6c] text-white py-3 rounded-lg font-semibold hover:bg-[#004a54] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {selectedTask ? 'עדכן' : 'הוסף'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedTask(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Student Modal */}
      {showCreateStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
              <h3 className="text-xl font-bold text-gray-900">הוספת משתתף חדש</h3>
              <button
                onClick={() => {
                  setShowCreateStudentModal(false);
                  setNewStudentData({ full_name: '', phone: '', email: '', interest_area: '', lead_source: 'ידני', notes: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
                <input
                  type="text"
                  value={newStudentData.full_name}
                  onChange={(e) => setNewStudentData({...newStudentData, full_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  placeholder="שם מלא"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">טלפון *</label>
                <input
                  type="tel"
                  value={newStudentData.phone}
                  onChange={(e) => setNewStudentData({...newStudentData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  placeholder="050-1234567"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל</label>
                <input
                  type="email"
                  value={newStudentData.email}
                  onChange={(e) => setNewStudentData({...newStudentData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">קורס מעניין</label>
                <input
                  type="text"
                  value={newStudentData.interest_area}
                  onChange={(e) => setNewStudentData({...newStudentData, interest_area: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  placeholder="תחום עניין"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מקור ליד</label>
                <select
                  value={newStudentData.lead_source}
                  onChange={(e) => setNewStudentData({...newStudentData, lead_source: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                >
                  <option value="ידני">ידני</option>
                  <option value="פייסבוק">פייסבוק</option>
                  <option value="אינסטגרם">אינסטגרם</option>
                  <option value="המלצה">המלצה</option>
                  <option value="אתר">אתר</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">הערות</label>
                <textarea
                  value={newStudentData.notes}
                  onChange={(e) => setNewStudentData({...newStudentData, notes: e.target.value})}
                  rows="2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  placeholder="הערות נוספות..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateNewStudent}
                  className="flex-1 bg-[#005e6c] text-white py-3 rounded-lg font-semibold hover:bg-[#004a54] flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  צור והשתמש
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateStudentModal(false);
                    setNewStudentData({ full_name: '', phone: '', email: '', interest_area: '', lead_source: 'ידני', notes: '' });
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student View Modal */}
      {showStudentModal && viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {viewingStudent.full_name}
              </h2>
              <button 
                onClick={() => { 
                  setShowStudentModal(false); 
                  setViewingStudent(null); 
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 block mb-1">שם מלא</label>
                  <p className="text-lg font-semibold text-gray-900">{viewingStudent.full_name}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 block mb-1">סטטוס</label>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white bg-[#6D436D]">
                    {viewingStudent.status}
                  </span>
                </div>
                
                {viewingStudent.phone && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 block mb-1">טלפון</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${viewingStudent.phone}`} className="hover:underline">
                        {viewingStudent.phone}
                      </a>
                    </p>
                  </div>
                )}
                
                {viewingStudent.email && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 block mb-1">מייל</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${viewingStudent.email}`} className="hover:underline break-all">
                        {viewingStudent.email}
                      </a>
                    </p>
                  </div>
                )}
                
                {viewingStudent.course_name && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 block mb-1">קורס</label>
                    <p className="text-gray-900">{viewingStudent.course_name}</p>
                  </div>
                )}
                
                {viewingStudent.lead_source && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 block mb-1">מקור ליד</label>
                    <p className="text-gray-900">{viewingStudent.lead_source}</p>
                  </div>
                )}

                {viewingStudent.courses && viewingStudent.courses.length > 0 && (
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <label className="text-xs font-medium text-gray-500 mb-2 block">קורסים</label>
                    <div className="space-y-2">
                      {viewingStudent.courses.map((course, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <span className="font-medium">{course.course_name}</span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium text-white bg-[#6D436D]">
                            {course.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {viewingStudent.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 block mb-1">הערות</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingStudent.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t">
                <Link
                  to={createPageUrl('Students') + `?student_id=${viewingStudent.id}`}
                  className="flex-1"
                >
                  <button
                    type="button"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    עריכה מלאה
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => { 
                    setShowStudentModal(false); 
                    setViewingStudent(null); 
                  }}
                  className="flex-1 bg-[#005e6c] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#004a54]"
                >
                  חזרה למשימה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}