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

    const queuedMessage = await base44.asServiceRole.entities.WhatsappQueue.create({
      subscriber_id: 'crm-automation-test',
      subscriber_name: 'בדיקת אוטומציה CRM',
      whatsapp_number: whatsappNumber,
      message_content: messageContent,
      status: 'pending'
    });

    return Response.json({
      success: true,
      queued: true,
      queue_id: queuedMessage.id,
      whatsapp_number: whatsappNumber,
      message: 'הודעת הבדיקה נוספה לתור הוואטסאפ ותישלח לפי מגבלות הבטיחות.'
    });
  } catch (error) {
    console.error('testWhatsappAutomationMessage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});