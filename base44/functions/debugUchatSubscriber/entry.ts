import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// 🔍 פונקציית הוכחה — "מה בדיוק שלחנו ל-uChat ומה הם ענו"
//
// מה היא עושה: שולחת את תבנית pantarei_new_lead למספר של עינת
// (972544535688) דרך ה-API של uChat — בדיוק כמו שהאוטומציה
// שולחת — ומחזירה למסך את הבקשה המלאה ואת התשובה המלאה של uChat,
// מילה במילה.
//
// איך מריצים: בבילדר, בקובץ הזה — כפתור "Test Function" (ימין
// למטה) ← Run Function (עם Payload ריק {}).
//
// איך קוראים את התוצאה:
// - אם ב-uchat_raw_response רשום "status":"ok" ותוך דקה לא
//   הגיעה הודעה לטלפון של עינת — זו ההוכחה: uChat מאשר ובולע.
// - אם רשומה שגיאה אמיתית — נדע סוף-סוף מה הם טוענים שלא בסדר.
// - אם ההודעה דווקא הגיעה — התקלה אצלם תוקנה! מיד לשנות
//   בקובץ processWhatsappQueue את SENDING_PAUSED ל-false.
// ============================================================

const TEST_PHONE = '972544535688'; // המספר של עינת
const TEMPLATE_NAME = 'pantarei_new_lead';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const token = Deno.env.get('UCHAT_API_TOKEN');
    if (!token) return Response.json({ error: 'UCHAT_API_TOKEN חסר בהגדרות' }, { status: 500 });
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const report = { steps: [] };

    // שלב 1: מי המנוי במספר הזה לפי uChat
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${TEST_PHONE}`, { headers });
    const infoBody = await infoResp.text();
    report.steps.push({ step: '1. בדיקת מנוי (get-info-by-user-id)', http_status: infoResp.status, uchat_raw_response: infoBody });

    // שלב 2: אימות שהתבנית קיימת ומסונכרנת אצל uChat
    const listResp = await fetch('https://www.uchat.com.au/api/whatsapp-template/list', { method: 'POST', headers, body: '{}' });
    const listJson = await listResp.json();
    const tpl = (listJson.data || []).find((t) => t.name === TEMPLATE_NAME);
    report.steps.push({
      step: '2. אימות תבנית (whatsapp-template/list)',
      http_status: listResp.status,
      template_found: Boolean(tpl),
      template_details: tpl || 'לא נמצאה! צריך סנכרון תבניות ב-uChat'
    });
    if (!tpl) return Response.json(report);

    // שלב 3: שליחת התבנית — בדיוק כמו שהאוטומציה שולחת
    const requestBody = {
      user_id_list: TEST_PHONE,
      wa_template: {
        namespace: tpl.namespace,
        name: TEMPLATE_NAME,
        lang: 'he',
        params: { 'BODY_{{1}}': 'עינת', 'BODY_{{2}}': 'בדיקת הוכחה - תיעוד מלא' }
      }
    };
    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/broadcast-whatsapp-template-by-user-id', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    const sendBody = await sendResp.text();
    report.steps.push({
      step: '3. שליחת התבנית (broadcast-whatsapp-template-by-user-id)',
      what_we_sent: requestBody,
      http_status: sendResp.status,
      uchat_raw_response: sendBody
    });

    report.how_to_read = 'אם בשלב 3 רשום status ok ותוך דקה לא הגיעה הודעה לטלפון — uChat אישר ובלע. זה התיעוד.';
    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
