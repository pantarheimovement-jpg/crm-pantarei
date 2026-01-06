import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Users, Plus, Search, Edit2, Trash2, Eye, Mail, Phone,
  X, Loader2, CheckCircle, Building2, Download, Upload
} from 'lucide-react';


export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    job_title: '',
    email: '',
    phone: '',
    preferred_channel: 'מייל',
    organization_id: '',
    organization_name: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsData, orgsData] = await Promise.all([
        base44.entities.Contact.list('-created_date'),
        base44.entities.Organization.list()
      ]);
      setContacts(contactsData || []);
      setOrganizations(orgsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      alert('אנא הזיני שם מלא');
      return;
    }

    setSaving(true);
    try {
      // Get organization name if organization_id is set
      const selectedOrg = organizations.find(org => org.id === formData.organization_id);
      const dataToSave = {
        ...formData,
        organization_name: selectedOrg ? selectedOrg.name : formData.organization_name
      };

      if (selectedContact) {
        await base44.entities.Contact.update(selectedContact.id, dataToSave);
        alert('איש הקשר עודכן בהצלחה!');
      } else {
        await base44.entities.Contact.create(dataToSave);
        alert('איש הקשר נוסף בהצלחה!');
      }
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedContact(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('שגיאה בשמירת איש הקשר');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם את בטוחה שאת רוצה למחוק איש קשר זה?')) return;

    try {
      await base44.entities.Contact.delete(id);
      alert('איש הקשר נמחק בהצלחה');
      loadData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('שגיאה במחיקת איש הקשר');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      job_title: '',
      email: '',
      phone: '',
      preferred_channel: 'מייל',
      organization_id: '',
      organization_name: '',
      notes: ''
    });
  };

  const openEditModal = (contact) => {
    setSelectedContact(contact);
    setFormData({
      full_name: contact.full_name || '',
      job_title: contact.job_title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      preferred_channel: contact.preferred_channel || 'מייל',
      organization_id: contact.organization_id || '',
      organization_name: contact.organization_name || '',
      notes: contact.notes || ''
    });
    setShowEditModal(true);
  };

  const handleImport = async (items) => {
    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      if (!item.full_name) {
        errorCount++;
        continue;
      }

      try {
        // Try to link organization by name
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

        await base44.entities.Contact.create({
          full_name: item.full_name,
          job_title: item.job_title || '',
          email: item.email || '',
          phone: item.phone || '',
          organization_id: orgId,
          organization_name: orgName,
          preferred_channel: item.preferred_channel || 'מייל'
        });
        successCount++;
      } catch (error) {
        console.error('Error importing contact:', error);
        errorCount++;
      }
    }

    alert(`הייבוא הושלם:\n✅ נוצרו בהצלחה: ${successCount}\n❌ נכשלו: ${errorCount}`);
    loadData();
  };

  const exportToCSV = () => {
    const headers = ['שם', 'תפקיד', 'מייל', 'טלפון', 'ארגון', 'ערוץ מועדף'];
    const rows = filteredContacts.map(contact => [
      contact.full_name,
      contact.job_title || '',
      contact.email || '',
      contact.phone || '',
      contact.organization_name || '',
      contact.preferred_channel || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm ||
      contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.organization_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChannel = filterChannel === 'all' || contact.preferred_channel === filterChannel;

    return matchesSearch && matchesChannel;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-[#005e6c]" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">אנשי קשר</h1>
                <p className="mt-1 text-sm text-gray-500">{filteredContacts.length} אנשי קשר</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                איש קשר חדש
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="חיפוש לפי שם, מייל או ארגון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
              />
            </div>

            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
            >
              <option value="all">כל הערוצים</option>
              <option value="מייל">מייל</option>
              <option value="SMS">SMS</option>
              <option value="טלפון">טלפון</option>
              <option value="וואטסאפ">וואטסאפ</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#005e6c]" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">לא נמצאו אנשי קשר</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{contact.full_name}</h3>
                    {contact.job_title && (
                      <p className="text-sm text-gray-600">{contact.job_title}</p>
                    )}
                    {contact.organization_name && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        {contact.organization_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${contact.email}`} className="hover:text-[#005e6c]">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${contact.phone}`} className="hover:text-[#005e6c]">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    {contact.preferred_channel}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowDetailsModal(true);
                      }}
                      className="text-[#005e6c] hover:text-[#004a54] p-1"
                      title="צפה בפרטים"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(contact)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="ערוך"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedContact ? 'ערוך איש קשר' : 'איש קשר חדש'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedContact(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תפקיד</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ערוץ מועדף</label>
                  <select
                    value={formData.preferred_channel}
                    onChange={(e) => setFormData({...formData, preferred_channel: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  >
                    <option value="מייל">מייל</option>
                    <option value="SMS">SMS</option>
                    <option value="טלפון">טלפון</option>
                    <option value="וואטסאפ">וואטסאפ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">מייל</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">טלפון</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005e6c] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ארגון</label>
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">הערות</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
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
                      {selectedContact ? 'עדכן' : 'הוסף'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedContact(null);
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

      {/* Details Modal */}
      {showDetailsModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">פרטי איש קשר</h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedContact(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-lg font-semibold">{selectedContact.full_name}</h4>
                {selectedContact.job_title && <p className="text-gray-600">{selectedContact.job_title}</p>}
              </div>
              {selectedContact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{selectedContact.email}</span>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.organization_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{selectedContact.organization_name}</span>
                </div>
              )}
              {selectedContact.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">הערות:</p>
                  <p className="text-gray-600">{selectedContact.notes}</p>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedContact);
                  }}
                  className="flex-1 bg-[#005e6c] text-white py-2 rounded-lg hover:bg-[#004a54]"
                >
                  ערוך
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedContact(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}