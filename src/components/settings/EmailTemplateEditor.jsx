import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Trash2, Eye, Save, Image as ImageIcon, X } from 'lucide-react';

const DEFAULT_TEMPLATE_SECTIONS = {
  logo_url: '',
  header_title: 'ניוזלטר מפנטהרי',
  greeting: 'שלום {{name}},',
  intro_text: 'ברוכים הבאים לניוזלטר שלנו.',
  blocks: [
    { id: 1, type: 'text', title: 'כותרת לבלוק', content: 'כתבי כאן את תוכן הבלוק שלך...', button_text: '', button_url: '' },
  ],
  image_url: '',
  video_thumbnail_url: '',
  video_url: '',
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  contact_extra: '',
  social_whatsapp: '',
  social_facebook: '',
  social_instagram: '',
  social_youtube: '',
};

function buildHtmlFromSections(s, generalSettings) {
  const phone = s.contact_phone || generalSettings?.business_phone || '';
  const email = s.contact_email || generalSettings?.business_email || '';
  const address = s.contact_address || generalSettings?.business_address || '';
  const systemName = generalSettings?.system_name || 'Pantarhei';
  const logoUrl = s.logo_url || generalSettings?.logo_url || '';

  const blocksHtml = (s.blocks || []).map(block => `
    <div class="content">
      ${block.title ? `<h2 class="section-title">${block.title}</h2>` : ''}
      <p>${(block.content || '').replace(/\n/g, '<br>')}</p>
      ${block.button_text && block.button_url ? `<p style="text-align:center;"><a href="${block.button_url}" class="button">${block.button_text}</a></p>` : ''}
    </div>`).join('\n');

  const imageHtml = s.image_url ? `
    <div class="content">
      <p style="text-align:center;"><img src="${s.image_url}" alt="תמונה" style="width:100%;max-width:500px;border-radius:12px;"></p>
    </div>` : '';

  const videoHtml = s.video_url && s.video_thumbnail_url ? `
    <div class="content">
      <div class="video-container">
        <a href="${s.video_url}" target="_blank">
          <img src="${s.video_thumbnail_url}" alt="צפה בסרטון" style="border-radius:12px;">
        </a>
        <p style="font-size:14px;color:#555;margin-top:10px;">לחצו על התמונה לצפייה בסרטון</p>
      </div>
    </div>` : '';

  const socialHtml = (s.social_whatsapp || s.social_facebook || s.social_instagram || s.social_youtube) ? `
    <div class="social-icons">
      ${s.social_whatsapp ? `<a href="https://wa.me/${s.social_whatsapp}" target="_blank"><img src="https://img.icons8.com/color/48/000000/whatsapp.png" alt="WhatsApp"></a>` : ''}
      ${s.social_facebook ? `<a href="${s.social_facebook}" target="_blank"><img src="https://img.icons8.com/color/48/000000/facebook-new.png" alt="Facebook"></a>` : ''}
      ${s.social_instagram ? `<a href="${s.social_instagram}" target="_blank"><img src="https://img.icons8.com/color/48/000000/instagram-new.png" alt="Instagram"></a>` : ''}
      ${s.social_youtube ? `<a href="${s.social_youtube}" target="_blank"><img src="https://img.icons8.com/color/48/000000/youtube-play.png" alt="YouTube"></a>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&family=Amatic+SC:wght@400;700&display=swap');
:root{--crm-bg:#FDF8F0;--crm-primary:#6D436D;--crm-accent:#D29486;--crm-action:#FAD980;--crm-text:#5E4B35;--crm-border-radius:12px;--crm-button-radius:50px;--font-headings:"Amatic SC",cursive;--font-body:"Rubik",sans-serif;}
body{font-family:var(--font-body);color:var(--crm-text);background-color:var(--crm-bg);margin:0;padding:0;direction:rtl;text-align:right;}
.container{max-width:600px;margin:20px auto;background:#fff;border-radius:var(--crm-border-radius);overflow:hidden;box-shadow:0 4px 8px rgba(0,0,0,0.05);}
.header{background-color:var(--crm-primary);padding:20px;text-align:center;color:#fff;}
.header h1{font-family:var(--font-headings);font-size:32px;margin:0;color:#fff;}
.header img{max-width:150px;margin-bottom:10px;border-radius:var(--crm-border-radius);}
.content{padding:20px 30px;line-height:1.6;}
.section-title{font-family:var(--font-headings);font-size:28px;color:var(--crm-primary);margin-top:20px;margin-bottom:10px;text-align:center;}
.button{display:inline-block;background-color:var(--crm-action);color:var(--crm-text)!important;padding:12px 25px;border-radius:var(--crm-button-radius);font-weight:bold;text-decoration:none;margin:15px 0;}
.social-icons{text-align:center;padding:20px;background-color:var(--crm-bg);}
.social-icons a{display:inline-block;margin:0 8px;}
.social-icons img{width:28px;height:28px;display:inline-block;}
.contact-info{text-align:center;padding:20px 30px;font-size:14px;color:var(--crm-text);}
.contact-info p{margin:5px 0;}
.video-container{text-align:center;margin:15px 0;}
.footer{text-align:center;padding:20px;font-size:12px;color:#888;background-color:#f0f0f0;}
.footer a{color:#888;text-decoration:underline;}
@media(max-width:600px){.container{margin:0;border-radius:0;}.content{padding:15px;}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="לוגו" width="150">` : ''}
    <h1>${s.header_title || ''}</h1>
  </div>

  <div class="content">
    <p>${s.greeting || ''}</p>
    <p>${(s.intro_text || '').replace(/\n/g, '<br>')}</p>
  </div>

  ${blocksHtml}
  ${imageHtml}
  ${videoHtml}

  <div class="contact-info">
    <h2 class="section-title">צרו קשר</h2>
    ${phone ? `<p>טלפון: ${phone}</p>` : ''}
    ${email ? `<p>אימייל: <a href="mailto:${email}" style="color:var(--crm-primary);">${email}</a></p>` : ''}
    ${address ? `<p>כתובת: ${address}</p>` : ''}
    ${s.contact_extra ? `<p style="font-size:12px;margin-top:10px;">${s.contact_extra}</p>` : ''}
  </div>

  ${socialHtml}

  <div class="footer">
    <p>נשלח על ידי ${systemName}</p>
    <p><a href="{{unsubscribe_link}}">להסרה מהרשימה</a></p>
  </div>
</div>
</body>
</html>`;
}

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sections, setSections] = useState(() => {
    try { const s = localStorage.getItem('emailTemplate_sections'); return s ? JSON.parse(s) : DEFAULT_TEMPLATE_SECTIONS; } catch { return DEFAULT_TEMPLATE_SECTIONS; }
  });
  const [templateName, setTemplateName] = useState(() => localStorage.getItem('emailTemplate_name') || '');
  const [templateSubject, setTemplateSubject] = useState(() => localStorage.getItem('emailTemplate_subject') || '');
  const [generalSettings, setGeneralSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('emailTemplate_sections', JSON.stringify(sections));
  }, [sections]);
  useEffect(() => {
    localStorage.setItem('emailTemplate_name', templateName);
  }, [templateName]);
  useEffect(() => {
    localStorage.setItem('emailTemplate_subject', templateSubject);
  }, [templateSubject]);

  useEffect(() => {
    loadTemplates();
    loadGeneralSettings();
  }, []);

  const loadTemplates = async () => {
    const data = await base44.entities.EmailTemplate.list();
    setTemplates(data || []);
    if (data && data.length > 0 && !selectedId) {
      loadTemplate(data[0]);
    }
  };

  const loadGeneralSettings = async () => {
    const data = await base44.entities.GeneralSettings.list();
    if (data && data.length > 0) setGeneralSettings(data[0]);
  };

  const loadTemplate = (template) => {
    setSelectedId(template.id);
    setTemplateName(template.name || '');
    setTemplateSubject(template.subject || '');
    setSections({ ...DEFAULT_TEMPLATE_SECTIONS });
    setCreatingNew(false);
  };

  const extractSectionsFromHtml = (html) => {
    // Return defaults if can't parse
    return { ...DEFAULT_TEMPLATE_SECTIONS };
  };

  const handleSave = async () => {
    if (!templateName.trim()) { alert('אנא הזיני שם לתבנית'); return; }
    setSaving(true);
    try {
      const html = buildHtmlFromSections(sections, generalSettings);
      const data = { name: templateName, subject: templateSubject, body: html, active: true };
      if (selectedId && !creatingNew) {
        await base44.entities.EmailTemplate.update(selectedId, data);
      } else {
        const created = await base44.entities.EmailTemplate.create(data);
        setSelectedId(created.id);
      }
      await loadTemplates();
      setCreatingNew(false);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק תבנית זו?')) return;
    await base44.entities.EmailTemplate.delete(id);
    setSelectedId(null);
    setSections({ ...DEFAULT_TEMPLATE_SECTIONS });
    setTemplateName(''); setTemplateSubject('');
    await loadTemplates();
  };

  const handleUploadImage = async (e, field, blockIndex = null) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingField(field + (blockIndex !== null ? blockIndex : ''));
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (blockIndex !== null) {
        const newBlocks = [...sections.blocks];
        newBlocks[blockIndex] = { ...newBlocks[blockIndex], [field]: uploaded.file_url };
        setSections({ ...sections, blocks: newBlocks });
      } else {
        setSections({ ...sections, [field]: uploaded.file_url });
      }
    } finally {
      setUploadingField(null);
    }
  };

  const addBlock = () => {
    const newBlock = { id: Date.now(), type: 'text', title: 'כותרת חדשה', content: 'טקסט...', button_text: '', button_url: '' };
    setSections({ ...sections, blocks: [...sections.blocks, newBlock] });
  };

  const removeBlock = (idx) => {
    setSections({ ...sections, blocks: sections.blocks.filter((_, i) => i !== idx) });
  };

  const updateBlock = (idx, field, val) => {
    const newBlocks = [...sections.blocks];
    newBlocks[idx] = { ...newBlocks[idx], [field]: val };
    setSections({ ...sections, blocks: newBlocks });
  };

  const startNew = () => {
    setCreatingNew(true);
    setSelectedId(null);
    setTemplateName('תבנית חדשה');
    setTemplateSubject('');
    setSections({ ...DEFAULT_TEMPLATE_SECTIONS });
  };

  const previewHtml = buildHtmlFromSections(sections, generalSettings);

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={selectedId || ''}
          onChange={(e) => {
            const t = templates.find(t => t.id === e.target.value);
            if (t) loadTemplate(t);
          }}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">-- בחרי תבנית --</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={startNew} className="px-4 py-2 bg-[#6D436D] text-white rounded-full font-semibold flex items-center gap-2 hover:bg-[#5a365a]">
          <Plus className="w-4 h-4" /> תבנית חדשה
        </button>
        {selectedId && !creatingNew && (
          <button onClick={() => handleDelete(selectedId)} className="px-4 py-2 border border-red-400 text-red-600 rounded-full hover:bg-red-50 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> מחק
          </button>
        )}
      </div>

      {/* Template basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שם התבנית</label>
          <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="תבנית פנטהרי" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">נושא ברירת מחדל</label>
          <input type="text" value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="ניוזלטר חודשי" />
        </div>
      </div>

      {/* Header section */}
      <div className="border border-[#6D436D]/20 rounded-xl p-5 bg-[#6D436D]/5">
        <h4 className="font-bold text-[#6D436D] mb-4">🏷️ כותרת עליונה</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">לוגו (URL או העלאה)</label>
            <div className="flex gap-2">
              <input type="text" value={sections.logo_url} onChange={e => setSections({...sections, logo_url: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              <label className="px-3 py-2 bg-[#6D436D] text-white rounded-lg cursor-pointer flex items-center gap-1 text-sm hover:bg-[#5a365a]">
                {uploadingField === 'logo_url' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'logo_url')} />
              </label>
            </div>
            {sections.logo_url && <img src={sections.logo_url} alt="logo" className="mt-2 h-12 rounded" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כותרת ראשית</label>
            <input type="text" value={sections.header_title} onChange={e => setSections({...sections, header_title: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">👋 ברכה ופתיחה</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שורת פנייה (השתמשי ב-{`{{name}}`} לשם הנמען)</label>
            <input type="text" value={sections.greeting} onChange={e => setSections({...sections, greeting: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טקסט פתיחה</label>
            <textarea value={sections.intro_text} onChange={e => setSections({...sections, intro_text: e.target.value})} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content blocks */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-800">📝 בלוקי תוכן</h4>
          <button onClick={addBlock} className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-semibold flex items-center gap-1 hover:bg-green-700">
            <Plus className="w-4 h-4" /> הוסף בלוק
          </button>
        </div>
        <div className="space-y-4">
          {sections.blocks.map((block, idx) => (
            <div key={block.id || idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-sm text-gray-600">בלוק {idx + 1}</span>
                <button onClick={() => removeBlock(idx)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                <input type="text" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} placeholder="כותרת הבלוק (אופציונלי)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <textarea value={block.content} onChange={e => updateBlock(idx, 'content', e.target.value)} placeholder="תוכן הבלוק..." rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={block.button_text} onChange={e => updateBlock(idx, 'button_text', e.target.value)} placeholder="טקסט כפתור (אופציונלי)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <input type="text" value={block.button_url} onChange={e => updateBlock(idx, 'button_url', e.target.value)} placeholder="קישור כפתור" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
                </div>
              </div>
            </div>
          ))}
          {sections.blocks.length === 0 && (
            <p className="text-gray-500 text-center py-4">לחצי "הוסף בלוק" להוספת תוכן</p>
          )}
        </div>
      </div>

      {/* Image */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">🖼️ תמונה מרכזית (אופציונלי)</h4>
        <div className="flex gap-2">
          <input type="text" value={sections.image_url} onChange={e => setSections({...sections, image_url: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
          <label className="px-3 py-2 bg-gray-600 text-white rounded-lg cursor-pointer flex items-center gap-1 text-sm hover:bg-gray-700">
            {uploadingField === 'image_url' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'image_url')} />
          </label>
        </div>
        {sections.image_url && <img src={sections.image_url} alt="preview" className="mt-2 max-h-32 rounded" />}
      </div>

      {/* Video */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">🎬 סרטון (אופציונלי)</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">קישור לסרטון (יוטיוב וכו')</label>
            <input type="text" value={sections.video_url} onChange={e => setSections({...sections, video_url: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://youtube.com/..." dir="ltr" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">תמונה ממוזערת לסרטון</label>
            <div className="flex gap-2">
              <input type="text" value={sections.video_thumbnail_url} onChange={e => setSections({...sections, video_thumbnail_url: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              <label className="px-3 py-2 bg-gray-600 text-white rounded-lg cursor-pointer flex items-center gap-1 text-sm">
                {uploadingField === 'video_thumbnail_url' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'video_thumbnail_url')} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">📞 פרטי קשר (ריק = יילקח מהגדרות כלליות)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">טלפון</label>
            <input type="text" value={sections.contact_phone} onChange={e => setSections({...sections, contact_phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={generalSettings?.business_phone || '050-...'} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">אימייל</label>
            <input type="text" value={sections.contact_email} onChange={e => setSections({...sections, contact_email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={generalSettings?.business_email || 'info@...'} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">כתובת</label>
            <input type="text" value={sections.contact_address} onChange={e => setSections({...sections, contact_address: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={generalSettings?.business_address || 'תל אביב'} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">הערה נוספת</label>
            <input type="text" value={sections.contact_extra} onChange={e => setSections({...sections, contact_extra: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="מידע נוסף..." />
          </div>
        </div>
      </div>

      {/* Social */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">📱 רשתות חברתיות (אופציונלי)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['social_whatsapp', 'WhatsApp (מספר בינלאומי)', '972501234567'],
            ['social_facebook', 'Facebook (URL)', 'https://facebook.com/...'],
            ['social_instagram', 'Instagram (URL)', 'https://instagram.com/...'],
            ['social_youtube', 'YouTube (URL)', 'https://youtube.com/...'],
          ].map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input type="text" value={sections[field]} onChange={e => setSections({...sections, [field]: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={placeholder} dir="ltr" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#6D436D] text-white py-3 rounded-full font-semibold hover:bg-[#5a365a] disabled:bg-gray-400 flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" />שומר...</> : <><Save className="w-5 h-5" />שמור תבנית</>}
        </button>
        <button onClick={() => setShowPreview(!showPreview)} className="px-6 py-3 border-2 border-[#6D436D] text-[#6D436D] rounded-full font-semibold flex items-center gap-2 hover:bg-[#6D436D]/10">
          <Eye className="w-5 h-5" />{showPreview ? 'סגור תצוגה מקדימה' : 'תצוגה מקדימה'}
        </button>
      </div>

      {showPreview && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 font-medium">תצוגה מקדימה של המייל</div>
          <iframe srcDoc={previewHtml} className="w-full h-[600px] border-0" title="Email Preview" />
        </div>
      )}
    </div>
  );
}