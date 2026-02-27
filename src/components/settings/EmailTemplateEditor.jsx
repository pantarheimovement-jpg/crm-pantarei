import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Trash2, Eye, Save, Image as ImageIcon, X, Video, MousePointer, ChevronUp, ChevronDown } from 'lucide-react';

// A "block" can be: text, image, video, button
const DEFAULT_BLOCK = () => ({ id: Date.now() + Math.random(), type: 'text', title: '', content: '', button_text: '', button_url: '', image_url: '', video_url: '', video_thumbnail_url: '' });

// Auto-generate thumbnail from YouTube/Vimeo URL
function getAutoThumbnail(videoUrl) {
  if (!videoUrl) return '';
  // YouTube: various URL formats
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  // Vimeo
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  return '';
}

const DEFAULT_SECTIONS = {
  logo_url: '',
  header_title: 'ניוזלטר מפנטהרי',
  greeting: 'שלום {{name}},',
  intro_text: 'ברוכים הבאים לניוזלטר שלנו.',
  blocks: [
    { id: 1, type: 'text', title: 'כותרת לבלוק', content: 'כתבי כאן את תוכן הבלוק שלך...', button_text: '', button_url: '', image_url: '', video_url: '', video_thumbnail_url: '' },
  ],
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

  // Pantarhei colors - hardcoded for email client compatibility
  const PRIMARY = '#6D436D';
  const ACCENT = '#D29486';
  const ACTION = '#FAD980';
  const TEXT = '#5E4B35';
  const BG = '#FDF8F0';

  const blocksHtml = (s.blocks || []).map(block => {
    if (block.type === 'image') {
      return block.image_url ? `
      <tr><td style="padding:10px 30px;text-align:center;">
        <img src="${block.image_url}" alt="תמונה" width="500" style="width:100%;max-width:500px;border-radius:12px;display:block;margin:0 auto;">
      </td></tr>` : '';
    }
    if (block.type === 'video') {
      return (block.video_url && block.video_thumbnail_url) ? `
      <tr><td style="padding:10px 30px;text-align:center;">
        <a href="${block.video_url}" target="_blank" style="text-decoration:none;">
          <img src="${block.video_thumbnail_url}" alt="צפה בסרטון" width="500" style="width:100%;max-width:500px;border-radius:12px;display:block;margin:0 auto;">
        </a>
        <p style="font-family:'Rubik',Arial,sans-serif;font-size:14px;color:#555;margin-top:10px;">▶ לחצו לצפייה בסרטון</p>
      </td></tr>` : '';
    }
    if (block.type === 'button') {
      return (block.button_text && block.button_url) ? `
      <tr><td style="padding:20px 30px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr><td style="background-color:${ACTION};border-radius:50px;text-align:center;">
          <a href="${block.button_url}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:'Rubik',Arial,sans-serif;font-size:16px;font-weight:bold;color:${TEXT};text-decoration:none;">${block.button_text}</a>
        </td></tr></table>
      </td></tr>` : '';
    }
    // text block
    let html = '<tr><td style="padding:15px 30px;font-family:\'Rubik\',Arial,sans-serif;line-height:1.7;color:' + TEXT + ';font-size:15px;">';
    if (block.title) {
      html += `<h2 style="font-family:'Rubik',Arial,sans-serif;font-size:26px;font-weight:700;color:${PRIMARY};margin:20px 0 10px;text-align:center;">${block.title}</h2>`;
    }
    if (block.content) {
      html += `<p style="margin:0 0 15px;font-size:15px;line-height:1.7;">${block.content.replace(/\n/g, '<br>')}</p>`;
    }
    if (block.button_text && block.button_url) {
      html += `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:15px auto;"><tr><td style="background-color:${ACTION};border-radius:50px;text-align:center;">
        <a href="${block.button_url}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:'Rubik',Arial,sans-serif;font-size:16px;font-weight:bold;color:${TEXT};text-decoration:none;">${block.button_text}</a>
      </td></tr></table>`;
    }
    html += '</td></tr>';
    return html;
  }).join('\n');

  const socialLinks = [];
  if (s.social_whatsapp) socialLinks.push(`<a href="https://wa.me/${s.social_whatsapp}" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://img.icons8.com/color/48/000000/whatsapp.png" alt="WhatsApp" width="32" height="32" style="width:32px;height:32px;border:0;"></a>`);
  if (s.social_facebook) socialLinks.push(`<a href="${s.social_facebook}" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://img.icons8.com/color/48/000000/facebook-new.png" alt="Facebook" width="32" height="32" style="width:32px;height:32px;border:0;"></a>`);
  if (s.social_instagram) socialLinks.push(`<a href="${s.social_instagram}" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://img.icons8.com/color/48/000000/instagram-new.png" alt="Instagram" width="32" height="32" style="width:32px;height:32px;border:0;"></a>`);
  if (s.social_youtube) socialLinks.push(`<a href="${s.social_youtube}" target="_blank" style="display:inline-block;margin:0 6px;"><img src="https://img.icons8.com/color/48/000000/youtube-play.png" alt="YouTube" width="32" height="32" style="width:32px;height:32px;border:0;"></a>`);
  const socialHtml = socialLinks.length > 0 ? `
      <tr><td style="text-align:center;padding:20px;background-color:${BG};">
        ${socialLinks.join('')}
      </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="he" dir="rtl" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body, table, td { font-family: 'Rubik', Arial, Helvetica, sans-serif; }
  img { border: 0; outline: none; text-decoration: none; }
  a { color: ${PRIMARY}; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:'Rubik',Arial,sans-serif;direction:rtl;text-align:right;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};margin:0;padding:0;">
<tr><td align="center" style="padding:20px 10px;">

  <!-- Main container -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr><td style="background-color:${PRIMARY};padding:25px 20px;text-align:center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="לוגו" width="130" style="max-width:130px;height:auto;border-radius:10px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">` : ''}
      <h1 style="font-family:'Rubik',Arial,sans-serif;font-size:28px;font-weight:700;color:#ffffff;margin:0;line-height:1.3;">${s.header_title || ''}</h1>
    </td></tr>

    <!-- Greeting -->
    <tr><td style="padding:25px 30px 10px;font-family:'Rubik',Arial,sans-serif;font-size:15px;line-height:1.7;color:${TEXT};">
      <p style="margin:0 0 10px;font-size:16px;">${s.greeting || ''}</p>
      <p style="margin:0;font-size:15px;line-height:1.7;">${(s.intro_text || '').replace(/\n/g, '<br>')}</p>
    </td></tr>

    <!-- Content blocks -->
    ${blocksHtml}

    <!-- Contact info -->
    <tr><td style="padding:25px 30px;text-align:center;font-family:'Rubik',Arial,sans-serif;color:${TEXT};">
      <h2 style="font-family:'Rubik',Arial,sans-serif;font-size:24px;font-weight:700;color:${PRIMARY};margin:0 0 15px;">צרו קשר</h2>
      ${phone ? `<p style="margin:5px 0;font-size:14px;">טלפון: ${phone}</p>` : ''}
      ${email ? `<p style="margin:5px 0;font-size:14px;">אימייל: <a href="mailto:${email}" style="color:${PRIMARY};text-decoration:none;">${email}</a></p>` : ''}
      ${address ? `<p style="margin:5px 0;font-size:14px;">כתובת: ${address}</p>` : ''}
      ${s.contact_extra ? `<p style="font-size:12px;margin-top:12px;color:#888;">${s.contact_extra}</p>` : ''}
    </td></tr>

    <!-- Social icons -->
    ${socialHtml}

    <!-- Footer -->
    <tr><td style="text-align:center;padding:20px;font-size:12px;color:#888888;background-color:#f0f0f0;font-family:'Rubik',Arial,sans-serif;">
      <p style="margin:0 0 8px;">נשלח על ידי ${systemName}</p>
      <p style="margin:0;"><a href="{{unsubscribe_link}}" style="color:#888888;text-decoration:underline;">להסרה מהרשימה</a></p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sections, setSections] = useState(() => {
    try { const s = localStorage.getItem('emailTemplate_sections'); return s ? JSON.parse(s) : DEFAULT_SECTIONS; } catch { return DEFAULT_SECTIONS; }
  });
  const [templateName, setTemplateName] = useState(() => localStorage.getItem('emailTemplate_name') || '');
  const [templateSubject, setTemplateSubject] = useState(() => localStorage.getItem('emailTemplate_subject') || '');
  const [generalSettings, setGeneralSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  useEffect(() => { localStorage.setItem('emailTemplate_sections', JSON.stringify(sections)); }, [sections]);
  useEffect(() => { localStorage.setItem('emailTemplate_name', templateName); }, [templateName]);
  useEffect(() => { localStorage.setItem('emailTemplate_subject', templateSubject); }, [templateSubject]);

  useEffect(() => {
    loadTemplates();
    loadGeneralSettings();
  }, []);

  const loadTemplates = async () => {
    const data = await base44.entities.EmailTemplate.list();
    setTemplates(data || []);
  };

  const loadGeneralSettings = async () => {
    const data = await base44.entities.GeneralSettings.list();
    if (data && data.length > 0) setGeneralSettings(data[0]);
  };

  const parseHtmlToSections = (html) => {
    if (!html) return { ...DEFAULT_SECTIONS };
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const s = { ...DEFAULT_SECTIONS, blocks: [] };

    // Logo
    const headerTd = doc.querySelector('td[style*="background-color:#6D436D"]') || doc.querySelector('td[style*="background-color: #6D436D"]');
    if (headerTd) {
      const logoImg = headerTd.querySelector('img');
      if (logoImg) s.logo_url = logoImg.getAttribute('src') || '';
      const h1 = headerTd.querySelector('h1');
      if (h1) s.header_title = h1.textContent || '';
    }

    // Greeting - find the first content td after header
    const allTds = doc.querySelectorAll('td');
    let greetingFound = false;
    for (const td of allTds) {
      const style = td.getAttribute('style') || '';
      if (style.includes('padding:25px 30px 10px') || style.includes('padding: 25px 30px 10px')) {
        const ps = td.querySelectorAll('p');
        if (ps.length >= 1) s.greeting = ps[0].textContent || '';
        if (ps.length >= 2) s.intro_text = ps[1].innerHTML?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') || '';
        greetingFound = true;
        break;
      }
    }

    // Content blocks - iterate through all <tr> inside the main container table
    // The main container is the table with max-width:600px
    const mainTable = doc.querySelector('table[width="600"]') || doc.querySelector('table[style*="max-width:600px"]');
    const allTrs = mainTable ? mainTable.querySelectorAll(':scope > tbody > tr, :scope > tr') : [];
    
    for (const tr of allTrs) {
      const td = tr.querySelector('td');
      if (!td) continue;
      const style = td.getAttribute('style') || '';
      
      // Skip header, greeting, contact, social, footer sections
      if (style.includes('background-color:#6D436D') || style.includes('background-color: #6D436D')) continue;
      if (style.includes('padding:25px 30px 10px') || style.includes('padding: 25px 30px 10px')) continue;
      if (style.includes('background-color:#f0f0f0') || style.includes('background-color: #f0f0f0')) continue;
      if (style.includes('background-color:#FDF8F0') || style.includes('background-color: #FDF8F0')) continue;
      
      // Check if this is a "contact" section (has h2 with צרו קשר)
      const contactH2 = td.querySelector('h2');
      if (contactH2 && (contactH2.textContent || '').includes('צרו קשר')) continue;

      // Detect IMAGE block: td with img but no link wrapping it and alt="תמונה"
      const imgOnly = td.querySelector('img[alt="תמונה"]');
      if (imgOnly && !td.querySelector('a')) {
        const block = { ...DEFAULT_BLOCK(), type: 'image' };
        block.image_url = imgOnly.getAttribute('src') || '';
        if (block.image_url) { s.blocks.push(block); continue; }
      }

      // Detect VIDEO block: td with a > img (thumbnail linking to video) and text "לחצו לצפייה"
      const videoLink = td.querySelector('a');
      const videoImg = videoLink ? videoLink.querySelector('img[alt="צפה בסרטון"]') : null;
      if (videoLink && videoImg) {
        const block = { ...DEFAULT_BLOCK(), type: 'video' };
        block.video_url = videoLink.getAttribute('href') || '';
        block.video_thumbnail_url = videoImg.getAttribute('src') || '';
        if (block.video_url && block.video_thumbnail_url) { s.blocks.push(block); continue; }
      }

      // Detect standalone BUTTON block: td with only a table > a button and padding:20px
      if (style.includes('padding:20px 30px') || style.includes('padding: 20px 30px')) {
        const btnLink = td.querySelector('a[style*="padding:14px"]') || td.querySelector('a[style*="padding: 14px"]');
        if (btnLink && !td.querySelector('h2') && !td.querySelector('p:not(:empty)')) {
          const block = { ...DEFAULT_BLOCK(), type: 'button' };
          block.button_text = btnLink.textContent || '';
          block.button_url = btnLink.getAttribute('href') || '';
          if (block.button_text) { s.blocks.push(block); continue; }
        }
      }

      // Detect TEXT block: td with padding:15px 30px
      if (style.includes('padding:15px 30px') || style.includes('padding: 15px 30px')) {
        const h2 = td.querySelector('h2');
        const p = td.querySelector('p');
        const a = td.querySelector('a[style*="padding:14px"]') || td.querySelector('a[style*="padding: 14px"]');
        
        if (h2 || p) {
          const block = { ...DEFAULT_BLOCK(), type: 'text' };
          if (h2) block.title = h2.textContent || '';
          if (p) block.content = p.innerHTML?.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') || '';
          if (a) {
            block.button_text = a.textContent || '';
            block.button_url = a.getAttribute('href') || '';
          }
          s.blocks.push(block);
        }
      }
    }

    // Contact info
    const contactTd = Array.from(allTds).find(td => {
      const h2 = td.querySelector('h2');
      return h2 && (h2.textContent || '').includes('צרו קשר');
    });
    if (contactTd) {
      const ps = contactTd.querySelectorAll('p');
      for (const p of ps) {
        const text = p.textContent || '';
        if (text.includes('טלפון')) s.contact_phone = text.replace('טלפון:', '').replace('טלפון', '').trim();
        if (text.includes('אימייל') || text.includes('אימייל:')) {
          const link = p.querySelector('a');
          s.contact_email = link ? link.textContent : text.replace('אימייל:', '').replace('אימייל', '').trim();
        }
        if (text.includes('כתובת')) s.contact_address = text.replace('כתובת:', '').replace('כתובת', '').trim();
      }
    }

    // Social icons
    const socialTd = Array.from(allTds).find(td => {
      const style = td.getAttribute('style') || '';
      return style.includes('background-color:#FDF8F0') && td.querySelectorAll('a img').length > 0;
    });
    if (socialTd) {
      const links = socialTd.querySelectorAll('a');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.includes('wa.me')) s.social_whatsapp = href.replace('https://wa.me/', '');
        else if (href.includes('facebook')) s.social_facebook = href;
        else if (href.includes('instagram')) s.social_instagram = href;
        else if (href.includes('youtube')) s.social_youtube = href;
      }
    }

    // If no blocks found, add a default one
    if (s.blocks.length === 0) {
      s.blocks.push({ ...DEFAULT_BLOCK() });
    }

    return s;
  };

  const loadTemplate = (template) => {
    setSelectedId(template.id);
    setTemplateName(template.name || '');
    setTemplateSubject(template.subject || '');
    // If sections_json exists, use it directly (accurate). Otherwise fall back to HTML parsing.
    if (template.sections_json) {
      try {
        const parsed = JSON.parse(template.sections_json);
        setSections(parsed);
      } catch {
        const parsed = parseHtmlToSections(template.body);
        setSections(parsed);
      }
    } else {
      const parsed = parseHtmlToSections(template.body);
      setSections(parsed);
    }
    setCreatingNew(false);
  };

  const handleSave = async () => {
    if (!templateName.trim()) { alert('אנא הזיני שם לתבנית'); return; }
    setSaving(true);
    try {
      const html = buildHtmlFromSections(sections, generalSettings);
      const sectionsToSave = { ...sections };
      const data = { 
        name: templateName, 
        subject: templateSubject, 
        body: html, 
        sections_json: JSON.stringify(sectionsToSave),
        active: true 
      };
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
    setSections({ ...DEFAULT_SECTIONS });
    setTemplateName(''); setTemplateSubject('');
    await loadTemplates();
  };

  const handleUploadImage = async (e, blockIdx, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const key = `${field}_${blockIdx}`;
    setUploadingField(key);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (blockIdx === 'logo') {
        setSections({ ...sections, logo_url: uploaded.file_url });
      } else {
        updateBlock(blockIdx, field, uploaded.file_url);
      }
    } finally {
      setUploadingField(null);
    }
  };

  const addBlock = (type = 'text', afterIdx = null) => {
    const newBlock = { ...DEFAULT_BLOCK(), type };
    const newBlocks = [...sections.blocks];
    if (afterIdx !== null) {
      newBlocks.splice(afterIdx + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    setSections({ ...sections, blocks: newBlocks });
  };

  const removeBlock = (idx) => {
    if (!confirm('למחוק בלוק זה?')) return;
    setSections({ ...sections, blocks: sections.blocks.filter((_, i) => i !== idx) });
  };

  const moveBlock = (idx, dir) => {
    const newBlocks = [...sections.blocks];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    setSections({ ...sections, blocks: newBlocks });
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
    setSections({ ...DEFAULT_SECTIONS });
  };

  const previewHtml = buildHtmlFromSections(sections, generalSettings);

  const BLOCK_TYPES = [
    { type: 'text', icon: '📝', label: 'טקסט' },
    { type: 'image', icon: '🖼️', label: 'תמונה' },
    { type: 'video', icon: '🎬', label: 'סרטון' },
    { type: 'button', icon: '🔘', label: 'כפתור' },
  ];

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedId || ''} onChange={(e) => { const t = templates.find(t => t.id === e.target.value); if (t) loadTemplate(t); }} className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg">
          <option value="">-- בחרי תבנית --</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={startNew} className="px-4 py-2 bg-[#6D436D] text-white rounded-full font-semibold flex items-center gap-2 hover:bg-[#5a365a]">
          <Plus className="w-4 h-4" /> תבנית חדשה
        </button>
        {selectedId && !creatingNew && (
          <button onClick={() => handleDelete(selectedId)} className="px-4 py-2 border border-red-400 text-red-600 rounded-full hover:bg-red-50 flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> מחק תבנית
          </button>
        )}
      </div>

      {/* Basic info */}
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

      {/* Header */}
      <div className="border border-[#6D436D]/20 rounded-xl p-5 bg-[#6D436D]/5">
        <h4 className="font-bold text-[#6D436D] mb-4">🏷️ כותרת עליונה</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">לוגו</label>
            <div className="flex gap-2">
              <input type="text" value={sections.logo_url} onChange={e => setSections({...sections, logo_url: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              <label className="px-3 py-2 bg-[#6D436D] text-white rounded-lg cursor-pointer flex items-center gap-1 text-sm hover:bg-[#5a365a]">
                {uploadingField === 'image_url_logo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'logo', 'image_url')} />
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
            <label className="block text-sm font-medium text-gray-700 mb-1">שורת פנייה (השתמשי ב-{'{{name}}'} לשם הנמען)</label>
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
          <h4 className="font-bold text-gray-800">📋 בלוקי תוכן</h4>
          <div className="flex gap-2 flex-wrap">
            {BLOCK_TYPES.map(({ type, icon, label }) => (
              <button key={type} onClick={() => addBlock(type)}
                className="px-3 py-1.5 bg-[#6D436D] text-white rounded-full text-xs font-semibold hover:bg-[#5a365a] flex items-center gap-1">
                <Plus className="w-3 h-3" />{icon} {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {sections.blocks.length === 0 && <p className="text-gray-500 text-center py-4">הוסיפי בלוק ראשון 👆</p>}
          {sections.blocks.map((block, idx) => (
            <div key={block.id || idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{BLOCK_TYPES.find(t => t.type === block.type)?.icon || '📝'}</span>
                  <span className="font-medium text-sm text-gray-700">{BLOCK_TYPES.find(t => t.type === block.type)?.label || 'טקסט'} #{idx + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveBlock(idx, 1)} disabled={idx === sections.blocks.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => removeBlock(idx)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Text block */}
              {block.type === 'text' && (
                <div className="space-y-2">
                  <input type="text" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} placeholder="כותרת הבלוק (אופציונלי)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <textarea value={block.content} onChange={e => updateBlock(idx, 'content', e.target.value)} placeholder="תוכן הבלוק..." rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={block.button_text} onChange={e => updateBlock(idx, 'button_text', e.target.value)} placeholder="טקסט כפתור (אופציונלי)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="text" value={block.button_url} onChange={e => updateBlock(idx, 'button_url', e.target.value)} placeholder="קישור כפתור" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
                  </div>
                </div>
              )}

              {/* Image block */}
              {block.type === 'image' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input type="text" value={block.image_url} onChange={e => updateBlock(idx, 'image_url', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="URL תמונה..." />
                    <label className="px-3 py-2 bg-gray-600 text-white rounded-lg cursor-pointer flex items-center gap-1 text-sm hover:bg-gray-700">
                      {uploadingField === `image_url_${idx}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, idx, 'image_url')} />
                    </label>
                  </div>
                  {block.image_url && <img src={block.image_url} alt="preview" className="max-h-32 rounded" />}
                </div>
              )}

              {/* Video block */}
              {block.type === 'video' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">קישור לסרטון</label>
                    <input type="text" value={block.video_url} onChange={e => updateBlock(idx, 'video_url', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://youtube.com/..." dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">תמונה ממוזערת</label>
                    <div className="flex gap-2">
                      <input type="text" value={block.video_thumbnail_url} onChange={e => updateBlock(idx, 'video_thumbnail_url', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
                      <label className="px-3 py-2 bg-gray-600 text-white rounded-lg cursor-pointer flex items-center gap-1 text-sm">
                        {uploadingField === `video_thumbnail_url_${idx}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, idx, 'video_thumbnail_url')} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Button block */}
              {block.type === 'button' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={block.button_text} onChange={e => updateBlock(idx, 'button_text', e.target.value)} placeholder="טקסט הכפתור" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <input type="text" value={block.button_url} onChange={e => updateBlock(idx, 'button_url', e.target.value)} placeholder="https://..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
                </div>
              )}

              {/* Add block after this one */}
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <p className="text-xs text-gray-400 mb-2">הוסף בלוק אחרי זה:</p>
                <div className="flex gap-2 flex-wrap">
                  {BLOCK_TYPES.map(({ type, icon, label }) => (
                    <button key={type} onClick={() => addBlock(type, idx)}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-[#6D436D]/10 hover:text-[#6D436D] flex items-center gap-1">
                      <Plus className="w-3 h-3" />{icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">📞 פרטי קשר (ריק = יילקח מהגדרות כלליות)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[['contact_phone', 'טלפון', generalSettings?.business_phone || '050-...'], ['contact_email', 'אימייל', generalSettings?.business_email || 'info@...'], ['contact_address', 'כתובת', generalSettings?.business_address || 'תל אביב'], ['contact_extra', 'הערה נוספת', 'מידע נוסף...']].map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input type="text" value={sections[field]} onChange={e => setSections({...sections, [field]: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* Social */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">📱 רשתות חברתיות (אופציונלי)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[['social_whatsapp', 'WhatsApp (מספר)', '972501234567'], ['social_facebook', 'Facebook (URL)', 'https://facebook.com/...'], ['social_instagram', 'Instagram (URL)', 'https://instagram.com/...'], ['social_youtube', 'YouTube (URL)', 'https://youtube.com/...']].map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input type="text" value={sections[field]} onChange={e => setSections({...sections, [field]: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={placeholder} dir="ltr" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className={`flex-1 py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors ${savedIndicator ? 'bg-green-600 text-white' : 'bg-[#6D436D] text-white hover:bg-[#5a365a] disabled:bg-gray-400'}`}>
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" />שומר...</> : savedIndicator ? '✅ נשמר בהצלחה!' : <><Save className="w-5 h-5" />שמור תבנית</>}
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

      {/* Sticky save button */}
      <div className="fixed bottom-6 left-6 z-50">
        <button onClick={handleSave} disabled={saving}
          className={`shadow-xl px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all text-sm ${savedIndicator ? 'bg-green-600 text-white' : 'bg-[#6D436D] text-white hover:bg-[#5a365a] disabled:bg-gray-400'}`}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />שומר...</> : savedIndicator ? '✅ נשמר!' : <><Save className="w-4 h-4" />שמור תבנית</>}
        </button>
      </div>
    </div>
  );
}