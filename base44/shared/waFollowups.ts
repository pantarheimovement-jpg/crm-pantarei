// לוגיקה משותפת לאוטומציות וואטסאפ מבוססות תבניות מאושרות (Meta) דרך WhatsappQueue.
// משמש את: onCourseOpenForRegistration, onTaskStatusChange, runDailyFollowups.

export function normalizePhone972(raw) {
  let num = String(raw || '').replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('00')) num = num.slice(2);
  if (num.startsWith('972')) return num;
  if (num.startsWith('0')) return '972' + num.slice(1);
  if (num.length === 9 && num.startsWith('5')) return '972' + num;
  return num;
}

export function phoneVariants(phone) {
  const n = normalizePhone972(phone);
  if (!n) return [];
  const v = [n];
  if (n.startsWith('972')) v.push('0' + n.slice(3), n.slice(3));
  return v;
}

// הגנת הסרה: בדיקת רשומות Subscribers בכל וריאנטי הטלפון (972... / 0... / 5...).
// מדלגים רק כשמנוי סומן subscribed=false (החלטת עינת 21.7 —
// marketing_consent נולד עם ברירת מחדל false ואינו נתון אמין, לכן לא חוסם).
export async function checkSubscriber(base44, phone) {
  let unsubscribed = false;
  let subscriberId = null;
  for (const v of phoneVariants(phone)) {
    const rows = await base44.asServiceRole.entities.Subscribers.filter({ whatsapp: v }).catch(() => []);
    for (const s of (rows || [])) {
      if (!subscriberId) subscriberId = s.id;
      if (s.subscribed === false) unsubscribed = true;
    }
  }
  return { unsubscribed, subscriberId };
}

// יצירת שורת תור לתבנית מאושרת.
// ⚠️ בכוונה בלי wa_batch_id — שורה "תפעולית" שעוברת תמיד (לא כפופה למכסת הדיוור/השהיה).
export async function queueTemplate(base44, { student, templateName, params, fallbackText }) {
  const phone = normalizePhone972(student && student.phone);
  if (!phone) return { queued: false, reason: 'missing_phone' };
  const { unsubscribed, subscriberId } = await checkSubscriber(base44, phone);
  if (unsubscribed) return { queued: false, reason: 'unsubscribed' };
  await base44.asServiceRole.entities.WhatsappQueue.create({
    subscriber_id: subscriberId || student.id || '',
    subscriber_name: student.full_name || '',
    whatsapp_number: phone,
    message_content: fallbackText || '',
    template_name: templateName,
    template_lang: 'he',
    template_params: params
  });
  return { queued: true };
}

const FOLLOWUP1_LINK_FIELDS = [
  { key: 'dates_text', label: 'מועדי הקורס (טקסט)' },
  { key: 'payment_link', label: 'קישור לדף התשלום בסאמיט' },
  { key: 'registration_link', label: 'קישור לדף הקורס באתר' }
];

export function missingCourseLinks(course) {
  return FOLLOWUP1_LINK_FIELDS.filter((f) => !String((course && course[f.key]) || '').trim());
}

export async function notifyMissingCourseLinks(base44, course, missing) {
  const list = missing.map((f) => `<li>${f.label}</li>`).join('');
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: 'pantarhei.movement@gmail.com',
    subject: `⚠️ לא נשלחו הודעות וואטסאפ — חסרים פרטים בקורס "${(course && course.name) || ''}"`,
    body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #6D436D;">הודעות ההרשמה האוטומטיות (תבנית followup_1) לא נשלחו</h2>
      <p>בקורס <strong>${(course && course.name) || ''}</strong> חסרים השדות הבאים, ולכן אי אפשר לשלוח את תבנית ההרשמה המאושרת:</p>
      <ul>${list}</ul>
      <p>יש למלא אותם במסך עריכת הקורס (בקטע "פרטים להודעות וואטסאפ אוטומטיות").</p>
      <p style="color: #666; font-size: 12px;">סטודיו פנטהריי CRM</p>
    </div>`
  });
}

// תבנית ההרשמה followup_1 — 5 משתנים. נשלחת רק כששלושת שדות הקישורים מלאים בקורס.
export async function queueFollowup1(base44, student, course) {
  const missing = missingCourseLinks(course);
  if (missing.length > 0) return { queued: false, reason: 'missing_course_links', missing: missing.map((f) => f.key) };
  return await queueTemplate(base44, {
    student,
    templateName: 'followup_1',
    params: {
      '1': student.full_name || '',
      '2': course.name || '',
      '3': course.dates_text || '',
      '4': course.payment_link || '',
      '5': course.registration_link || ''
    },
    fallbackText: `היי ${student.full_name || ''}, פרטי ההרשמה ל${course.name || ''}`
  });
}

// בחירת שם הקורס הרלוונטי למשימה (פרמטר 2 של followup_3days)
export function pickCourseNameForTask(task, student, courses) {
  const entries = (student && student.courses) || [];
  for (const e of entries) {
    if (e.course_name && (String((task && task.description) || '').includes(e.course_name) || String((task && task.name) || '').includes(e.course_name))) {
      return e.course_name;
    }
  }
  const byId = new Map((courses || []).map((c) => [c.id, c]));
  for (const e of entries) {
    const c = byId.get(e.course_id);
    if (c && c.status === 'פתוח להרשמה') return c.name;
  }
  if (entries.length > 0 && entries[entries.length - 1].course_name) {
    return entries[entries.length - 1].course_name;
  }
  return (student && (student.course_name || student.interest_area)) || '';
}