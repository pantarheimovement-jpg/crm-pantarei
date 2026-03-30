import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Trash2, Edit3, Loader2, X, CheckCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import ExportButtons from '../shared/ExportButtons';

const SUBSCRIBERS_PER_GROUP = 280;

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function SubscribersList({ subscribers, loading, activeGroups, onReload }) {
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

  const getGroupSubscriberCount = (groupName) => subscribers.filter(s => s.group === groupName).length;

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = !searchTerm ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || sub.group === filterGroup;
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

  const handleAddSubscriber = async () => {
    if (!newSubscriber.email && !newSubscriber.whatsapp) { alert(t('אנא הזיני כתובת מייל או מספר וואטסאפ', 'Please enter an email or WhatsApp')); return; }
    setAddingSubscriber(true);
    try {
      if (newSubscriber.email) {
        const existing = await base44.entities.Subscribers.filter({ email: newSubscriber.email });
        if (existing?.length > 0) { alert(t('המייל כבר קיים ברשימה', 'Email already exists')); setAddingSubscriber(false); return; }
      }
      const assignedGroup = await getAvailableGroup();
      await base44.entities.Subscribers.create({ ...newSubscriber, group: assignedGroup, subscribed: true, unsubscribe_token: generateToken(), source: 'הוספה ידנית' });
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
        group: editingSubscriber.group, subscribed: editingSubscriber.subscribed,
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
    await base44.entities.Subscribers.create({ email: `_placeholder_${Date.now()}@group.internal`, name: `[מחזיק מקום - ${newGroupName.trim()}]`, group: newGroupName.trim(), subscribed: false, unsubscribe_token: generateToken(), source: 'קבוצה חדשה' });
    alert(`הקבוצה "${newGroupName.trim()}" נוספה!`);
    setShowAddGroup(false); setNewGroupName(''); onReload();
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
              <div key={group} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-2xl font-bold text-[var(--crm-primary)]">{getGroupSubscriberCount(group)}</div>
                <div className="text-sm text-[var(--crm-text)] opacity-70">{group}</div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--crm-primary)', width: `${Math.min(100, (getGroupSubscriberCount(group) / SUBSCRIBERS_PER_GROUP) * 100)}%` }} />
                </div>
              </div>
            ))}
        </div>
      </div>

      {showAddGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t('הוסף קבוצה חדשה', 'Add New Group')}</h3>
              <button onClick={() => { setShowAddGroup(false); setNewGroupName(''); }}><X className="w-6 h-6" /></button>
            </div>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder={t('שם הקבוצה', 'Group name')} className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" />
            <div className="flex gap-3">
              <button onClick={handleAddGroup} className="flex-1 bg-[var(--crm-primary)] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"><Plus className="w-5 h-5" />{t('הוסף', 'Add')}</button>
              <button onClick={() => { setShowAddGroup(false); setNewGroupName(''); }} className="px-6 py-3 border border-gray-300 rounded-lg">{t('ביטול', 'Cancel')}</button>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('קבוצה', 'Group')}</label>
                <select value={editingSubscriber.group} onChange={(e) => setEditingSubscriber({...editingSubscriber, group: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  {activeGroups.map(group => <option key={group} value={group}>{group}</option>)}
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
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100" style={{ borderRadius: 'var(--crm-border-radius)' }}>
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-center w-12">
                  <input type="checkbox" checked={selectedIds.length === filteredSubscribers.length && filteredSubscribers.length > 0} onChange={() => setSelectedIds(selectedIds.length === filteredSubscribers.length ? [] : filteredSubscribers.map(s => s.id))} className="w-5 h-5" />
                </th>
                {[t('מייל', 'Email'), t('וואטסאפ', 'WhatsApp'), t('שם', 'Name'), t('תפקיד', 'Job Title'), t('חברה', 'Company'), t('קבוצה', 'Group'), t('הסכמה', 'Consent'), t('סטטוס', 'Status'), t('פעולות', 'Actions')].map(h => (
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
                  <td className="px-4 py-4 text-sm" style={{ wordBreak: 'break-all' }}>{sub.whatsapp || '-'}</td>
                  <td className="px-4 py-4 text-sm font-medium">{sub.name || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{sub.job_title || '-'}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{sub.company || '-'}</td>
                  <td className="px-4 py-4 text-sm">
                    <select value={sub.group} onChange={(e) => handleUpdateSubscriberGroup(sub.id, e.target.value)} className="w-full px-3 py-1.5 text-xs font-medium rounded-full text-white border-0" style={{ backgroundColor: 'var(--crm-primary)', borderRadius: 'var(--crm-button-radius)' }}>
                      {activeGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
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
                      <button onClick={() => { setEditingSubscriber({ id: sub.id, email: sub.email, whatsapp: sub.whatsapp || '', name: sub.name || '', job_title: sub.job_title || '', company: sub.company || '', notes: sub.notes || '', group: sub.group, subscribed: sub.subscribed, marketing_consent: sub.marketing_consent || false }); setShowEditSubscriber(true); }} className="text-[var(--crm-primary)] hover:text-[var(--crm-primary)]/80 p-2 hover:bg-[var(--crm-primary)]/10 rounded-lg">
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
      )}
    </div>
  );
}