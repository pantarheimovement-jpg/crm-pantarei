import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WA_MIN_INTERVAL_MS = 6 * 60 * 1000;
const WA_MAX_INTERVAL_MS = 12 * 60 * 1000;
const DAILY_LIMIT = 25;
const TIME_ZONE = 'Asia/Jerusalem';
const SEND_WINDOW_START = 9;
const SEND_WINDOW_END = 21;

function getIsraelParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getIsraelDateKey(date = new Date()) {
  const parts = getIsraelParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getIsraelHour(date = new Date()) {
  return Number(getIsraelParts(date).hour);
}

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

function isWithinSendingWindow(date = new Date()) {
  const hour = getIsraelHour(date);
  return hour >= SEND_WINDOW_START && hour < SEND_WINDOW_END;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const now = new Date();

    if (!isWithinSendingWindow(now)) {
      return Response.json({
        success: true,
        delayed: true,
        reason: 'outside_sending_window',
        message: 'WhatsApp sending is allowed only between 09:00 and 20:00 Israel time.',
        timezone: TIME_ZONE,
      });
    }

    const recentSentMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({
      status: 'sent'
    }, '-sent_at', 500);

    const todayKey = getIsraelDateKey(now);
    const sentToday = (recentSentMessages || []).filter((item) =>
      item.sent_at && getIsraelDateKey(new Date(item.sent_at)) === todayKey
    );

    if (sentToday.length >= DAILY_LIMIT) {
      return Response.json({
        success: true,
        delayed: true,
        reason: 'daily_limit_reached',
        message: `Daily WhatsApp limit reached (${DAILY_LIMIT}). Pending messages will continue tomorrow after 09:00 Israel time.`,
        sent_today: sentToday.length,
        daily_limit: DAILY_LIMIT,
      });
    }

    const lastSentMessage = (recentSentMessages || []).find((item) => item.sent_at);

    if (lastSentMessage?.sent_at) {
      const lastSentAt = new Date(lastSentMessage.sent_at).getTime();
      const elapsed = Date.now() - lastSentAt;
      const requiredInterval = WA_MIN_INTERVAL_MS + Math.floor(Math.random() * (WA_MAX_INTERVAL_MS - WA_MIN_INTERVAL_MS));

      if (elapsed < requiredInterval) {
        const nextAllowedAt = new Date(lastSentAt + requiredInterval).toISOString();
        const waitSeconds = Math.ceil((requiredInterval - elapsed) / 1000);
        console.log(`WhatsApp safety delay active. Waiting ${waitSeconds} seconds before next send.`);
        return Response.json({
          success: true,
          delayed: true,
          reason: 'minimum_interval_active',
          message: `Safety delay active. Next WhatsApp can be sent at ${nextAllowedAt}`,
          next_allowed_at: nextAllowedAt,
          wait_seconds: waitSeconds
        });
      }
    }

    const pendingMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({
      status: 'pending'
    }, 'created_date', 1);

    if (!pendingMessages || pendingMessages.length === 0) {
      return Response.json({ message: 'No pending messages found in queue.' });
    }

    const message = pendingMessages[0];
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
      return Response.json({ success: true, sent_to: message.subscriber_name, sent_today: sentToday.length + 1 });
    }

    await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
      status: 'failed',
      error_message: sendResult.error || 'Unknown error'
    });
    return Response.json({ success: false, error: sendResult.error });
  } catch (error) {
    console.error('processWhatsappQueue error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});