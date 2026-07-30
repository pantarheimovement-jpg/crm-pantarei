import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// לכידת payload מהטריגר של סאמיט על יצירת מסמך בתיקיית ההכנסות
// (קבלות ידניות: העברה בנקאית / מזומן / ביט — וגם קבלות אשראי, שיזוהו
// וידולגו בשלב המיפוי). שלב 1 מתוך 2: תיעוד בלבד, אפס כתיבה לרשומות
// משתתפות. כל אירוע נשמר ב-SumitWebhookCapture כדי שאפשר יהיה לקרוא
// את המבנה האמיתי דרך ה-MCP ולכתוב את המיפוי על סמך אמת, לא ניחוש.
Deno.serve(async (req) => {
  console.log('=== 🧾 handleSumitDocument capture v2 ===');
  let payload = null;
  try {
    payload = await req.json();
  } catch (_e) {
    console.log('🧾 Non-JSON body');
  }
  try {
    console.log('🧾 FULL PAYLOAD:', JSON.stringify(payload, null, 2));
  } catch (_e) {
    console.log('🧾 Payload not serializable');
  }

  // שמירה לישות — עטופה כך שכשל שמירה לא יפיל את התשובה לסאמיט
  try {
    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.SumitWebhookCapture.create({
      source: payload?.probe ? 'probe' : 'document-create',
      payload: JSON.stringify(payload)?.slice(0, 90000) || 'null',
      received_at: new Date().toISOString()
    });
  } catch (persistErr) {
    console.error('🧾 Persist failed (non-fatal):', persistErr.message);
  }

  return Response.json({ status: 'captured', mode: 'log+persist', version: 'v2-2026-07-30' });
});
