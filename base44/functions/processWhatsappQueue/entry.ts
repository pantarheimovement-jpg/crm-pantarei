import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// 🚦 מתג ההשהיה — זה הדבר היחיד שמשנים בקובץ הזה!
//
// false = פעיל: התור נשלח כרגיל.
// true  = מושהה: שום הודעה לא נשלחת, לידים נשארים "ממתין".
// ============================================================
const SENDING_PAUSED = false;

// Official WhatsApp Cloud API (approved templates) — no ban risk.
// Operational messages are sent immediately: no hours window, no daily limit, no random delays.
// A short pause between sends protects Meta template quality rating (~30/min max).
const BETWEEN_SENDS_MS = 2000;

function normalizeWaNumber(raw) {
  let num = String(raw || '').replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('00')) num = num.slice(2);
  if (num.startsWith('972')) return num;
  if (num.startsWith('0')) return '972' + num.slice(1);
  if (num.length === 9 && num.startsWith('5')) return '972' + num;
  return num;
}

// Provider switch: send via uChat (WhatsApp Cloud API) or Green API by WHATSAPP_PROVIDER secret
async function sendWhatsapp(phone972, text, template = null) {
  const provider = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();

  if (provider === 'uchat') {
    const token = Deno.env.get('UCHAT_API_TOKEN');
    if (!token) return { ok: false, error: 'uchat: UCHAT_API_TOKEN not configured' };
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(phone972)}`, { headers });
    let info = {};
    try { info = await infoResp.json(); } catch (_e) { info = {}; }
    let userNs = info?.user_ns || info?.data?.user_ns;

    // Proactive send via approved WhatsApp template (works outside the 24h window)
    if (template?.name) {
      // 1. Fetch the template's namespace (required for template sends)
      const listResp = await fetch('https://www.uchat.com.au/api/whatsapp-template/list', { method: 'POST', headers, body: '{}' });
      const listJson = await listResp.json();
      const tpl = (listJson.data || []).find(t => t.name === template.name);
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
    // 🚦 המתג: כשמושהה — לא נוגעים בתור בכלל. הכל נשאר "ממתין".
    if (SENDING_PAUSED) {
      console.log('SENDING_PAUSED=true — skipping queue processing, leads stay pending.');
      return Response.json({ paused: true, message: 'השליחות מושהות (SENDING_PAUSED=true). הלידים ממתינים בתור.' });
    }

    // Send ALL pending messages immediately — official Cloud API, no window/limit needed.
    const pendingMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({
      status: 'pending'
    }, 'created_date', 50);

    if (!pendingMessages || pendingMessages.length === 0) {
      return Response.json({ message: 'No pending messages found in queue.' });
    }

    const results = [];
    for (let i = 0; i < pendingMessages.length; i++) {
      const message = pendingMessages[i];
      console.log(`Processing message ID: ${message.id} for subscriber: ${message.subscriber_name}`);

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
        results.push({ name: message.subscriber_name, sent: true });
      } else {
        await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
          status: 'failed',
          error_message: sendResult.error || 'Unknown error'
        });
        results.push({ name: message.subscriber_name, sent: false, error: sendResult.error });
      }

      // Short pause between sends to protect Meta template quality rating (~30/min)
      if (i < pendingMessages.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BETWEEN_SENDS_MS));
      }
    }

    // Self-chain: אם נשארו עוד ממתינות (דיוור גדול מ-50) — מפעיל ריצה נוספת מיד,
    // כך שדיוור גדול נשלח בזרם רציף ולא מטפטף 50 כל 5 דקות. שומר על מגבלת 50 לריצה.
    const remaining = await base44.asServiceRole.entities.WhatsappQueue.filter({ status: 'pending' }, 'created_date', 1);
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