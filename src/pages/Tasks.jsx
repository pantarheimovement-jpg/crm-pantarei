import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  CheckSquare, Plus, Search, Edit2, Trash2, Calendar,
  X, Loader2, CheckCircle, Circle, Download, AlertCircle, Upload
} from 'lucide-react';
import ImportModal from '../components/shared/ImportModal';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    assigned_to: '',
    organization_id: '',
    organization_name: '',
    status: 'פתוח',
    due_date: '',
    priority: 'בינונית'
  });
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, orgsData] = await Promise.all([
        base44.entities.Task.list('-created_date'),
        base44.entities.Organization.list()
      ]);
      setTasks(tasksData || []);
      setOrganizations(orgsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      alert('אנא הזיני תיאור משימה');
      return;
    }

    setSaving(true);
    try {
      const selectedOrg = organizations.find(org => org.id === formData.organization_id);
      const dataToSave = {
        ...formData,
        organization_name: selectedOrg ? selectedOrg.name : ''
      };

      if (selectedTask) {
        await base44.entities.Task.update(selectedTask.id, dataToSave);
        alert('המשימה עודכנה בהצלחה!');
      } else {
        await base44.entities.Task.create(dataToSave);
        alert('המשימה נוספה בהצלחה!');
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedTask(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('שגיאה בשמירת המשימה');
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

  const handleToggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'הושלם' ? 'פתוח' : 'הושלם';
      await base44.entities.Task.update(task.id, { ...task, status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('שגיאה בעדכון סטטוס המשימה');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      assigned_to: '',
      organization_id: '',
      organization_name: '',
      status: 'פתוח',
      due_date: '',
      priority: 'בינונית'
    });
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      organization_id: task.organization_id || '',
      organization_name: task.organization_name || '',
      status: task.status || 'פתוח',
      due_date: task.due_date || '',
      priority: task.priority || 'בינונית'
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
        // Try to link organization
        let orgId = '';
        let orgName = '';
        if (item.organization_name) {
          const org = organizations.find(o => o.name.toLowerCase() === item.organization_name.toLowerCase());
          if (org) {
            orgId = org.id;
            orgName = org.name;
          } else {
            orgName = item.organization_name;
          }
        }

        await base44.entities.Task.create({
          description: item.description,
          assigned_to: item.assigned_to || '',
          organization_id: orgId,
          organization_name: orgName,
          status: item.status || 'פתוח',
          priority: item.priority || 'בינונית',
          due_date: item.due_date || ''
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
    const headers = ['תיאור', 'מוקצה ל', 'ארגון', 'סטטוס', 'עדיפות', 'תאריך יעד'];
    const rows = filteredTasks.map(task => [
      task.description,
      task.assigned_to || '',
      task.organization_name || '',
      task.status,
      task.priority || '',
      task.due_date || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'נמוכה': 'bg-blue-100 text-blue-800',
      'בינונית': 'bg-yellow-100 text-yellow-800',
      'גבוהה': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && dueDate !== '';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.organization_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    open: tasks.filter(t => t.status === 'פתוח').length,
    inProgress: tasks.filter(t => t.status === 'בטיפול').length,
    completed: tasks.filter(t => t.status === 'הושלם').length,
    overdue: tasks.filter(t => t.status !== 'הושלם' && isOverdue(t.due_date)).length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-[#005e6c]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">משימות</h1>
                <p className="mt-1 text-sm text-gray-500">{filteredTasks.length} משימות</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                משימה חדשה
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">פתוחות</p>
            <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">בטיפול</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">הושלמו</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">באיחור</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
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
              <option value="פתוח">פתוח</option>
              <option value="בטיפול">בטיפול</option>
              <option value="הושלם">הושלם</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
            >
              <option value="all">כל העדיפויות</option>
              <option value="נמוכה">נמוכה</option>
              <option value="בינונית">בינונית</option>
              <option value="גבוהה">גבוהה</option>
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
            <p className="text-gray-500">לא נמצאו משימות</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
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
                      {task.assigned_to && (
                        <span className="text-gray-600">מוקצה ל: {task.assigned_to}</span>
                      )}
                      {task.organization_name && (
                        <span className="text-gray-600">• {task.organization_name}</span>
                      )}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue(task.due_date) && task.status !== 'הושלם' ? 'text-red-600' : 'text-gray-600'}`}>
                          <Calendar className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString('he-IL')}
                          {isOverdue(task.due_date) && task.status !== 'הושלם' && (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
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
        entityName="משימות"
        columns={[
          { key: 'description', label: 'תיאור המשימה', required: true, example: 'שיחת מעקב' },
          { key: 'assigned_to', label: 'מוקצה ל', required: false, example: 'דנה' },
          { key: 'organization_name', label: 'שם הארגון', required: false, example: 'חברת דוגמה' },
          { key: 'status', label: 'סטטוס', required: false, example: 'Open' },
          { key: 'priority', label: 'עדיפות', required: false, example: 'High' },
          { key: 'due_date', label: 'תאריך יעד', required: false, example: '2023-11-01' }
        ]}
      />

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedTask ? 'ערוך משימה' : 'משימה חדשה'}
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
                    תיאור המשימה *
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">מוקצה ל</label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
                      <option value="פתוח">פתוח</option>
                      <option value="בטיפול">בטיפול</option>
                      <option value="הושלם">הושלם</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">עדיפות</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
                      <option value="נמוכה">נמוכה</option>
                      <option value="בינונית">בינונית</option>
                      <option value="גבוהה">גבוהה</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">תאריך יעד</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ארגון (אופציונלי)</label>
                    <select
                      value={formData.organization_id}
                      onChange={(e) => setFormData({...formData, organization_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
                      <option value="">בחר ארגון</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
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