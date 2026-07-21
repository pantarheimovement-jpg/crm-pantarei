import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// 🚦 מתג ההשהיה החכמה — זה הדבר היחיד שמשנים בקובץ הזה!
//
// false = פעיל: הכל נשלח כרגיל.
// true  = מושהה: דיוורים המוניים (קמפיינים) מוקפאים בתור,
//         אבל הודעות תפעוליות ללידים חדשים נשלחות תמיד.
// ============================================================
const SENDING_PAUSED = true;

// Official WhatsApp Cloud API (approved templates) — no ban risk.
// Operational messages are sent immediately: no hours window, no daily limit, no random delays.
// A short pause between sends protects Meta template quality rating (~30/min max).
const BETWEEN_SENDS_MS = 2000;

// 🎚️ תקרת תבניות יומית — הגנה על מכסת מטא (WABA חדש מתחיל ב-tier של 250/24ש').
// נספרות הודעות תבנית שנשלחו ב-24 השעות האחרונות; מעבר לתקרה — הודעות קמפיין
// נשארות pending והקרון ממשיך מחר. הודעות תפעוליות (ליד חדש) לא נחסמות לעולם.
const DAILY_TEMPLATE_CAP = 200;

function normalizeWaNumber(raw) {
  let num = String(raw || '').replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('00')) num = num.slice(2);
  if (num.startsWith('972')) return num;
  if (num.startsWith('0')) return '972' + num.slice(1);
  if (num.length === 9 && num.startsWith('5')) return '972' + num;
  return num;
}

// מטמון רשימת תבניות ברמת המודול — קריאה אחת לריצה במקום קריאה לכל הודעה (מונע rate limit של uChat)
let _templateListCache = null;
let _syncAttemptedThisRun = false;

async function loadTemplateList(headers) {
  const listResp = await fetch('https://www.uchat.com.au/api/whatsapp-template/list', { method: 'POST', headers, body: '{}' });
  const listJson = await listResp.json();
  return listJson.data || [];
}

async function getTemplateByName(headers, name) {
  if (!_templateListCache) {
    const data = await loadTemplateList(headers);
    if (data.length > 0) _templateListCache = data; // אל תשמור תשובה ריקה/כושלת במטמון
  }
  let tpl = (_templateListCache || []).find((t) => t.name === name);

  // תבנית לא נמצאה — סנכרון אוטומטי מול מטא דרך /whatsapp-template/sync,
  // פעם אחת לכל היותר בכל ריצה (הגנת rate limit — הלקח מ-16.7), ואז חיפוש חוזר.
  if (!tpl && !_syncAttemptedThisRun) {
    _syncAttemptedThisRun = true;
    console.log(`Template "${name}" not in uChat list — triggering /whatsapp-template/sync`);
    try {
      const syncResp = await fetch('https://www.uchat.com.au/api/whatsapp-template/sync', { method: 'POST', headers, body: '{}' });
      console.log(`uchat template sync response: ${syncResp.status}`);
    } catch (e) {
      console.log('uchat template sync call failed:', e.message);
    }
    _templateListCache = null;
    const data = await loadTemplateList(headers);
    if (data.length > 0) _templateListCache = data;
    tpl = (_templateListCache || []).find((t) => t.name === name);
  }
  return tpl || null;
}

// זיהוי כשל זמני (rate limit / רשת) — ראוי לניסיון חוזר ולא ל-failed לצמיתות
function isTransientError(err) {
  return /not found|rate|timeout|network|429|too many/i.test(String(err || ''));
}

// Provider switch: send via uChat (WhatsApp Cloud API) or Green API by WHATSAPP_PROVIDER secret
async function sendWhatsapp(phone972, text, template = null) {
  const provider = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();

  // 🛡️ הודעת תבנית חייבת לצאת דרך ה-API הרשמי (uChat) — לעולם לא כטקסט חופשי דרך Green.
  // בלי ההגנה הזו, ספק לא-נכון היה שולח את טקסט ה-fallback ומסמן "נשלח" — כשל שקט.
  if (template && template.name && provider !== 'uchat') {
    return { ok: false, error: 'template send requires WHATSAPP_PROVIDER=uchat' };
  }

  if (provider === 'uchat') {
    const token = Deno.env.get('UCHAT_API_TOKEN');
    if (!token) return { ok: false, error: 'uchat: UCHAT_API_TOKEN not configured' };
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Proactive send via approved WhatsApp template (works outside the 24h window)
    if (template?.name) {
      // 1. Fetch the template's namespace once per run (cached at module level)
      const tpl = await getTemplateByName(headers, template.name);
      if (!tpl) return { ok: false, error: `template ${template.name} not found in uChat - run sync` };

      // 2. שליחה ישירה לפי מספר טלפון — האנדפוינט הייעודי מהספסיפיקציה הרשמית.
      // create_if_not_found יוצר את איש הקשר נכון בזמן השליחה (הדגל שחסר!),
      // contact קובע את השם, והקריאה סינכרונית — כישלון חוזר כשגיאה אמיתית.
      // אסור subscriber/create לפני שליחה (יוצר איש קשר רפאים — הבאג של 8.7.2026),
      // ולא broadcast (תור אסינכרוני שאישר "ok" ובלע בשקט מהשרת החי).
      const params = {};
      for (const [key, value] of Object.entries(template.params || {})) {
        params[`BODY_{{${key}}}`] = value;
      }
      const tplResp = await fetch('https://www.uchat.com.au/api/subscriber/send-whatsapp-template-by-user-id', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: phone972,
          create_if_not_found: 'yes',
          contact: { first_name: template.firstName || '' },
          content: { namespace: tpl.namespace, name: template.name, lang: template.lang || 'he', params }
        })
      });
      const tplBody = await tplResp.text();
      console.log(`uchat send-template-by-user-id response (${tplResp.status}): ${tplBody}`);
      let tplJson = {};
      try { tplJson = JSON.parse(tplBody); } catch (_e) { tplJson = {}; }
      if (tplResp.ok && tplJson.status === 'ok') return { ok: true, providerResponse: tplBody };
      return { ok: false, error: `uchat template send failed (${tplResp.status}): ${tplBody}` };
    }

    // Free-text send — requires an existing subscriber (user_ns lookup)
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(phone972)}`, { headers });
    let info = {};
    try { info = await infoResp.json(); } catch (_e) { info = {}; }
    const userNs = info?.user_ns || info?.data?.user_ns;
    if (!userNs) {
      console.log(`uchat: subscriber not found for ${phone972}`);
      return { ok: false, error: `uchat: subscriber not found for ${phone972}` };
    }

    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/send-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ns: userNs, text })
    });
    const sendBody = await sendResp.text();
    console.log(`uchat send-text response (${sendResp.status}): ${sendBody}`);
    let sendJson = {};
    try { sendJson = JSON.parse(sendBody); } catch (_e) { sendJson = {}; }
    if (sendResp.ok && sendJson.status !== 'error' && !sendJson.error) return { ok: true };
    return { ok: false, error: `uchat send failed (${sendResp.status}): ${sendBody}` };
  }

  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');
  if (!GREEN_ID || !GREEN_TOKEN) return { ok: false, error: 'Missing Green API credentials' };
  const response = await fetch(`https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${phone972}@c.us`, message: text })
  });
  let result = {};
  try { result = await response.json(); } catch (_e) { result = {}; }
  if (response.ok && result.idMessage) return { ok: true };
  return { ok: false, error: result.message || JSON.stringify(result) || 'Unknown error' };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    _syncAttemptedThisRun = false; // איפוס לכל ריצה — סנכרון תבניות אחד לכל היותר בריצה
    // ♻️ שחזור תקיעות: שורות שנתקעו ב'processing' מריצה שקרסה (מעל 10 דקות) חוזרות ל'pending'
    const stuckRows = await base44.asServiceRole.entities.WhatsappQueue.filter({ status: 'processing' }, 'created_date', 100);
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    for (const s of (stuckRows || [])) {
      if (new Date(s.updated_date).getTime() < tenMinAgo) {
        await base44.asServiceRole.entities.WhatsappQueue.update(s.id, { status: 'pending', claim_id: '' });
      }
    }

    // 🎚️ מכסה יומית: כמה תבניות נשלחו ב-24 השעות האחרונות
    const dayAgoIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const sentLast24 = await base44.asServiceRole.entities.WhatsappQueue.filter({ status: 'sent', sent_at: { $gte: dayAgoIso } }, '-sent_at', 1000);
    const templatesSent24h = (sentLast24 || []).filter((r) => r.template_name).length;
    const campaignAllowance = Math.max(0, DAILY_TEMPLATE_CAP - templatesSent24h);
    let campaignSentThisRun = 0;
    const RUN_ID = crypto.randomUUID();

    // 🚦 השהיה חכמה: כשמושהה — הודעות קמפיין (עם wa_batch_id) נשארות "ממתין".
    // 🎚️ ויסות מכסה: הודעות קמפיין מוגבלות ליתרת המכסה היומית; תפעוליות עוברות תמיד.
    let pendingMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({
      status: 'pending'
    }, 'created_date', 500);
    const operationalRows = pendingMessages.filter((m) => !m.wa_batch_id);
    const campaignRows = SENDING_PAUSED ? [] : pendingMessages.filter((m) => m.wa_batch_id).slice(0, campaignAllowance);
    if (SENDING_PAUSED && pendingMessages.length > operationalRows.length) {
      console.log('SENDING_PAUSED=true — campaign messages stay pending, processing operational only.');
    }
    if (!SENDING_PAUSED && campaignAllowance === 0 && pendingMessages.some((m) => m.wa_batch_id)) {
      console.log(`Daily template cap (${DAILY_TEMPLATE_CAP}) reached — campaign messages stay pending until tomorrow.`);
    }
    pendingMessages = [...operationalRows, ...campaignRows].slice(0, 50);

    if (!pendingMessages || pendingMessages.length === 0) {
      return Response.json({ message: 'No pending messages found in queue.' });
    }

    const results = [];
    for (let i = 0; i < pendingMessages.length; i++) {
      const message = pendingMessages[i];
      console.log(`Processing message ID: ${message.id} for subscriber: ${message.subscriber_name}`);

      // 🔒 מנעול נגד כפילות: "תופסים" את ההודעה (processing + claim_id ייחודי לריצה),
      // קוראים מחדש ומוודאים שהתפיסה שלנו — אם ריצה מקבילה תפסה אחרינו, מדלגים.
      await base44.asServiceRole.entities.WhatsappQueue.update(message.id, { status: 'processing', claim_id: RUN_ID });
      await new Promise((r) => setTimeout(r, 400));
      const fresh = await base44.asServiceRole.entities.WhatsappQueue.get(message.id).catch(() => null);
      if (!fresh || fresh.status !== 'processing' || fresh.claim_id !== RUN_ID) {
        console.log(`⏭️ Message ${message.id} claimed by another run — skipping.`);
        continue;
      }

      const template = message.template_name
        ? { name: message.template_name, lang: message.template_lang || 'he', params: message.template_params || {}, firstName: message.subscriber_name || '' }
        : null;
      const sendResult = await sendWhatsapp(normalizeWaNumber(message.whatsapp_number), message.message_content, template);

      if (sendResult.ok) {
        await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_response: sendResult.providerResponse || ''
        });
        if (message.wa_batch_id && message.template_name) campaignSentThisRun++;
        results.push({ name: message.subscriber_name, sent: true });
      } else {
        // כשל זמני (rate limit / רשת) — נשאר pending עם ספירת ניסיונות, עד 3 ניסיונות
        const retryCount = (message.retry_count || 0) + 1;
        if (isTransientError(sendResult.error) && retryCount <= 3) {
          await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
            status: 'pending',
            retry_count: retryCount,
            error_message: `retry ${retryCount}/3: ${sendResult.error || 'Unknown error'}`
          });
          results.push({ name: message.subscriber_name, sent: false, retry: retryCount, error: sendResult.error });
        } else {
          await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
            status: 'failed',
            error_message: sendResult.error || 'Unknown error'
          });
          results.push({ name: message.subscriber_name, sent: false, error: sendResult.error });
        }
      }

      // Short pause between sends to protect Meta template quality rating (~30/min)
      if (i < pendingMessages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BETWEEN_SENDS_MS));
      }
    }

    // עדכון רשומת ההיסטוריה כשאצווה הסתיימה — הסטטוס משקף מסירה אמיתית ולא רק כניסה לתור
    const batchIds = [...new Set(pendingMessages.map((m) => m.wa_batch_id).filter(Boolean))];
    for (const batchId of batchIds) {
      const stillPending = await base44.asServiceRole.entities.WhatsappQueue.filter({ wa_batch_id: batchId, status: 'pending' }, 'created_date', 1);
      if (stillPending && stillPending.length > 0) continue;
      const stillProcessing = await base44.asServiceRole.entities.WhatsappQueue.filter({ wa_batch_id: batchId, status: 'processing' }, 'created_date', 1);
      if (stillProcessing && stillProcessing.length > 0) continue;
      const sentRows = await base44.asServiceRole.entities.WhatsappQueue.filter({ wa_batch_id: batchId, status: 'sent' }, 'created_date', 1000);
      const failedRows = await base44.asServiceRole.entities.WhatsappQueue.filter({ wa_batch_id: batchId, status: 'failed' }, 'created_date', 1000);
      const logRows = await base44.asServiceRole.entities.NewsletterLogs.filter({ wa_batch_id: batchId });
      if (logRows && logRows.length > 0) {
        await base44.asServiceRole.entities.NewsletterLogs.update(logRows[0].id, {
          status: failedRows.length === 0 ? 'נשלח בהצלחה' : `נשלח חלקית (${failedRows.length} שגיאות)`,
          recipients_count: sentRows.length
        });
        console.log(`Batch ${batchId} finished: ${sentRows.length} sent, ${failedRows.length} failed — history log updated.`);
      }
    }

    // Self-chain: אם נשארו עוד ממתינות (דיוור גדול מ-50) — מפעיל ריצה נוספת מיד,
    // כך שדיוור גדול נשלח בזרם רציף ולא מטפטף 50 כל 5 דקות. שומר על מגבלת 50 לריצה.
    // רק אם נשארו הודעות שמותר לשלוח עכשיו (בהתחשב בהשהיה ובמכסה היומית)
    const allowanceLeft = campaignAllowance - campaignSentThisRun;
    let remaining = await base44.asServiceRole.entities.WhatsappQueue.filter({ status: 'pending' }, 'created_date', 500);
    if (SENDING_PAUSED || allowanceLeft <= 0) remaining = remaining.filter((m) => !m.wa_batch_id);
    if (remaining && remaining.length > 0) {
      try {
        await Promise.race([
          fetch('https://crm-pantarei-4738bca7.base44.app/functions/processWhatsappQueue', { method: 'POST' }),
          new Promise((resolve) => setTimeout(resolve, 5000))
        ]);
        console.log('More pending messages remain — self-chained next run.');
      } catch (chainError) {
        console.error('self-chain trigger failed:', chainError.message);
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    return Response.json({ success: true, sent: sentCount, failed: results.length - sentCount, results });
  } catch (error) {
    console.error('processWhatsappQueue error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});