import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Subscriber doesn't exist yet (never messaged us) — create it in uChat and get user_ns
    if (!userNs && template?.name) {
      console.log(`uchat: subscriber not found for ${phone972}, creating...`);
      const createResp = await fetch('https://www.uchat.com.au/api/subscriber/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: phone972, first_name: template.params?.['1'] || '' })
      });
      let created = {};
      try { created = await createResp.json(); } catch (_e) { created = {}; }
      userNs = created?.data?.user_ns || created?.user_ns;
      if (!userNs) {
        const createErr = JSON.stringify(created);
        return { ok: false, error: `uchat: create subscriber failed for ${phone972}: ${createErr}` };
      }
      console.log(`uchat: subscriber created for ${phone972} (${userNs})`);
    }

    if (!userNs) {
      console.log(`uchat: subscriber not found for ${phone972}`);
      return { ok: false, error: `uchat: subscriber not found for ${phone972}` };
    }

    // Proactive send via approved WhatsApp template (works outside the 24h window)
    if (template?.name) {
      const params = {};
      for (const [key, value] of Object.entries(template.params || {})) {
        params[`BODY_{{${key}}}`] = value;
      }
      const tplResp = await fetch('https://www.uchat.com.au/api/subscriber/send-whatsapp-template', {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_ns: userNs, name: template.name, lang: template.lang || 'he', params })
      });
      if (tplResp.ok) {
        console.log(`uchat: template "${template.name}" sent to ${phone972}`);
        return { ok: true };
      }
      const tplErr = await tplResp.text();
      return { ok: false, error: `uchat template send failed: ${tplErr}` };
    }

    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/send-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ns: userNs, text })
    });
    if (sendResp.ok) return { ok: true };
    const errText = await sendResp.text();
    return { ok: false, error: `uchat send failed: ${errText}` };
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
        ? { name: message.template_name, lang: message.template_lang || 'he', params: message.template_params || {} }
        : null;
      const sendResult = await sendWhatsapp(normalizeWaNumber(message.whatsapp_number), message.message_content, template);

      if (sendResult.ok) {
        await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
          status: 'sent',
          sent_at: new Date().toISOString()
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

    const sentCount = results.filter((r) => r.sent).length;
    return Response.json({ success: true, sent: sentCount, failed: results.length - sentCount, results });
  } catch (error) {
    console.error('processWhatsappQueue error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});