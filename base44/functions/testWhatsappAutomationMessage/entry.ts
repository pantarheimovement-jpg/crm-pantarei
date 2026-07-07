import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalizeWhatsappNumber(phone) {
  const digits = String(phone || '').replace(/[\s\-\.\(\)\+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.substring(1)}`;
  if (digits.length === 9 && digits.startsWith('5')) return `972${digits}`;
  return digits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { whatsapp_number, message_content } = await req.json();
    const whatsappNumber = normalizeWhatsappNumber(whatsapp_number);
    const messageContent = String(message_content || '').trim().replace(/\{\{name\}\}/g, 'בדיקה');

    if (!whatsappNumber || !/^972\d{8,10}$/.test(whatsappNumber)) {
      return Response.json({ error: 'מספר וואטסאפ לא תקין. הזיני מספר ישראלי כמו 0501234567 או 972501234567.' }, { status: 400 });
    }

    if (!messageContent) {
      return Response.json({ error: 'חסרה הודעת בדיקה' }, { status: 400 });
    }

    const provider = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();

    if (provider === 'uchat') {
      const token = Deno.env.get('UCHAT_API_TOKEN');
      if (!token) {
        return Response.json({ error: 'חסר UCHAT_API_TOKEN בהגדרות' }, { status: 500 });
      }
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(whatsappNumber)}`, { headers });
      let info = {};
      try { info = await infoResp.json(); } catch (_e) { info = {}; }
      const userNs = info?.user_ns || info?.data?.user_ns;
      if (!userNs) {
        console.log(`uchat: subscriber not found for ${whatsappNumber}`);
        return Response.json({ error: `המספר ${whatsappNumber} לא נמצא כמנוי ב-uChat (הנמען צריך לשלוח קודם הודעה לבוט)` }, { status: 404 });
      }
      const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/send-text', {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_ns: userNs, text: messageContent })
      });
      if (!sendResp.ok) {
        const errText = await sendResp.text();
        return Response.json({ error: `שליחה דרך uChat נכשלה: ${errText}` }, { status: 500 });
      }
      return Response.json({
        success: true,
        sent_immediately: true,
        provider: 'uchat',
        whatsapp_number: whatsappNumber,
        message: 'הודעת הבדיקה נשלחה מיד דרך uChat.'
      });
    }

    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

    if (!GREEN_ID || !GREEN_TOKEN) {
      return Response.json({ error: 'חסרים פרטי חיבור ל-Green API' }, { status: 500 });
    }

    const response = await fetch(`https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${whatsappNumber}@c.us`,
        message: messageContent
      })
    });
    const result = await response.json();

    if (!response.ok || !result.idMessage) {
      return Response.json({ error: result.message || JSON.stringify(result) || 'שליחת הבדיקה נכשלה' }, { status: 500 });
    }

    return Response.json({
      success: true,
      sent_immediately: true,
      message_id: result.idMessage,
      whatsapp_number: whatsappNumber,
      message: 'הודעת הבדיקה נשלחה מיד.'
    });
  } catch (error) {
    console.error('testWhatsappAutomationMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});