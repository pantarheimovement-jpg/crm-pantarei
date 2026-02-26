import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Settings, Save, Loader2, Palette, Type, Image as ImageIcon, FileText, Tag, Zap, Plus, Trash2, GripVertical, MessageCircle, Copy, Check, Mail } from 'lucide-react';
import EmailTemplateEditor from '../components/settings/EmailTemplateEditor';

export default function CRMSettings() {
  const [activeTab, setActiveTab] = useState('crm-general');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // New state for separate entities
  const [systemTexts, setSystemTexts] = useState(null);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const [automationSettings, setAutomationSettings] = useState(null);
  const [generalSettings, setGeneralSettings] = useState(null);
  const [designSettings, setDesignSettings] = useState(null);
  const [newStatus, setNewStatus] = useState({ name: '', color: '#6D436D', order_index: 0 });
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    loadSystemTexts();
    loadLeadStatuses();
    loadAutomationSettings();
    loadGeneralSettings();
    loadDesignSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'statuses') {
      loadLeadStatuses();
    }
  }, [activeTab]);

  const loadSystemTexts = async () => {
    try {
      const data = await base44.entities.SystemTexts.list();
      if (data && data.length > 0) {
        setSystemTexts(data[0]);
      }
    } catch (error) {
      console.error('Error loading system texts:', error);
    }
  };

  const loadLeadStatuses = async () => {
    try {
      const data = await base44.entities.LeadStatuses.list();
      setLeadStatuses(data || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const loadAutomationSettings = async () => {
    try {
      const data = await base44.entities.AutomationSettings.list();
      if (data && data.length > 0) {
        setAutomationSettings(data[0]);
      }
    } catch (error) {
      console.error('Error loading automation settings:', error);
    }
  };

  const loadGeneralSettings = async () => {
    try {
      const data = await base44.entities.GeneralSettings.list();
      if (data && data.length > 0) {
        setGeneralSettings(data[0]);
      }
    } catch (error) {
      console.error('Error loading general settings:', error);
    }
  };

  const loadDesignSettings = async () => {
    try {
      const data = await base44.entities.DesignSettings.list();
      if (data && data.length > 0) {
        setDesignSettings(data[0]);
      }
    } catch (error) {
      console.error('Error loading design settings:', error);
    }
  };

  const handleSaveSystemTexts = async () => {
    setSaving(true);
    try {
      if (systemTexts && systemTexts.id) {
        await base44.entities.SystemTexts.update(systemTexts.id, systemTexts);
      } else {
        await base44.entities.SystemTexts.create(systemTexts || {});
      }
      await loadSystemTexts();
      alert('תוויות נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving system texts:', error);
      alert('שגיאה בשמירת תוויות');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStatus = async () => {
    if (!newStatus.name) {
      alert('אנא הזיני שם סטטוס');
      return;
    }
    try {
      await base44.entities.LeadStatuses.create({
        ...newStatus,
        order_index: leadStatuses.length
      });
      setNewStatus({ name: '', color: '#6D436D', order_index: 0 });
      await loadLeadStatuses();
    } catch (error) {
      console.error('Error adding status:', error);
      alert('שגיאה בהוספת סטטוס');
    }
  };

  const handleDeleteStatus = async (id) => {
    if (!confirm('האם למחוק סטטוס זה?')) return;
    try {
      await base44.entities.LeadStatuses.delete(id);
      await loadLeadStatuses();
    } catch (error) {
      console.error('Error deleting status:', error);
      alert('שגיאה במחיקת סטטוס');
    }
  };

  const handleSaveAutomation = async () => {
    setSaving(true);
    try {
      if (automationSettings && automationSettings.id) {
        await base44.entities.AutomationSettings.update(automationSettings.id, automationSettings);
      } else {
        await base44.entities.AutomationSettings.create(automationSettings || {});
      }
      await loadAutomationSettings();
      alert('הגדרות אוטומציה נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving automation:', error);
      alert('שגיאה בשמירת הגדרות אוטומציה');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    setSaving(true);
    try {
      if (generalSettings && generalSettings.id) {
        await base44.entities.GeneralSettings.update(generalSettings.id, generalSettings);
      } else {
        await base44.entities.GeneralSettings.create(generalSettings || {});
      }
      await loadGeneralSettings();
      alert('הגדרות כלליות נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving general settings:', error);
      alert('שגיאה בשמירת הגדרות כלליות');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDesignSettings = async () => {
    setSaving(true);
    try {
      if (designSettings && designSettings.id) {
        await base44.entities.DesignSettings.update(designSettings.id, designSettings);
      } else {
        await base44.entities.DesignSettings.create(designSettings || {});
      }
      await loadDesignSettings();
      alert('הגדרות עיצוב נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving design settings:', error);
      alert('שגיאה בשמירת הגדרות עיצוב');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUploadGeneral = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('אנא בחרי קובץ תמונה');
      return;
    }
    setUploadingLogo(true);
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      setGeneralSettings({...generalSettings, logo_url: uploadedFile.file_url});
      alert('הלוגו הועלה בהצלחה!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('שגיאה בהעלאת הלוגו');
    } finally {
      setUploadingLogo(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-[#005e6c]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הגדרות CRM</h1>
              <p className="mt-1 text-sm text-gray-500">נהלי את הגדרות המערכת</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('crm-general')}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === 'crm-general'
                    ? 'border-b-2 border-[#6D436D] text-[#6D436D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="w-5 h-5 inline-block ml-2" />
                הגדרות כלליות
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === 'design'
                    ? 'border-b-2 border-[#6D436D] text-[#6D436D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Palette className="w-5 h-5 inline-block ml-2" />
                עיצוב ומיתוג
              </button>
              <button
                onClick={() => setActiveTab('labels')}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === 'labels'
                    ? 'border-b-2 border-[#005e6c] text-[#005e6c]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Tag className="w-5 h-5 inline-block ml-2" />
                תוויות ושדות
              </button>
              <button
                onClick={() => setActiveTab('statuses')}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === 'statuses'
                    ? 'border-b-2 border-[#005e6c] text-[#005e6c]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <GripVertical className="w-5 h-5 inline-block ml-2" />
                סטטוסים ושלבים
              </button>
              <button
                onClick={() => setActiveTab('automation')}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === 'automation'
                    ? 'border-b-2 border-[#005e6c] text-[#005e6c]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Zap className="w-5 h-5 inline-block ml-2" />
                אוטומציה
              </button>
              <button
                onClick={() => setActiveTab('email-templates')}
                className={`px-6 py-4 font-medium whitespace-nowrap ${
                  activeTab === 'email-templates'
                    ? 'border-b-2 border-[#6D436D] text-[#6D436D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-5 h-5 inline-block ml-2" />
                תבניות מייל
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* CRM General Tab */}
            {activeTab === 'crm-general' && generalSettings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי עסק</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם המערכת</label>
                      <input
                        type="text"
                        value={generalSettings.system_name || ''}
                        onChange={(e) => setGeneralSettings({...generalSettings, system_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="Pantarhei CRM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">טלפון עסק</label>
                      <input
                        type="text"
                        value={generalSettings.business_phone || ''}
                        onChange={(e) => setGeneralSettings({...generalSettings, business_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="050-1234567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">מייל עסק</label>
                      <input
                        type="email"
                        value={generalSettings.business_email || ''}
                        onChange={(e) => setGeneralSettings({...generalSettings, business_email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="info@pantarhei.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">כתובת עסק</label>
                      <input
                        type="text"
                        value={generalSettings.business_address || ''}
                        onChange={(e) => setGeneralSettings({...generalSettings, business_address: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="רחוב הדוגמא 123, תל אביב"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">לוגו מערכת</h3>
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={generalSettings.logo_url || ''}
                      onChange={(e) => setGeneralSettings({...generalSettings, logo_url: e.target.value})}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://example.com/logo.png"
                    />
                    <label className="bg-[#6D436D] text-white px-4 py-2 rounded-full font-semibold hover:bg-[#5a365a] cursor-pointer flex items-center gap-2 whitespace-nowrap">
                      {uploadingLogo ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5" />
                          העלה לוגו
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUploadGeneral}
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                  {generalSettings.logo_url && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <img src={generalSettings.logo_url} alt="Logo" className="h-16 rounded" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">הגדרות ברירת מחדל</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">משך ניסיון (שיעורים)</label>
                      <input
                        type="number"
                        value={generalSettings.default_trial_duration || 1}
                        onChange={(e) => setGeneralSettings({...generalSettings, default_trial_duration: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ימים למעקב אוטומטי</label>
                      <input
                        type="number"
                        value={generalSettings.auto_followup_days || 3}
                        onChange={(e) => setGeneralSettings({...generalSettings, auto_followup_days: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={handleSaveGeneralSettings}
                    disabled={saving}
                    className="px-8 py-3 bg-[#6D436D] text-white rounded-full font-semibold hover:bg-[#5a365a] disabled:opacity-50"
                  >
                    {saving ? 'שומר...' : 'שמור הגדרות כלליות'}
                  </button>
                </div>
              </div>
            )}

            {/* Design Tab */}
            {activeTab === 'design' && designSettings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">צבעים</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">רקע (קרם)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={designSettings.background_color || '#FDF8F0'}
                          onChange={(e) => setDesignSettings({...designSettings, background_color: e.target.value})}
                          className="h-10 w-20 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={designSettings.background_color || '#FDF8F0'}
                          onChange={(e) => setDesignSettings({...designSettings, background_color: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ראשי (סגול)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={designSettings.primary_color || '#6D436D'}
                          onChange={(e) => setDesignSettings({...designSettings, primary_color: e.target.value})}
                          className="h-10 w-20 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={designSettings.primary_color || '#6D436D'}
                          onChange={(e) => setDesignSettings({...designSettings, primary_color: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">הדגשה (טרקוטה)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={designSettings.accent_color || '#D29486'}
                          onChange={(e) => setDesignSettings({...designSettings, accent_color: e.target.value})}
                          className="h-10 w-20 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={designSettings.accent_color || '#D29486'}
                          onChange={(e) => setDesignSettings({...designSettings, accent_color: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">פעולה (זהב)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={designSettings.action_color || '#FAD980'}
                          onChange={(e) => setDesignSettings({...designSettings, action_color: e.target.value})}
                          className="h-10 w-20 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={designSettings.action_color || '#FAD980'}
                          onChange={(e) => setDesignSettings({...designSettings, action_color: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">טקסט (חום כהה)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={designSettings.text_color || '#5E4B35'}
                          onChange={(e) => setDesignSettings({...designSettings, text_color: e.target.value})}
                          className="h-10 w-20 rounded border border-gray-300"
                        />
                        <input
                          type="text"
                          value={designSettings.text_color || '#5E4B35'}
                          onChange={(e) => setDesignSettings({...designSettings, text_color: e.target.value})}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">טיפוגרפיה</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">פונט כותרות</label>
                      <input
                        type="text"
                        value={designSettings.font_headings || 'Amatic SC'}
                        onChange={(e) => setDesignSettings({...designSettings, font_headings: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">פונט תוכן</label>
                      <input
                        type="text"
                        value={designSettings.font_body || 'Heebo'}
                        onChange={(e) => setDesignSettings({...designSettings, font_body: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">עיצוב רכיבים</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">עגלות פינות (px)</label>
                      <input
                        type="number"
                        value={designSettings.border_radius || 12}
                        onChange={(e) => setDesignSettings({...designSettings, border_radius: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">עגלות כפתורים (px)</label>
                      <input
                        type="number"
                        value={designSettings.button_radius || 50}
                        onChange={(e) => setDesignSettings({...designSettings, button_radius: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={handleSaveDesignSettings}
                    disabled={saving}
                    className="px-8 py-3 bg-[#6D436D] text-white rounded-full font-semibold hover:bg-[#5a365a] disabled:opacity-50"
                  >
                    {saving ? 'שומר...' : 'שמור עיצוב'}
                  </button>
                </div>
              </div>
            )}



            {/* Labels Tab */}
            {activeTab === 'labels' && systemTexts && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">שמות דפי ניווט</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    ערכי את שמות הדפים כפי שיופיעו בסרגל הניווט העליון
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">דשבורד</label>
                      <input
                        type="text"
                        value={systemTexts.page_dashboard || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, page_dashboard: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="דשבורד"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">משתתפים</label>
                      <input
                        type="text"
                        value={systemTexts.page_students || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, page_students: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="משתתפים"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">קורסים</label>
                      <input
                        type="text"
                        value={systemTexts.page_courses || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, page_courses: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="קורסים"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">אינטראקציות</label>
                      <input
                        type="text"
                        value={systemTexts.page_interactions || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, page_interactions: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="אינטראקציות"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">משימות</label>
                      <input
                        type="text"
                        value={systemTexts.page_tasks || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, page_tasks: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="משימות"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ניוזלטר</label>
                      <input
                        type="text"
                        value={systemTexts.page_newsletter || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, page_newsletter: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="ניוזלטר"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">תוויות ישויות</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">משתתפ.ת (יחיד)</label>
                      <input
                        type="text"
                        value={systemTexts.entity_student_singular || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, entity_student_singular: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">משתתפים (רבים)</label>
                      <input
                        type="text"
                        value={systemTexts.entity_student_plural || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, entity_student_plural: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">קורס (יחיד)</label>
                      <input
                        type="text"
                        value={systemTexts.entity_course_singular || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, entity_course_singular: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">קורסים (רבים)</label>
                      <input
                        type="text"
                        value={systemTexts.entity_course_plural || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, entity_course_plural: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">תוויות שדות</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">שם</label>
                      <input
                        type="text"
                        value={systemTexts.label_name || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, label_name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">טלפון</label>
                      <input
                        type="text"
                        value={systemTexts.label_phone || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, label_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">מייל</label>
                      <input
                        type="text"
                        value={systemTexts.label_email || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, label_email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                      <input
                        type="text"
                        value={systemTexts.label_status || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, label_status: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">מקור</label>
                      <input
                        type="text"
                        value={systemTexts.label_source || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, label_source: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">תחום עניין</label>
                      <input
                        type="text"
                        value={systemTexts.label_interest || ''}
                        onChange={(e) => setSystemTexts({...systemTexts, label_interest: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={handleSaveSystemTexts}
                    disabled={saving}
                    className="px-8 py-3 bg-[#6D436D] text-white rounded-lg font-semibold hover:bg-[#5a365a] disabled:opacity-50"
                  >
                    {saving ? 'שומר...' : 'שמור תוויות'}
                  </button>
                </div>
              </div>
            )}

            {/* Statuses Tab */}
            {activeTab === 'statuses' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">סטטוסים קיימים</h3>
                  <div className="space-y-3">
                    {leadStatuses.sort((a, b) => a.order_index - b.order_index).map(status => (
                      <div key={status.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: status.color }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{status.name}</p>
                          {status.description && (
                            <p className="text-sm text-gray-600">{status.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">הוסף סטטוס חדש</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newStatus.name}
                      onChange={(e) => setNewStatus({...newStatus, name: e.target.value})}
                      placeholder="שם סטטוס (למשל: ליד חדש)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="color"
                      value={newStatus.color}
                      onChange={(e) => setNewStatus({...newStatus, color: e.target.value})}
                      className="w-20 h-10 rounded border border-gray-300"
                    />
                    <button
                      onClick={handleAddStatus}
                      className="px-6 py-2 bg-[#6D436D] text-white rounded-lg font-semibold hover:bg-[#5a365a] flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      הוסף
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Automation Tab */}
            {activeTab === 'automation' && automationSettings && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">חיבור סוכן WhatsApp</h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-500 rounded-full">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-2">סוכן AI לווטסאפ</h4>
                        <p className="text-sm text-gray-700 mb-4">
                          חברי את הסוכן לווטסאפ כדי לנהל את ה-CRM דרך הודעות. הסוכן יכול להוסיף משתתפים, קורסים ומשימות.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              const url = window.location.origin + base44.agents.getWhatsAppConnectURL('task_manager');
                              window.open(url, '_blank');
                            }}
                            className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 flex items-center gap-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            חבר לווטסאפ
                          </button>
                          <button
                            onClick={() => {
                              const url = window.location.origin + base44.agents.getWhatsAppConnectURL('task_manager');
                              navigator.clipboard.writeText(url);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                            className="px-6 py-3 border-2 border-green-600 text-green-700 rounded-full font-semibold hover:bg-green-50 flex items-center gap-2"
                          >
                            {copiedLink ? (
                              <>
                                <Check className="w-5 h-5" />
                                הועתק!
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5" />
                                העתק קישור
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">הגדרות WhatsApp</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={automationSettings.whatsapp_bot_enabled || false}
                        onChange={(e) => setAutomationSettings({...automationSettings, whatsapp_bot_enabled: e.target.checked})}
                        className="w-5 h-5 text-[#6D436D]"
                      />
                      <label className="text-sm font-medium text-gray-700">הפעל בוט WhatsApp</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        זמן תגובה אוטומטית (דקות)
                      </label>
                      <input
                        type="number"
                        value={automationSettings.auto_response_time || 1}
                        onChange={(e) => setAutomationSettings({...automationSettings, auto_response_time: parseInt(e.target.value)})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        הודעת ברוכים הבאים
                      </label>
                      <textarea
                        value={automationSettings.welcome_message || ''}
                        onChange={(e) => setAutomationSettings({...automationSettings, welcome_message: e.target.value})}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">אינטגרציות</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Webhook (Summit)
                      </label>
                      <input
                        type="text"
                        value={automationSettings.webhook_url || ''}
                        onChange={(e) => setAutomationSettings({...automationSettings, webhook_url: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תבנית קישור תשלום
                      </label>
                      <input
                        type="text"
                        value={automationSettings.payment_link_template || ''}
                        onChange={(e) => setAutomationSettings({...automationSettings, payment_link_template: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="https://summit.co.il/..."
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={automationSettings.auto_tagging_enabled || false}
                        onChange={(e) => setAutomationSettings({...automationSettings, auto_tagging_enabled: e.target.checked})}
                        className="w-5 h-5 text-[#6D436D]"
                      />
                      <label className="text-sm font-medium text-gray-700">הפעל סיווג אוטומטי</label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <button
                    onClick={handleSaveAutomation}
                    disabled={saving}
                    className="px-8 py-3 bg-[#6D436D] text-white rounded-lg font-semibold hover:bg-[#5a365a] disabled:opacity-50"
                  >
                    {saving ? 'שומר...' : 'שמור הגדרות אוטומציה'}
                  </button>
                </div>
              </div>
            )}


            <div style={{ display: activeTab === 'email-templates' ? 'block' : 'none' }}>
              <EmailTemplateEditor />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}