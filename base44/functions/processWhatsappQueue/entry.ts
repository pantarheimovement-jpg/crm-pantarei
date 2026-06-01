import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WHATSAPP_MIN_INTERVAL_MS = 10 * 60 * 1000;
const DAILY_LIMIT = 10;
const TIME_ZONE = 'Asia/Jerusalem';
const SEND_WINDOW_START = 9;
const SEND_WINDOW_END = 20;

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

function isWithinSendingWindow(date = new Date()) {
  const hour = getIsraelHour(date);
  return hour >= SEND_WINDOW_START && hour < SEND_WINDOW_END;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const now = new Date();

    // TEMP BYPASS for testing — remove after test
    // if (!isWithinSendingWindow(now)) {
    //   return Response.json({
    //     success: true,
    //     delayed: true,
    //     reason: 'outside_sending_window',
    //     message: 'WhatsApp sending is allowed only between 09:00 and 20:00 Israel time.',
    //     timezone: TIME_ZONE,
    //   });
    // }

    const recentSentMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({
      status: 'sent'
    }, '-sent_at', 500);

    const todayKey = getIsraelDateKey(now);
    const sentToday = (recentSentMessages || []).filter((item) =>
      item.sent_at && getIsraelDateKey(new Date(item.sent_at)) === todayKey
    );

    // TEMP BYPASS for testing — remove after test
    // if (sentToday.length >= DAILY_LIMIT) {
    //   return Response.json({
    //     success: true,
    //     delayed: true,
    //     reason: 'daily_limit_reached',
    //     message: `Daily WhatsApp limit reached (${DAILY_LIMIT}). Pending messages will continue tomorrow after 09:00 Israel time.`,
    //     sent_today: sentToday.length,
    //     daily_limit: DAILY_LIMIT,
    //   });
    // }

    const lastSentMessage = (recentSentMessages || []).find((item) => item.sent_at);

    // TEMP BYPASS for testing — remove after test
    // if (lastSentMessage?.sent_at) {
    //   const lastSentAt = new Date(lastSentMessage.sent_at).getTime();
    //   const elapsed = Date.now() - lastSentAt;
    //   if (elapsed < WHATSAPP_MIN_INTERVAL_MS) {
    //     const nextAllowedAt = new Date(lastSentAt + WHATSAPP_MIN_INTERVAL_MS).toISOString();
    //     const waitSeconds = Math.ceil((WHATSAPP_MIN_INTERVAL_MS - elapsed) / 1000);
    //     console.log(`WhatsApp safety delay active. Waiting ${waitSeconds} seconds before next send.`);
    //     return Response.json({ success: true, delayed: true, reason: 'minimum_interval_active', message: `Safety delay active.`, next_allowed_at: nextAllowedAt, wait_seconds: waitSeconds });
    //   }
    // }

    const pendingMessages = await base44.asServiceRole.entities.WhatsappQueue.filter({
      status: 'pending'
    }, 'created_date', 1);

    if (!pendingMessages || pendingMessages.length === 0) {
      return Response.json({ message: 'No pending messages found in queue.' });
    }

    const message = pendingMessages[0];
    console.log(`Processing message ID: ${message.id} for subscriber: ${message.subscriber_name}`);

    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

    if (!GREEN_ID || !GREEN_TOKEN) {
      return Response.json({ error: 'Configuration Error: Missing API Credentials' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${message.whatsapp_number}@c.us`,
          message: message.message_content
        })
      }
    );

    const result = await response.json();

    if (response.ok) {
      await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      return Response.json({ success: true, sent_to: message.subscriber_name, sent_today: sentToday.length + 1 });
    }

    await base44.asServiceRole.entities.WhatsappQueue.update(message.id, {
      status: 'failed',
      error_message: result.message || JSON.stringify(result) || 'Unknown error'
    });
    return Response.json({ success: false, error: result.message });
  } catch (error) {
    console.error('processWhatsappQueue error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});