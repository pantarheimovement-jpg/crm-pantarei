import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================
// 🔍 בדיקת "broadcast בלי create" — גרסה 2 (8.7.2026)
//
// ההשערה: מנוי שהקוד שלנו יוצר לפני השליחה נולד בלי קישור תקין
// לערוץ הוואטסאפ, ולכן ה-broadcast מדלג עליו בשקט. כאן שולחים
// למספר קר בתול (0503859145) *בלי* ליצור מנוי קודם — נותנים
// ל-broadcast של uChat ליצור אותו בעצמו.
//
// איך מריצים: Test Function ← Run (עם Payload ריק {}).
//
// איך קוראים את התוצאה:
// - שלב 1 אמור להראות שהמנוי לא קיים (מספר בתול) — זה טוב.
// - אם אחרי שלב 3 ההודעה מגיעה לנייד 050-3859145 תוך דקה —
//   מצאנו את התקלה! התיקון: להוריד את שלב ה-create מהקוד הקבוע.
// - אם לא מגיעה — ההשערה נפסלת וממשיכים לחפור בתיעוד.
// ============================================================

const TEST_PHONE = '972503859145'; // המספר הקר הבתול לבדיקה
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

    // שלב 1: לוודא שהמנוי לא קיים (אחרי המחיקה) — אמור לחזור ריק
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${TEST_PHONE}`, { headers });
    const infoBody = await infoResp.text();
    report.steps.push({ step: '1. בדיקת מנוי — אמור להיות לא קיים', http_status: infoResp.status, uchat_raw_response: infoBody });

    // שלב 2: שליפת namespace של התבנית
    const listResp = await fetch('https://www.uchat.com.au/api/whatsapp-template/list', { method: 'POST', headers, body: '{}' });
    const listJson = await listResp.json();
    const tpl = (listJson.data || []).find((t) => t.name === TEMPLATE_NAME);
    report.steps.push({ step: '2. אימות תבנית', template_found: Boolean(tpl) });
    if (!tpl) return Response.json(report);

    // שלב 3: broadcast ישירות למספר — בלי create! נותנים ל-uChat ליצור בעצמו
    const requestBody = {
      user_id_list: TEST_PHONE,
      wa_template: {
        namespace: tpl.namespace,
        name: TEMPLATE_NAME,
        lang: 'he',
        params: { 'BODY_{{1}}': 'עינת', 'BODY_{{2}}': 'בדיקת מספר קר בלי create' }
      }
    };
    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/broadcast-whatsapp-template-by-user-id', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    const sendBody = await sendResp.text();
    report.steps.push({
      step: '3. broadcast בלי create',
      what_we_sent: requestBody,
      http_status: sendResp.status,
      uchat_raw_response: sendBody
    });

    // שלב 4: לבדוק אם uChat יצר את המנוי בעצמו (עדות שה-broadcast עיבד אותו)
    await new Promise((r) => setTimeout(r, 3000));
    const info2Resp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${TEST_PHONE}`, { headers });
    const info2Body = await info2Resp.text();
    report.steps.push({ step: '4. האם uChat יצר את המנוי בעצמו אחרי ה-broadcast', http_status: info2Resp.status, uchat_raw_response: info2Body });

    report.how_to_read = 'אם ההודעה הגיעה לנייד 050-3859145 — מצאנו את התקלה: ה-create שלנו הוא הבעיה. אם לא — ההשערה נפסלת.';
    return Response.json(report);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});