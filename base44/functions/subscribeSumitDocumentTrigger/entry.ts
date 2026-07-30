// חד-פעמי: רישום טריגר בסאמיט על יצירת מסמך בתיקיית ההכנסות,
// שיורה ל-handleSumitDocument (מצב לכידה בלבד). עוקף את ה-UI של סאמיט
// ומשתמש ב-API המתועד: POST /triggers/triggers/subscribe/
// ביטול במקרה הצורך: POST /triggers/triggers/unsubscribe/ עם אותו URL.
const INCOME_FOLDER_ID = '2012159284'; // תיקיית "הכנסות"
const INCOME_VIEW_ID = 2012159512; // התצוגה הראשית של ההכנסות
const TARGET_URL =
  'https://crm-pantarei-4738bca7.base44.app/api/apps/695a79b8636552ac4738bca7/functions/handleSumitDocument';

Deno.serve(async (req) => {
  let body = null;
  try {
    body = await req.json();
  } catch (_e) { /* empty body */ }

  // מגן הפעלה: הפונקציה משנה מצב בסאמיט, אז דורשים אישור מפורש בגוף הבקשה
  if (body?.confirm !== 'subscribe-30-07') {
    return Response.json({ status: 'noop', hint: 'pass {"confirm":"subscribe-30-07"} to run, {"action":"unsubscribe","confirm":"subscribe-30-07"} to roll back' });
  }

  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  if (!SUMIT_API_KEY || !SUMIT_COMPANY_ID) {
    return Response.json({ status: 'error', reason: 'missing SUMIT_API_KEY / SUMIT_COMPANY_ID secrets' }, { status: 500 });
  }

  const credentials = {
    CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')),
    APIKey: String(SUMIT_API_KEY).trim()
  };

  const action = body?.action === 'unsubscribe' ? 'unsubscribe' : 'subscribe';
  const payload = action === 'unsubscribe'
    ? { Credentials: credentials, URL: TARGET_URL }
    : { Credentials: credentials, URL: TARGET_URL, Folder: INCOME_FOLDER_ID, View: INCOME_VIEW_ID, TriggerType: 'Create' };

  const res = await fetch(`https://api.sumit.co.il/triggers/triggers/${action}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => null);
  console.log(`🔔 Sumit ${action} result:`, JSON.stringify(data));
  return Response.json({ status: res.ok ? 'done' : 'error', action, httpStatus: res.status, sumit: data });
});
