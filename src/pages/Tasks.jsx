import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  CheckSquare, Plus, Search, Edit2, Trash2, Calendar,
  X, Loader2, CheckCircle, Circle, Download, AlertCircle, Upload
} from 'lucide-react';
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
    description: '',
    student_id: '',
    student_name: '',
    status: 'בבדיקה',
    scheduled_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
    if (!formData.description.trim()) {
      alert('אנא הזיני תיאור');
      return;
    }

    setSaving(true);
    try {
      const selectedStudent = students.find(s => s.id === formData.student_id);
      const dataToSave = {
        ...formData,
        student_name: selectedStudent ? selectedStudent.full_name : ''
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
      description: '',
      student_id: '',
      student_name: '',
      status: 'בבדיקה',
      scheduled_date: ''
    });
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
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
      if (!item.description) {
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
          description: item.description,
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
    const headers = ['תיאור', 'משתתף', 'סטטוס', 'תאריך מתוזמן'];
    const rows = filteredTasks.map(task => [
      task.description,
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

                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-medium ${task.status === 'הושלם' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.description}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                      {task.student_name && (
                        <span className="text-gray-600">משתתף: {task.student_name}</span>
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
          { key: 'description', label: 'תיאור השיחה', required: true, example: 'שיחת היכרות' },
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
                    תיאור השיחה/פגישה *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">משתתף</label>
                    <select
                      value={formData.student_id}
                      onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
                      <option value="">בחר משתתף</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>{student.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
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
    </div>
  );
}