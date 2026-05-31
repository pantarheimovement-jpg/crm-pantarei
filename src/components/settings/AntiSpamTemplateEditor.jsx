import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Trash2, Eye, Save, Image as ImageIcon, X, Video, MousePointer, ChevronUp, ChevronDown, ShieldCheck, Upload, Copy } from 'lucide-react';

const DEFAULT_BLOCK = () => ({ id: Date.now() + Math.random(), type: 'text', title: '', content: '', button_text: '', button_url: '', image_url: '', alt_text: '', video_url: '', video_thumbnail_url: '' });

function getAutoThumbnail(videoUrl) {
  if (!videoUrl) return '';
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  return '';
}

const LOGO_URL = 'https://pantarhei-studio.co.il/wp-content/uploads/2026/05/%D7%9C%D7%95%D7%92%D7%95-%D7%A4%D7%A0%D7%98%D7%94%D7%A8%D7%99%D7%99-%D7%A8%D7%A7%D7%A2-%D7%9B%D7%94%D7%94.png';

const PRIMARY = '#6D436D';
const ACCENT = '#D29486';
const ACTION = '#FAD980';
const TEXT = '#5E4B35';
const BG = '#FDF8F0';

function buildAntiSpamHtml(s, generalSettings) {
  const phone = s.contact_phone || generalSettings?.business_phone || '';
  const email = s.contact_email || generalSettings?.business_email || '';
  const address = s.contact_address || generalSettings?.business_address || '';
  const systemName = generalSettings?.system_name || 'Pantarhei';
  const logoUrl = s.logo_url || LOGO_URL;

  const blocksHtml = (s.blocks || []).map(block => {
    if (block.type === 'image') {
      return block.image_url ? `
      <tr><td style="padding:10px 30px;text-align:center;">
        <img src="${block.image_url}" alt="${block.alt_text || 'פנטהריי סטודיו'}" width="500" style="width:100%;max-width:500px;border-radius:12px;display:block;margin:0 auto;">
      </td></tr>` : '';
    }
    if (block.type === 'video') {
      const thumbnail = block.video_thumbnail_url || getAutoThumbnail(block.video_url);
      return (block.video_url && thumbnail) ? `
      <tr><td style="padding:10px 30px;text-align:center;">
        <a href="${block.video_url}" target="_blank" style="text-decoration:none;">
          <img src="${thumbnail}" alt="${block.alt_text || 'צפה בסרטון'}" width="500" style="width:100%;max-width:500px;border-radius:12px;display:block;margin:0 auto;">
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
  const socialHtml = socialLinks.length > 0 ? `
      <tr><td style="text-align:center;padding:20px;background-color:${BG};">
        ${socialLinks.join('')}
      </td></tr>` : '';

  // Preheader text — hidden text that shows in Gmail preview
  const preheaderText = s.preheader || '';
  const preheaderHtml = preheaderText ? `<div style="display:none;font-size:1px;color:#FDF8F0;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheaderText}</div>` : '';

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
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};margin:0;padding:0;">
<tr><td align="center" style="padding:20px 10px;">

  <!-- Main container -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr><td style="background-color:${PRIMARY};padding:25px 20px;text-align:center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="לוגו פנטהריי סטודיו" width="130" style="max-width:130px;height:auto;border-radius:10px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">` : ''}
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
    </td></tr>

    <!-- Social icons -->
    ${socialHtml}

    <!-- Footer -->
    <tr><td style="text-align:center;padding:20px;font-size:12px;color:#888888;background-color:#f0f0f0;font-family:'Rubik',Arial,sans-serif;">
      <p style="margin:0 0 8px;">קיבלת מייל זה כי נרשמת לרשימת התפוצה של ${systemName}</p>
      <p style="margin:0 0 8px;">
        <a href="{{unsubscribe_link}}" style="color:#888888;text-decoration:underline;">הסרה מהרשימה</a>
        &nbsp;|&nbsp;
        <a href="mailto:pantarhei.movement@gmail.com?subject=%D7%93%D7%99%D7%95%D7%95%D7%97%20%D7%A2%D7%9C%20%D7%A9%D7%99%D7%9E%D7%95%D7%A9%20%D7%9C%D7%A8%D7%A2%D7%94%20/%20Report%20Abuse" style="color:#888888;text-decoration:underline;">דיווח על שימוש לרעה (Report Abuse)</a>
      </p>
      <p style="margin:0;font-size:11px;color:#aaa;">פנטהריי — מרכז למחול ותנועה סומטית | pantarhei-studio.co.il</p>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}

const ANTI_SPAM_DEFAULT_SECTIONS = {
  logo_url: LOGO_URL,
  header_title: 'ניוזלטר פנטהריי',
  greeting: 'שלום {{name}},',
  intro_text: 'ברוכים הבאים לניוזלטר שלנו.\nוהפעם על הקשר בין קונטקט אימפרוביזציה לווייב קודינג.',
  preheader: 'עדכונים מסטודיו פנטהריי — מרכז למחול ותנועה סומטית',
  blocks: [
    { id: 1, type: 'text', title: 'תתפלאו אבל יש קשר.', content: 'יש משהו עמוק שמחבר בין וייב קודינג לקונטקט אימפרוביזציה. בשניהם אין כוריאוגרפיה סגורה מראש ואין מפרט נוקשה עד הסוף, אלא הקשבה רציפה למה שקורה עכשיו. בקונטקט אתה עובד עם משקל, מומנטום ומרכז כובד של הפרטנר, מגיב בזמן אמת ומשחרר שליטה כדי לאפשר לתנועה להוביל. בוייב קודינג אתה עושה אותו דבר עם המערכת - מזין כוונה, בודק מה נוצר, מזיז קצת, מתקן, בונה על גבי מה שחי ונושם מולך. זה לא תכנון ליניארי אלא דיאלוג. במקום להילחם במציאות אתה רוקד איתה, ובדיוק שם נוצרת יצירתיות חכמה - כזו שמחזיקה גם חופש וגם מבנה.', button_text: 'אשמח לעוד פרטים', button_url: 'https://pantarhei-studio.co.il/', image_url: '', alt_text: '' },
    { id: 2, type: 'image', image_url: 'https://pantarhei-studio.co.il/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-06-at-13.51.20-2.jpeg', alt_text: 'קונטקט אימפרוביזציה בסטודיו פנטהריי' },
    { id: 3, type: 'text', title: '', content: 'הסטודיו שלנו מציע מגוון רחב של שיעורים וסדנאות בתנועה סומטית, קונטקט אימפרוביזציה, ושיטת לאבאן ברטנייף. כל השיעורים מתקיימים במרכז פנטהריי, קיבוץ גניגר.', button_text: '', button_url: '', image_url: '', alt_text: '' },
    { id: 4, type: 'text', title: 'LBMS', content: 'תכנית הכשרה בינלאומית בשיטת לאבאן ברטנייף\nנפתחה ההרשמה למחזור השני 2026-2028\n\nסדנת מבוא לתכנית: סדנא תנועתית עם קארן סטאד, מורה בכירה והרכזת הפדגוגית של תכנית הלימודים\nיום שישי 10.04.26\n10:00-13:00 במרכז פנטהריי, קיבוץ גניגר', button_text: 'לקריאה בהרחבה על התכנית LBMS', button_url: 'https://pantarhei-studio.co.il/lbmsprogram/', image_url: '', alt_text: '' },
    { id: 5, type: 'image', image_url: 'https://pantarhei-studio.co.il/wp-content/uploads/2026/05/WhatsApp-Image-2026-05-06-at-10.40.24-1.jpeg', alt_text: 'תכנית LBMS לאבאן ברטנייף בפנטהריי' },
    { id: 6, type: 'text', title: 'בדיקת נוכחות', content: 'סדנא יומית תנועתית עם עינת גנץ\n\'בדיקת נוכחות\' — סדנת אימפרו-פרפורמנס\n28 בפברואר 2026\n\nסדנה ייחודית המשלבת תנועה, נוכחות ואילתור בחלל הפתוח של הסטודיו.', button_text: 'מעניין אותי', button_url: 'https://pantarhei-studio.co.il/workshops/attendancecheckimpro/', image_url: '', alt_text: '' },
    { id: 7, type: 'image', image_url: 'https://pantarhei-studio.co.il/wp-content/uploads/2026/03/WhatsApp-Image-2026-03-09-at-09.36.30.jpeg', alt_text: 'סדנת בדיקת נוכחות עם עינת גנץ' },
    { id: 8, type: 'text', title: '\'הופעה לתעופה\'', content: 'ריטריט סופ"ש \'הופעה לתעופה\'\nריליס, אילתור ויצירה\nבהנחיית ענבל אלוני ואברהם חזין\n20-21.03.2026\n\nחוויה תנועתית אינטנסיבית שמשלבת שחרור גופני, יצירה ואילתור בטבע.', button_text: '', button_url: '', image_url: '', alt_text: '' },
    { id: 9, type: 'image', image_url: 'https://pantarhei-studio.co.il/wp-content/uploads/2025/12/Screenshot-2025-12-21-at-16.31.34-scaled.jpg', alt_text: 'ריטריט הופעה לתעופה בפנטהריי' },
    { id: 10, type: 'image', image_url: 'https://pantarhei-studio.co.il/wp-content/uploads/2025/12/Screenshot-2025-12-21-at-14.27.21-scaled.jpg', alt_text: 'סטודיו פנטהריי מרכז למחול ותנועה סומטית' },
  ],
  contact_phone: '',
  contact_email: '',
  contact_address: '',
  social_whatsapp: '',
  social_facebook: '',
  social_instagram: '',
};

const BLOCK_TYPES = [
  { type: 'text', icon: '📝', label: 'טקסט' },
  { type: 'image', icon: '🖼️', label: 'תמונה' },
  { type: 'video', icon: '🎬', label: 'סרטון' },
  { type: 'button', icon: '🔘', label: 'כפתור' },
];

export default function AntiSpamTemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sections, setSections] = useState({ ...ANTI_SPAM_DEFAULT_SECTIONS });
  const [templateName, setTemplateName] = useState('תבנית פנטהריי (Anti-Spam)');
  const [templateSubject, setTemplateSubject] = useState('ניוזלטר פנטהריי');
  const [generalSettings, setGeneralSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

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

  const loadTemplate = (template) => {
    setSelectedId(template.id);
    setTemplateName(template.name || '');
    setTemplateSubject(template.subject || '');
    if (template.sections_json) {
      try {
        setSections(JSON.parse(template.sections_json));
      } catch {
        setSections({ ...ANTI_SPAM_DEFAULT_SECTIONS });
      }
    } else {
      setSections({ ...ANTI_SPAM_DEFAULT_SECTIONS });
    }
    setCreatingNew(false);
  };

  const handleSave = async () => {
    if (!templateName.trim()) { alert('אנא הזיני שם לתבנית'); return; }
    setSaving(true);
    try {
      const html = buildAntiSpamHtml(sections, generalSettings);
      const data = {
        name: templateName,
        subject: templateSubject,
        body: html,
        sections_json: JSON.stringify(sections),
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
    setSections({ ...ANTI_SPAM_DEFAULT_SECTIONS });
    setTemplateName('תבנית פנטהריי (Anti-Spam)');
    setTemplateSubject('ניוזלטר פנטהריי');
    await loadTemplates();
  };

  const addBlock = (type = 'text', afterIdx = null) => {
    const newBlock = { ...DEFAULT_BLOCK(), type };
    const newBlocks = [...sections.blocks];
    if (afterIdx !== null) newBlocks.splice(afterIdx + 1, 0, newBlock);
    else newBlocks.push(newBlock);
    setSections({ ...sections, blocks: newBlocks });
  };

  const removeBlock = (idx) => {
    if (!confirm('למחוק בלוק זה?')) return;
    setSections({ ...sections, blocks: sections.blocks.filter((_, i) => i !== idx) });
  };

  const duplicateBlock = (idx) => {
    const original = sections.blocks[idx];
    const clone = { ...original, id: Date.now() + Math.random() };
    const newBlocks = [...sections.blocks];
    newBlocks.splice(idx + 1, 0, clone);
    setSections({ ...sections, blocks: newBlocks });
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
    setTemplateName('תבנית חדשה (Anti-Spam)');
    setTemplateSubject('');
    setSections({ ...ANTI_SPAM_DEFAULT_SECTIONS });
  };

  const previewHtml = buildAntiSpamHtml(sections, generalSettings);

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-green-800 mb-1">תבניות מותאמות למניעת ספאם</h3>
          <p className="text-sm text-green-700">תבניות אלה מותאמות עם תמונות מהדומיין שלך (pantarhei-studio.co.il), alt text תיאורי, טקסט רגיל בין סקשנים, ומספר קישורים מצומצם. כל זה משפר משמעותית את ה-deliverability ומפחית סיכוי לספאם.</p>
          <ul className="text-xs text-green-600 mt-2 space-y-1">
            <li>✅ תמונות מהדומיין שלך (לא מ-base44.app)</li>
            <li>✅ alt text תיאורי לכל תמונה</li>
            <li>✅ preheader text (טקסט נסתר לתצוגה מקדימה)</li>
            <li>✅ יחס טקסט/תמונות משופר</li>
            <li>✅ מספר קישורים מצומצם</li>
          </ul>
        </div>
      </div>

      {/* Template selector */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={selectedId || ''} onChange={(e) => { const t = templates.find(t => t.id === e.target.value); if (t) loadTemplate(t); }} className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg">
          <option value="">-- בחרי תבנית Anti-Spam --</option>
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

      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שם התבנית</label>
          <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">נושא ברירת מחדל</label>
          <input type="text" value={templateSubject} onChange={e => setTemplateSubject(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      {/* Preheader */}
      <div className="border border-green-200 rounded-xl p-5 bg-green-50/30">
        <h4 className="font-bold text-gray-800 mb-2">🔍 Preheader (טקסט תצוגה מקדימה)</h4>
        <p className="text-xs text-gray-500 mb-2">טקסט נסתר שמופיע בתצוגה המקדימה של Gmail לפני פתיחת המייל. חשוב מאוד ל-deliverability.</p>
        <input type="text" value={sections.preheader || ''} onChange={e => setSections({...sections, preheader: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="עדכונים מסטודיו פנטהריי — מרכז למחול ותנועה סומטית" />
      </div>

      {/* Header */}
      <div className="border border-[#6D436D]/20 rounded-xl p-5 bg-[#6D436D]/5">
        <h4 className="font-bold text-[#6D436D] mb-4">🏷️ כותרת עליונה</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">לוגו (URL מהדומיין שלך)</label>
            <input type="text" value={sections.logo_url} onChange={e => setSections({...sections, logo_url: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://pantarhei-studio.co.il/..." dir="ltr" />
            {sections.logo_url && <img src={sections.logo_url} alt="logo preview" className="mt-2 h-12 rounded" />}
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
          <input type="text" value={sections.greeting} onChange={e => setSections({...sections, greeting: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="שלום {{name}}," />
          <textarea value={sections.intro_text} onChange={e => setSections({...sections, intro_text: e.target.value})} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
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
                  <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="הזז למעלה"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveBlock(idx, 1)} disabled={idx === sections.blocks.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="הזז למטה"><ChevronDown className="w-4 h-4" /></button>
                  <button onClick={() => duplicateBlock(idx)} className="p-1 text-blue-500 hover:text-blue-700" title="שכפל בלוק"><Copy className="w-4 h-4" /></button>
                  <button onClick={() => removeBlock(idx)} className="p-1 text-red-500 hover:text-red-700" title="מחק בלוק"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              {block.type === 'text' && (
                <div className="space-y-2">
                  <input type="text" value={block.title} onChange={e => updateBlock(idx, 'title', e.target.value)} placeholder="כותרת (אופציונלי)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <textarea value={block.content} onChange={e => updateBlock(idx, 'content', e.target.value)} placeholder="תוכן הבלוק..." rows="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={block.button_text} onChange={e => updateBlock(idx, 'button_text', e.target.value)} placeholder="טקסט כפתור (אופציונלי)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="text" value={block.button_url} onChange={e => updateBlock(idx, 'button_url', e.target.value)} placeholder="קישור כפתור" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
                  </div>
                </div>
              )}

              {block.type === 'image' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">URL תמונה או העלאה ישירה</label>
                    <div className="flex gap-2">
                      <input type="text" value={block.image_url} onChange={e => updateBlock(idx, 'image_url', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://... או העלי תמונה →" dir="ltr" />
                      <label className="px-3 py-2 bg-[#D29486] text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-[#c08478] flex items-center gap-1 whitespace-nowrap">
                        <Upload className="w-4 h-4" />
                        העלאה
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          updateBlock(idx, '_uploading', true);
                          try {
                            const { file_url } = await base44.integrations.Core.UploadFile({ file });
                            setSections(prev => {
                              const newBlocks = [...prev.blocks];
                              newBlocks[idx] = { ...newBlocks[idx], image_url: file_url, _uploading: false };
                              return { ...prev, blocks: newBlocks };
                            });
                          } catch (err) {
                            alert('שגיאה בהעלאת תמונה: ' + err.message);
                            updateBlock(idx, '_uploading', false);
                          }
                          e.target.value = '';
                        }} />
                      </label>
                    </div>
                    {block._uploading && <p className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />מעלה תמונה...</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-green-700 mb-1">🏷️ Alt Text (תיאור התמונה — חשוב למניעת ספאם)</label>
                    <input type="text" value={block.alt_text || ''} onChange={e => updateBlock(idx, 'alt_text', e.target.value)} className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-green-50/50" placeholder="תיאור קצר של התמונה, למשל: סדנת תנועה בסטודיו פנטהריי" />
                  </div>
                  {block.image_url && <img src={block.image_url} alt={block.alt_text || 'preview'} className="max-h-32 rounded" />}
                </div>
              )}

              {block.type === 'video' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">קישור לסרטון</label>
                    <input type="text" value={block.video_url || ''} onChange={e => updateBlock(idx, 'video_url', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://youtube.com/..." dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">תמונה ממוזערת (אופציונלי — נוצרת אוטומטית מיוטיוב/וימאו)</label>
                    <input type="text" value={block.video_thumbnail_url || ''} onChange={e => updateBlock(idx, 'video_thumbnail_url', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="אוטומטי מיוטיוב, או הדביקי URL..." dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs text-green-700 mb-1">🏷️ Alt Text (תיאור הסרטון)</label>
                    <input type="text" value={block.alt_text || ''} onChange={e => updateBlock(idx, 'alt_text', e.target.value)} className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-green-50/50" placeholder="תיאור קצר של הסרטון" />
                  </div>
                  {(() => {
                    const thumb = block.video_thumbnail_url || getAutoThumbnail(block.video_url);
                    return thumb ? (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500 mb-1">{block.video_thumbnail_url ? 'תמונה ממוזערת (ידנית):' : 'תמונה ממוזערת (אוטומטית):'}</p>
                        <img src={thumb} alt="thumbnail preview" className="max-h-32 rounded border" />
                      </div>
                    ) : block.video_url ? (
                      <p className="text-xs text-orange-600 mt-1">⚠️ לא ניתן לייצר תמונה ממוזערת אוטומטית. העלי תמונה ידנית.</p>
                    ) : null;
                  })()}
                </div>
              )}

              {block.type === 'button' && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={block.button_text} onChange={e => updateBlock(idx, 'button_text', e.target.value)} placeholder="טקסט הכפתור" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <input type="text" value={block.button_url} onChange={e => updateBlock(idx, 'button_url', e.target.value)} placeholder="https://..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm" dir="ltr" />
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <p className="text-xs text-gray-400 mb-2">הוסף בלוק אחרי:</p>
                <div className="flex gap-2 flex-wrap">
                  {BLOCK_TYPES.map(({ type, icon }) => (
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
        <h4 className="font-bold text-gray-800 mb-4">📞 פרטי קשר</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[['contact_phone', 'טלפון'], ['contact_email', 'אימייל'], ['contact_address', 'כתובת']].map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input type="text" value={sections[field] || ''} onChange={e => setSections({...sections, [field]: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Social */}
      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4">📱 רשתות חברתיות</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[['social_whatsapp', 'WhatsApp (מספר)', '972...'], ['social_facebook', 'Facebook', 'https://...'], ['social_instagram', 'Instagram', 'https://...']].map(([field, label, ph]) => (
            <div key={field}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input type="text" value={sections[field] || ''} onChange={e => setSections({...sections, [field]: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder={ph} dir="ltr" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving} className={`flex-1 py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors ${savedIndicator ? 'bg-green-600 text-white' : 'bg-[#6D436D] text-white hover:bg-[#5a365a] disabled:bg-gray-400'}`}>
          {saving ? <><Loader2 className="w-5 h-5 animate-spin" />שומר...</> : savedIndicator ? '✅ נשמר!' : <><Save className="w-5 h-5" />שמור תבנית</>}
        </button>
        <button onClick={() => setShowPreview(!showPreview)} className="px-6 py-3 border-2 border-[#6D436D] text-[#6D436D] rounded-full font-semibold flex items-center gap-2 hover:bg-[#6D436D]/10">
          <Eye className="w-5 h-5" />{showPreview ? 'סגור תצוגה' : 'תצוגה מקדימה'}
        </button>
      </div>

      {showPreview && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 font-medium">תצוגה מקדימה — תבנית Anti-Spam</div>
          <iframe srcDoc={previewHtml} className="w-full h-[600px] border-0" title="Anti-Spam Email Preview" />
        </div>
      )}

      {/* Sticky save */}
      <div className="fixed bottom-6 left-6 z-50">
        <button onClick={handleSave} disabled={saving}
          className={`shadow-xl px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all text-sm ${savedIndicator ? 'bg-green-600 text-white' : 'bg-[#6D436D] text-white hover:bg-[#5a365a] disabled:bg-gray-400'}`}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />שומר...</> : savedIndicator ? '✅ נשמר!' : <><Save className="w-4 h-4" />שמור תבנית</>}
        </button>
      </div>
    </div>
  );
}