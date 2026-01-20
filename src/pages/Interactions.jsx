import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  MessageSquare, Plus, Search, Edit2, Trash2, Calendar,
  X, Loader2, CheckCircle, Phone, Mail, Video, FileText, Download, Upload
} from 'lucide-react';
import ImportModal from '../components/shared/ImportModal';

export default function Interactions() {
  const [interactions, setInteractions] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0] + 'T12:00',
    type: 'שיחה',
    summary: '',
    result: 'פתוח',
    organization_id: '',
    organization_name: '',
    contact_id: '',
    contact_name: '',
    documentation: ''
  });
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // New org/contact mode
  const [orgMode, setOrgMode] = useState('existing'); // 'existing' or 'new'
  const [newOrgName, setNewOrgName] = useState('');
  const [contactMode, setContactMode] = useState('existing'); // 'existing' or 'new'
  const [newContact, setNewContact] = useState({
    full_name: '',
    email: '',
    phone: '',
    job_title: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [interactionsData, orgsData, contactsData] = await Promise.all([
        base44.entities.Interaction.list('-date'),
        base44.entities.Organization.list(),
        base44.entities.Contact.list()
      ]);
      setInteractions(interactionsData || []);
      setOrganizations(orgsData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (orgMode === 'existing' && !formData.organization_id) {
      alert('אנא בחרי ארגון');
      return;
    }
    if (orgMode === 'new' && !newOrgName.trim()) {
      alert('אנא הזיני שם ארגון');
      return;
    }
    if (!formData.summary.trim()) {
      alert('אנא הזיני תקציר');
      return;
    }
    if (contactMode === 'new' && !newContact.full_name.trim()) {
      alert('אנא הזיני שם איש קשר');
      return;
    }

    setSaving(true);
    try {
      let orgId = formData.organization_id;
      let orgName = '';
      
      // Create new organization if needed
      if (orgMode === 'new') {
        const newOrg = await base44.entities.Organization.create({
          name: newOrgName.trim(),
          status: 'ליד',
          opening_date: new Date().toISOString().split('T')[0]
        });
        orgId = newOrg.id;
        orgName = newOrgName.trim();
      } else {
        const selectedOrg = organizations.find(org => org.id === formData.organization_id);
        orgName = selectedOrg ? selectedOrg.name : '';
      }
      
      let contactId = formData.contact_id;
      let contactName = '';
      
      // Create new contact if needed
      if (contactMode === 'new' && newContact.full_name.trim()) {
        const newContactData = await base44.entities.Contact.create({
          full_name: newContact.full_name.trim(),
          email: newContact.email || '',
          phone: newContact.phone || '',
          job_title: newContact.job_title || '',
          organization_id: orgId,
          organization_name: orgName
        });
        contactId = newContactData.id;
        contactName = newContact.full_name.trim();
      } else if (contactMode === 'existing' && formData.contact_id) {
        const selectedContact = contacts.find(c => c.id === formData.contact_id);
        contactName = selectedContact ? selectedContact.full_name : '';
      }
      
      const dataToSave = {
        ...formData,
        organization_id: orgId,
        organization_name: orgName,
        contact_id: contactId,
        contact_name: contactName
      };

      if (selectedInteraction) {
        await base44.entities.Interaction.update(selectedInteraction.id, dataToSave);
        alert('האינטראקציה עודכנה בהצלחה!');
      } else {
        await base44.entities.Interaction.create(dataToSave);
        alert('האינטראקציה נוספה בהצלחה!');
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedInteraction(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving interaction:', error);
      alert('שגיאה בשמירת האינטראקציה');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם את בטוחה שאת רוצה למחוק אינטראקציה זו?')) return;

    try {
      await base44.entities.Interaction.delete(id);
      alert('האינטראקציה נמחקה בהצלחה');
      loadData();
    } catch (error) {
      console.error('Error deleting interaction:', error);
      alert('שגיאה במחיקת האינטראקציה');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`האם למחוק ${selectedIds.length} אינטראקציות?`)) return;
    
    try {
      for (const id of selectedIds) {
        await base44.entities.Interaction.delete(id);
      }
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('שגיאה במחיקה');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInteractions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInteractions.map(i => i.id));
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0] + 'T12:00',
      type: 'שיחה',
      summary: '',
      result: 'פתוח',
      organization_id: '',
      organization_name: '',
      contact_id: '',
      contact_name: '',
      documentation: ''
    });
    setOrgMode('existing');
    setNewOrgName('');
    setContactMode('existing');
    setNewContact({ full_name: '', email: '', phone: '', job_title: '' });
  };

  const openEditModal = (interaction) => {
    setSelectedInteraction(interaction);
    setFormData({
      date: interaction.date || new Date().toISOString().split('T')[0] + 'T12:00',
      type: interaction.type || 'שיחה',
      summary: interaction.summary || '',
      result: interaction.result || 'פתוח',
      organization_id: interaction.organization_id || '',
      organization_name: interaction.organization_name || '',
      contact_id: interaction.contact_id || '',
      contact_name: interaction.contact_name || '',
      documentation: interaction.documentation || ''
    });
    setShowEditModal(true);
  };

  const handleImport = async (items) => {
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      if (!item.summary) {
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

        // Try to link contact (if org found)
        let contactId = '';
        let contactName = item.contact_name || '';
        if (orgId && contactName) {
          const contact = contacts.find(c => c.organization_id === orgId && c.full_name.toLowerCase() === contactName.toLowerCase());
          if (contact) {
            contactId = contact.id;
            contactName = contact.full_name;
          }
        }

        await base44.entities.Interaction.create({
          date: item.date || new Date().toISOString().split('T')[0] + 'T12:00',
          type: item.type || 'שיחה',
          summary: item.summary,
          result: item.result || 'פתוח',
          organization_id: orgId,
          organization_name: orgName,
          contact_id: contactId,
          contact_name: contactName,
          documentation: ''
        });
        successCount++;
      } catch (error) {
        console.error('Error importing interaction:', error);
        errorCount++;
      }
    }

    alert(`הייבוא הושלם:\n✅ נוצרו בהצלחה: ${successCount}\n❌ נכשלו: ${errorCount}`);
    loadData();
  };

  const exportToCSV = () => {
    const headers = ['תאריך', 'סוג', 'ארגון', 'איש קשר', 'תקציר', 'תוצאה'];
    const rows = filteredInteractions.map(int => [
      new Date(int.date).toLocaleString('he-IL'),
      int.type,
      int.organization_name || '',
      int.contact_name || '',
      int.summary || '',
      int.result || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `interactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'שיחה': return <Phone className="w-5 h-5" />;
      case 'מייל': return <Mail className="w-5 h-5" />;
      case 'וואטסאפ': return <MessageSquare className="w-5 h-5" />;
      case 'פגישה': return <Calendar className="w-5 h-5" />;
      case 'זום': return <Video className="w-5 h-5" />;
      case 'הצעת מחיר': return <FileText className="w-5 h-5" />;
      case 'הזמנה': return <FileText className="w-5 h-5" />;
      default: return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getResultColor = (result) => {
    const colors = {
      'פתוח': 'bg-blue-100 text-blue-800',
      'סגור': 'bg-gray-100 text-gray-800',
      'המשך טיפול': 'bg-yellow-100 text-yellow-800',
      'הצלחה': 'bg-green-100 text-green-800',
      'אין עניין': 'bg-red-100 text-red-800'
    };
    return colors[result] || 'bg-gray-100 text-gray-800';
  };

  const filteredInteractions = interactions.filter(int => {
    const matchesSearch = !searchTerm ||
      int.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      int.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      int.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || int.type === filterType;
    const matchesResult = filterResult === 'all' || int.result === filterResult;

    return matchesSearch && matchesType && matchesResult;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-[#005e6c]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">אינטראקציות</h1>
                <p className="mt-1 text-sm text-gray-500">{filteredInteractions.length} אינטראקציות</p>
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
                אינטראקציה חדשה
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {filteredInteractions.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredInteractions.length}
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
            >
              <option value="all">כל הסוגים</option>
              <option value="שיחה">שיחה</option>
              <option value="מייל">מייל</option>
              <option value="וואטסאפ">וואטסאפ</option>
              <option value="פגישה">פגישה</option>
              <option value="זום">זום</option>
              <option value="הצעת מחיר">הצעת מחיר</option>
              <option value="הזמנה">הזמנה</option>
            </select>

            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
            >
              <option value="all">כל התוצאות</option>
              <option value="פתוח">פתוח</option>
              <option value="סגור">סגור</option>
              <option value="המשך טיפול">המשך טיפול</option>
              <option value="הצלחה">הצלחה</option>
              <option value="אין עניין">אין עניין</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#005e6c]" />
          </div>
        ) : filteredInteractions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">לא נמצאו אינטראקציות</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInteractions.map((interaction) => (
              <div key={interaction.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(interaction.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, interaction.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== interaction.id));
                        }
                      }}
                      className="mt-1 w-5 h-5 text-[#005e6c] border-gray-300 rounded"
                    />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-[#005e6c]">
                        {getTypeIcon(interaction.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{interaction.organization_name}</h3>
                        {interaction.contact_name && (
                          <p className="text-sm text-gray-600">{interaction.contact_name}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3">{interaction.summary}</p>

                    {interaction.documentation && (
                      <p className="text-sm text-gray-600 mb-3">{interaction.documentation}</p>
                    )}

                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(interaction.date).toLocaleString('he-IL')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getResultColor(interaction.result)}`}>
                        {interaction.result}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {interaction.type}
                      </span>
                    </div>
                  </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(interaction)}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="ערוך"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(interaction.id)}
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
        entityName="אינטראקציות"
        columns={[
          { key: 'date', label: 'תאריך', required: false, example: '2023-10-25 14:00' },
          { key: 'type', label: 'סוג', required: false, example: 'Call' },
          { key: 'organization_name', label: 'שם הארגון', required: false, example: 'חברת דוגמה' },
          { key: 'contact_name', label: 'שם איש קשר', required: false, example: 'ישראל ישראלי' },
          { key: 'summary', label: 'תקציר', required: true, example: 'שיחת היכרות' },
          { key: 'result', label: 'תוצאה', required: false, example: 'Open' }
        ]}
      />

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedInteraction ? 'ערוך אינטראקציה' : 'אינטראקציה חדשה'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedInteraction(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תאריך ושעה *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סוג *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  >
                    <option value="שיחה">שיחה</option>
                    <option value="מייל">מייל</option>
                    <option value="וואטסאפ">וואטסאפ</option>
                    <option value="פגישה">פגישה</option>
                    <option value="זום">זום</option>
                    <option value="הצעת מחיר">הצעת מחיר</option>
                    <option value="הזמנה">הזמנה</option>
                  </select>
                </div>

                {/* Organization Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ארגון *</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orgMode"
                        checked={orgMode === 'existing'}
                        onChange={() => setOrgMode('existing')}
                        className="text-[#005e6c]"
                      />
                      <span className="text-sm">ארגון קיים</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orgMode"
                        checked={orgMode === 'new'}
                        onChange={() => setOrgMode('new')}
                        className="text-[#005e6c]"
                      />
                      <span className="text-sm">ארגון חדש</span>
                    </label>
                  </div>
                  
                  {orgMode === 'existing' ? (
                    <select
                      value={formData.organization_id}
                      onChange={(e) => {
                        setFormData({...formData, organization_id: e.target.value, contact_id: ''});
                        setContactMode('existing');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    >
                      <option value="">בחר ארגון</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="הזיני שם ארגון חדש"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    />
                  )}
                </div>

                {/* Contact Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">איש קשר (אופציונלי)</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contactMode"
                        checked={contactMode === 'existing'}
                        onChange={() => setContactMode('existing')}
                        className="text-[#005e6c]"
                      />
                      <span className="text-sm">איש קשר קיים</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="contactMode"
                        checked={contactMode === 'new'}
                        onChange={() => setContactMode('new')}
                        className="text-[#005e6c]"
                      />
                      <span className="text-sm">איש קשר חדש</span>
                    </label>
                  </div>
                  
                  {contactMode === 'existing' ? (
                    <select
                      value={formData.contact_id}
                      onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                      disabled={orgMode === 'new'}
                    >
                      <option value="">בחר איש קשר</option>
                      {contacts.filter(c => c.organization_id === formData.organization_id).map(contact => (
                        <option key={contact.id} value={contact.id}>{contact.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newContact.full_name}
                        onChange={(e) => setNewContact({...newContact, full_name: e.target.value})}
                        placeholder="שם מלא *"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={newContact.job_title}
                        onChange={(e) => setNewContact({...newContact, job_title: e.target.value})}
                        placeholder="תפקיד"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                      />
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                        placeholder="מייל"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                      />
                      <input
                        type="tel"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        placeholder="טלפון"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">תקציר *</label>
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) => setFormData({...formData, summary: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תוצאה</label>
                  <select
                    value={formData.result}
                    onChange={(e) => setFormData({...formData, result: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  >
                    <option value="פתוח">פתוח</option>
                    <option value="סגור">סגור</option>
                    <option value="המשך טיפול">המשך טיפול</option>
                    <option value="הצלחה">הצלחה</option>
                    <option value="אין עניין">אין עניין</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">תיעוד מפורט</label>
                  <textarea
                    value={formData.documentation}
                    onChange={(e) => setFormData({...formData, documentation: e.target.value})}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  />
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
                      {selectedInteraction ? 'עדכן' : 'הוסף'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedInteraction(null);
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