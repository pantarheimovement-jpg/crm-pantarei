import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Trash2, Edit3, Loader2, X, CheckCircle, MessageCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import ExportButtons from '../shared/ExportButtons';
import SubscriberStudentLink from './SubscriberStudentLink';

const SUBSCRIBERS_PER_GROUP = 280;

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function SubscribersList({ subscribers, students, loading, activeGroups, onReload }) {
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [showEditSubscriber, setShowEditSubscriber] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [newSubscriber, setNewSubscriber] = useState({ email: '', whatsapp: '', name: '', job_title: '', company: '', notes: '', group: 'קבוצה 1' });
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [updatingSubscriber, setUpdatingSubscriber] = useState(false);
  const [addToContacts, setAddToContacts] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addGroupSelectedIds, setAddGroupSelectedIds] = useState([]);
  const [addGroupSearch, setAddGroupSearch] = useState('');

  // Build students map by email for quick lookup
  const studentsMap = useMemo(() => {
    const map = {};
    (students || []).forEach(s => {
      if (s.email) map[s.email.toLowerCase()] = s;
    });
    return map;
  }, [students]);

  const getGroupSubscriberCount = (groupName) => {
    if (groupName === 'כל הרשימה') {
      return subscribers.filter(s => s.subscribed !== false && !s.email?.startsWith('_placeholder_')).length;
    }
    return subscribers.filter(s => 
      s.group === groupName || (s.groups && Array.isArray(s.groups) && s.groups.includes(groupName))
    ).length;
  };

  const getGroupColor = (groupName) => {
    if ((groupName || '').includes('2⭐')) return 'var(--crm-action)';
    return 'var(--crm-primary)';
  };

  const getGroupTextColor = (groupName) => {
    if ((groupName || '').includes('2⭐')) return 'var(--crm-text)';
    return 'white';
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = !searchTerm ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || sub.group === filterGroup || (sub.groups && Array.isArray(sub.groups) && sub.groups.includes(filterGroup));
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && sub.subscribed) || (filterStatus === 'inactive' && !sub.subscribed);
    const matchesChannel = filterChannel === 'all' ||
      (filterChannel === 'has_whatsapp' && sub.whatsapp) ||
      (filterChannel === 'has_email' && sub.email) ||
      (filterChannel === 'both' && sub.email && sub.whatsapp) ||
      (filterChannel === 'whatsapp' && sub.whatsapp && !sub.email) ||
      (filterChannel === 'email' && sub.email && !sub.whatsapp);
    return matchesSearch && matchesGroup && matchesStatus && matchesChannel;
  });

  const getAvailableGroup = async () => {
    const allSubs = await base44.entities.Subscribers.list();
    const groupCounts = {};
    allSubs.forEach(sub => { const g = sub.group || 'קבוצה 1'; groupCounts[g] = (groupCounts[g] || 0) + 1; });
    let groupNum = 1;
    while (true) {
      const groupName = `קבוצה ${groupNum}`;
      if ((groupCounts[groupName] || 0) < SUBSCRIBERS_PER_GROUP) return groupName;
      groupNum++;
      if (groupNum > 1000) return `קבוצה ${groupNum}`;
    }
  };

  const getStudentCourseGroup = (email) => {
    if (!email) return null;
    const student = studentsMap[email.toLowerCase()];
    if (!student) return null;
    return student.course_name || 
      (student.courses && student.courses.length > 0 ? student.courses[0].course_name : null);
  };

  const handleAddSubscriber = async () => {
    if (!newSubscriber.email && !newSubscriber.whatsapp) { alert(t('אנא הזיני כתובת מייל או מספר וואטסאפ', 'Please enter an email or WhatsApp')); return; }
    setAddingSubscriber(true);
    try {
      if (newSubscriber.email) {
        const existing = await base44.entities.Subscribers.filter({ email: newSubscriber.email });
        if (existing?.length > 0) { alert(t('המייל כבר קיים ברשימה', 'Email already exists')); setAddingSubscriber(false); return; }
      }
      // Auto-assign group based on student's course
      const courseGroup = getStudentCourseGroup(newSubscriber.email);
      const assignedGroup = courseGroup || 'כללי';
      const groups = courseGroup ? [courseGroup] : [];
      await base44.entities.Subscribers.create({ ...newSubscriber, group: assignedGroup, groups, subscribed: true, unsubscribe_token: generateToken(), source: 'הוספה ידנית' });
      if (addToContacts && newSubscriber.name) {
        await base44.entities.Contact.create({ full_name: newSubscriber.name, email: newSubscriber.email || '', phone: newSubscriber.whatsapp || '', job_title: newSubscriber.job_title || '', organization_name: newSubscriber.company || '' });
      }
      alert(`המנוי נוסף בהצלחה לקבוצה: ${assignedGroup}!`);
      setShowAddSubscriber(false);
      setNewSubscriber({ email: '', whatsapp: '', name: '', job_title: '', company: '', notes: '', group: 'קבוצה 1' });
      setAddToContacts(false);
      onReload();
    } catch (error) { alert(t('שגיאה בהוספת המנוי', 'Error adding subscriber')); }
    finally { setAddingSubscriber(false); }
  };

  const handleUpdateSubscriber = async () => {
    setUpdatingSubscriber(true);
    try {
      await base44.entities.Subscribers.update(editingSubscriber.id, {
        email: editingSubscriber.email || '', whatsapp: editingSubscriber.whatsapp || '',
        name: editingSubscriber.name || '', job_title: editingSubscriber.job_title || '',
        company: editingSubscriber.company || '', notes: editingSubscriber.notes || '',
        group: editingSubscriber.group, groups: editingSubscriber.groups || [],
        subscribed: editingSubscriber.subscribed,
        marketing_consent: editingSubscriber.marketing_consent || false
      });
      alert(t('המנוי עודכן בהצלחה!', 'Subscriber updated!'));
      setShowEditSubscriber(false); setEditingSubscriber(null); onReload();
    } catch (error) { alert(t('שגיאה בעדכון המנוי', 'Error updating subscriber')); }
    finally { setUpdatingSubscriber(false); }
  };

  const deleteSubscriber = async (id) => {
    if (!confirm(t('האם למחוק מנוי זה?', 'Delete this subscriber?'))) return;
    await base44.entities.Subscribers.delete(id);
    onReload();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t(`האם למחוק ${selectedIds.length} מנויים?`, `Delete ${selectedIds.length} subscribers?`))) return;
    for (const id of selectedIds) await base44.entities.Subscribers.delete(id);
    setSelectedIds([]); onReload();
  };

  const handleUpdateSubscriberGroup = async (subscriberId, newGroup) => {
    await base44.entities.Subscribers.update(subscriberId, { group: newGroup });
    onReload();
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) { alert(t('אנא הזיני שם קבוצה', 'Enter group name')); return; }
    if (activeGroups.includes(newGroupName.trim())) { alert(t('קבוצה בשם זה כבר קיימת', 'Group already exists')); return; }
    const groupName = newGroupName.trim();
    
    // If subscribers are selected, add them to this group
    if (addGroupSelectedIds.length > 0) {
      for (const subId of addGroupSelectedIds) {
        const sub = subscribers.find(s => s.id === subId);
        if (sub) {
          const currentGroups = sub.groups && Array.isArray(sub.groups) ? [...sub.groups] : (sub.group ? [sub.group] : []);
          if (!currentGroups.includes(groupName)) {
            currentGroups.push(groupName);
          }
          await base44.entities.Subscribers.update(subId, { groups: currentGroups });
        }
      }
      alert(`הקבוצה "${groupName}" נוספה עם ${addGroupSelectedIds.length} מנויים!`);
    } else {
      // Create placeholder subscriber to register the group
      await base44.entities.Subscribers.create({ email: `_placeholder_${Date.now()}@group.internal`, name: `[מחזיק מקום - ${groupName}]`, group: groupName, groups: [groupName], subscribed: false, unsubscribe_token: generateToken(), source: 'קבוצה חדשה' });
      alert(`הקבוצה "${groupName}" נוספה!`);
    }
    setShowAddGroup(false); setNewGroupName(''); setAddGroupSelectedIds([]); setAddGroupSearch(''); onReload();
  };

  return (
    <div className="space-y-6">
      {/* Group stats */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm" style={{ borderRadius: 'var(--crm-border-radius)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-[var(--crm-text)]">{t('סטטיסטיקת קבוצות', 'Group Statistics')}</h3>
          <button onClick={() => setShowAddGroup(true)} className="bg-[var(--crm-action)] text-[var(--crm-text)] px-4 py-2 text-sm font-semibold flex items-center gap-2" style={{ borderRadius: 'var(--crm-button-radius)' }}>
            <Plus className="w-4 h-4" />{t('הוסף קבוצה', 'Add Group')}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeGroups.length === 0 ? <p className="text-gray-600 text-center col-span-full">{t('אין קבוצות', 'No groups')}</p> :
            activeGroups.map(group => (
              <div key={group} onClick={() => setFilterGroup(group === filterGroup ? 'all' : group)} className={`bg-gray-50 rounded-xl p-4 border cursor-pointer hover:shadow-md transition-all ${filterGroup === group ? 'border-[var(--crm-primary)] ring-2 ring-[var(--crm-primary)]/20' : 'border-gray-100 hover:border-[var(--crm-primary)]'}`}>
                <div className="text-2xl font-bold text-[var(--crm-primary)]">{getGroupSubscriberCount(group)}</div>
                <div className="text-sm text-[var(--crm-text)] opacity-70">{group}</div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ backgroundColor: getGroupColor(group), width: `${Math.min(100, (getGroupSubscriberCount(group) / SUBSCRIBERS_PER_GROUP) * 100)}%` }} />
                </div>
              </div>
            ))}
        </div>
      </div>

      {showAddGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('הוסף קבוצה חדשה', 'Add New Group')}</h3>
              <button onClick={() => { setShowAddGroup(false); setNewGroupName(''); setAddGroupSelectedIds([]); setAddGroupSearch(''); }}><X className="w-6 h-6" /></button>
            </div>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder={t('שם הקבוצה', 'Group name')} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" />
            
            {/* Subscriber multi-select */}
            <div className="border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('בחרי מנויים לשיוך לקבוצה (אופציונלי)', 'Select subscribers to add to group (optional)')}</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input type="text" value={addGroupSearch} onChange={(e) => setAddGroupSearch(e.target.value)} placeholder={t('חפשי מנוי...', 'Search subscriber...')} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              {addGroupSelectedIds.length > 0 && (
                <p className="text-xs text-[var(--crm-primary)] font-medium mb-2">{addGroupSelectedIds.length} {t('מנויים נבחרו', 'selected')}</p>
              )}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {subscribers
                  .filter(s => s.subscribed !== false && !s.email?.startsWith('_placeholder_'))
                  .filter(s => !addGroupSearch || (s.name || '').toLowerCase().includes(addGroupSearch.toLowerCase()) || (s.email || '').toLowerCase().includes(addGroupSearch.toLowerCase()))
                  .map(sub => (
                    <label key={sub.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addGroupSelectedIds.includes(sub.id)}
                        onChange={(e) => setAddGroupSelectedIds(e.target.checked ? [...addGroupSelectedIds, sub.id] : addGroupSelectedIds.filter(id => id !== sub.id))}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sub.name || sub.email}</p>
                        <p className="text-xs text-gray-500 truncate">{sub.group || ''}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddGroup} className="flex-1 bg-[var(--crm-primary)] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"><Plus className="w-5 h-5" />{t('הוסף', 'Add')}</button>
              <button onClick={() => { setShowAddGroup(false); setNewGroupName(''); setAddGroupSelectedIds([]); setAddGroupSearch(''); }} className="px-6 py-3 border border-gray-300 rounded-lg">{t('ביטול', 'Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete} className="border-red-500 text-red-500 bg-white border px-4 py-2 font-semibold flex items-center gap-2" style={{ borderRadius: 'var(--crm-button-radius)' }}>
              <Trash2 className="w-5 h-5" />{t('מחק', 'Delete')} {selectedIds.length}
            </button>
          )}
          <ExportButtons
            headers={['מייל', 'וואטסאפ', 'שם', 'תפקיד', 'חברה', 'קבוצה', 'סטטוס', 'הסכמה', 'הערות']}
            rows={filteredSubscribers.map(s => [
              s.email || '', s.whatsapp || '', s.name || '', s.job_title || '',
              s.company || '', s.group || '', s.subscribed ? 'פעיל' : 'לא פעיל',
              s.marketing_consent ? 'כן' : 'לא', s.notes || ''
            ])}
            fileName="subscribers"
            sheetTitle="מנויים"
          />
          <button onClick={() => setShowAddSubscriber(true)} className="bg-[var(--crm-action)] text-[var(--crm-text)] px-4 py-2 font-semibold flex items-center gap-2" style={{ borderRadius: 'var(--crm-button-radius)' }}>
            <Plus className="w-5 h-5" />{t('הוסף מנוי', 'Add Subscriber')}
          </button>
        </div>
      </div>

      {/* Add subscriber modal */}
      {showAddSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('הוסף מנוי חדש', 'Add New Subscriber')}</h3>
              <button onClick={() => setShowAddSubscriber(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              {[['email', t('מייל', 'Email'), 'email', 'example@email.com'], ['whatsapp', t('וואטסאפ', 'WhatsApp'), 'text', '972501234567'], ['name', t('שם', 'Name'), 'text', t('שם פרטי', 'First name')], ['job_title', t('תפקיד', 'Job Title'), 'text', t('תפקיד', 'Job Title')], ['company', t('חברה', 'Company'), 'text', t('שם החברה', 'Company name')]].map(([field, label, type, placeholder]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input type={type} value={newSubscriber[field] || ''} onChange={(e) => setNewSubscriber({...newSubscriber, [field]: e.target.value})} placeholder={placeholder} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('הערות', 'Notes')}</label>
                <textarea value={newSubscriber.notes || ''} onChange={(e) => setNewSubscriber({...newSubscriber, notes: e.target.value})} rows="2" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <input type="checkbox" id="add-to-contacts" checked={addToContacts} onChange={(e) => setAddToContacts(e.target.checked)} className="w-5 h-5" />
                <label htmlFor="add-to-contacts" className="text-sm font-medium text-gray-700 cursor-pointer">{t('הוסף גם לאנשי קשר (CRM)', 'Also add to Contacts (CRM)')}</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={handleAddSubscriber} disabled={addingSubscriber} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                  {addingSubscriber ? <><Loader2 className="w-5 h-5 animate-spin" />{t('מוסיף...', 'Adding...')}</> : <><Plus className="w-5 h-5" />{t('הוסף', 'Add')}</>}
                </button>
                <button onClick={() => { setShowAddSubscriber(false); setAddToContacts(false); }} className="px-6 py-3 border border-gray-300 rounded-lg">{t('ביטול', 'Cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit subscriber modal */}
      {showEditSubscriber && editingSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('ערוך מנוי', 'Edit Subscriber')}</h3>
              <button onClick={() => { setShowEditSubscriber(false); setEditingSubscriber(null); }}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              {[['email', t('מייל', 'Email'), 'email'], ['whatsapp', t('וואטסאפ', 'WhatsApp'), 'text'], ['name', t('שם', 'Name'), 'text'], ['job_title', t('תפקיד', 'Job Title'), 'text'], ['company', t('חברה', 'Company'), 'text']].map(([field, label, type]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input type={type} value={editingSubscriber[field] || ''} onChange={(e) => setEditingSubscriber({...editingSubscriber, [field]: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
              ))}
              {/* Student link */}
              {editingSubscriber.email && studentsMap[editingSubscriber.email.toLowerCase()] && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <a href={`/Students?student_id=${studentsMap[editingSubscriber.email.toLowerCase()].id}`} className="text-sm font-medium text-[var(--crm-primary)] hover:underline flex items-center gap-2">
                    👤 {t('צפה בכרטיס משתתף:', 'View student card:')} {studentsMap[editingSubscriber.email.toLowerCase()].full_name}
                  </a>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('קבוצה ראשית', 'Primary Group')}</label>
                <select value={editingSubscriber.group} onChange={(e) => setEditingSubscriber({...editingSubscriber, group: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  {activeGroups.filter(g => g !== 'כל הרשימה').map(group => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('קבוצות נוספות', 'Additional Groups')}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(editingSubscriber.groups || []).map((g, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-[var(--crm-primary)]/10 text-[var(--crm-primary)]">
                      {g}
                      <button onClick={() => {
                        const updated = (editingSubscriber.groups || []).filter((_, i) => i !== idx);
                        setEditingSubscriber({...editingSubscriber, groups: updated});
                      }} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <select onChange={(e) => {
                  if (e.target.value && !(editingSubscriber.groups || []).includes(e.target.value)) {
                    setEditingSubscriber({...editingSubscriber, groups: [...(editingSubscriber.groups || []), e.target.value]});
                  }
                  e.target.value = '';
                }} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" defaultValue="">
                  <option value="">{t('+ הוסף לקבוצה...', '+ Add to group...')}</option>
                  {activeGroups.filter(g => g !== 'כל הרשימה' && !(editingSubscriber.groups || []).includes(g)).map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={editingSubscriber.subscribed} onChange={(e) => setEditingSubscriber({...editingSubscriber, subscribed: e.target.checked})} className="w-4 h-4" />
                <label className="text-sm font-medium text-gray-700">{t('מנוי פעיל', 'Active Subscriber')}</label>
              </div>
              <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                <input type="checkbox" checked={editingSubscriber.marketing_consent || false} onChange={(e) => setEditingSubscriber({...editingSubscriber, marketing_consent: e.target.checked})} className="w-4 h-4" />
                <label className="text-sm font-medium text-gray-700">{t('אושר מדיניות הפרטיות והסכמה לקבל עדכונים במייל ובוואטסאפ', 'Privacy policy and marketing consent approved')}</label>
              </div>
              <p className="text-xs text-gray-500 -mt-2">{t('שדה זה מתעדכן אוטומטית מטופס האתר, אך ניתן לעדכן גם ידנית', 'Updated automatically from website form, but can also be updated manually')}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={handleUpdateSubscriber} disabled={updatingSubscriber} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                  {updatingSubscriber ? <><Loader2 className="w-5 h-5 animate-spin" />{t('מעדכן...', 'Updating...')}</> : <><CheckCircle className="w-5 h-5" />{t('עדכן', 'Update')}</>}
                </button>
                <button onClick={() => { setShowEditSubscriber(false); setEditingSubscriber(null); }} className="px-6 py-3 border border-gray-300 rounded-lg">{t('ביטול', 'Cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder={t('חיפוש...', 'Search...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
          <option value="all">{t('כל הקבוצות', 'All Groups')}</option>
          {activeGroups.map(group => <option key={group} value={group}>{group} ({getGroupSubscriberCount(group)})</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
          <option value="all">{t('הכל', 'All')}</option>
          <option value="active">{t('פעילים', 'Active')}</option>
          <option value="inactive">{t('לא פעילים', 'Inactive')}</option>
        </select>
        <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
          <option value="all">{t('כל הערוצים', 'All Channels')}</option>
          <option value="has_whatsapp">{t('יש וואטסאפ', 'Has WhatsApp')}</option>
          <option value="has_email">{t('יש מייל', 'Has Email')}</option>
          <option value="both">{t('יש שניהם', 'Has Both')}</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : filteredSubscribers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('לא נמצאו מנויים', 'No subscribers found')}</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" checked={selectedIds.length === filteredSubscribers.length && filteredSubscribers.length > 0} onChange={() => setSelectedIds(selectedIds.length === filteredSubscribers.length ? [] : filteredSubscribers.map(s => s.id))} className="w-5 h-5" />
              <span className="text-xs text-gray-400">{t('בחר הכל', 'Select All')}</span>
            </div>
            {filteredSubscribers.map((sub) => (
              <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4" style={{ borderRadius: 'var(--crm-border-radius)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.includes(sub.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, sub.id] : selectedIds.filter(id => id !== sub.id))} className="w-5 h-5" />
                    <span className="font-semibold text-[var(--crm-text)]">{sub.name || t('ללא שם', 'No name')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sub.subscribed
                      ? <span className="px-2 py-0.5 text-xs font-medium rounded-full text-white" style={{ backgroundColor: 'var(--crm-accent)' }}>{t('פעיל', 'Active')}</span>
                      : <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">{t('לא פעיל', 'Inactive')}</span>
                    }
                    {sub.marketing_consent && <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">✓</span>}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  {sub.email && <div className="truncate" dir="ltr"><span className="text-gray-400 text-xs">{t('מייל', 'Email')}: </span>{sub.email}</div>}
                  {sub.whatsapp && (
                    <div className="flex items-center gap-2" dir="ltr">
                      <span className="text-gray-400 text-xs">{t('וואטסאפ', 'WA')}: </span>
                      <span>{sub.whatsapp}</span>
                      <a href={`https://wa.me/${sub.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 p-0.5">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                  {sub.job_title && <div><span className="text-gray-400 text-xs">{t('תפקיד', 'Title')}: </span>{sub.job_title}</div>}
                  {sub.company && <div><span className="text-gray-400 text-xs">{t('חברה', 'Co')}: </span>{sub.company}</div>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(() => {
                    const allGroups = new Set();
                    if (sub.group) allGroups.add(sub.group);
                    if (sub.groups && Array.isArray(sub.groups)) sub.groups.forEach(g => allGroups.add(g));
                    return [...allGroups].map((g, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: getGroupColor(g), color: getGroupTextColor(g) }}>{g}</span>
                    ));
                  })()}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <SubscriberStudentLink email={sub.email} studentsMap={studentsMap} />
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingSubscriber({ id: sub.id, email: sub.email, whatsapp: sub.whatsapp || '', name: sub.name || '', job_title: sub.job_title || '', company: sub.company || '', notes: sub.notes || '', group: sub.group, groups: sub.groups || [], subscribed: sub.subscribed, marketing_consent: sub.marketing_consent || false }); setShowEditSubscriber(true); }} className="text-[var(--crm-primary)] p-2 hover:bg-[var(--crm-primary)]/10 rounded-lg">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSubscriber(sub.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-center w-12">
                    <input type="checkbox" checked={selectedIds.length === filteredSubscribers.length && filteredSubscribers.length > 0} onChange={() => setSelectedIds(selectedIds.length === filteredSubscribers.length ? [] : filteredSubscribers.map(s => s.id))} className="w-5 h-5" />
                  </th>
                  {[t('מייל', 'Email'), t('וואטסאפ', 'WhatsApp'), t('שם', 'Name'), t('משתתף', 'Student'), t('קבוצות', 'Groups'), t('הסכמה', 'Consent'), t('סטטוס', 'Status'), t('פעולות', 'Actions')].map(h => (
                    <th key={h} className="px-4 py-3 text-right text-xs font-normal text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" checked={selectedIds.includes(sub.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, sub.id] : selectedIds.filter(id => id !== sub.id))} className="w-5 h-5" />
                    </td>
                    <td className="px-4 py-4 text-sm font-medium" style={{ wordBreak: 'break-all' }}>{sub.email || '-'}</td>
                    <td className="px-4 py-4 text-sm" style={{ wordBreak: 'break-all' }}>
                      {sub.whatsapp ? (
                        <div className="flex items-center gap-2">
                          <span>{sub.whatsapp}</span>
                          <a href={`https://wa.me/${sub.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded-lg" title="WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">{sub.name || '-'}</td>
                    <td className="px-4 py-4 text-sm text-center">
                      <SubscriberStudentLink email={sub.email} studentsMap={studentsMap} />
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const allGroups = new Set();
                          if (sub.group) allGroups.add(sub.group);
                          if (sub.groups && Array.isArray(sub.groups)) sub.groups.forEach(g => allGroups.add(g));
                          return [...allGroups].map((g, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: getGroupColor(g), color: getGroupTextColor(g) }}>{g}</span>
                          ));
                        })()}
                        {!sub.group && (!sub.groups || sub.groups.length === 0) && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-center">
                      {sub.marketing_consent
                        ? <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">✓</span>
                        : <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-400">✗</span>
                      }
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {sub.subscribed
                        ? <span className="px-3 py-1 text-xs font-medium rounded-full text-white" style={{ backgroundColor: 'var(--crm-accent)' }}>{t('פעיל', 'Active')}</span>
                        : <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600">{t('לא פעיל', 'Inactive')}</span>
                      }
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingSubscriber({ id: sub.id, email: sub.email, whatsapp: sub.whatsapp || '', name: sub.name || '', job_title: sub.job_title || '', company: sub.company || '', notes: sub.notes || '', group: sub.group, groups: sub.groups || [], subscribed: sub.subscribed, marketing_consent: sub.marketing_consent || false }); setShowEditSubscriber(true); }} className="text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80 p-2 hover:bg-[var(--crm-primary)]/10 rounded-lg">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteSubscriber(sub.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}