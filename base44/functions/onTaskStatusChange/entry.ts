import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeWhatsappNumber(phone) {
  const digits = String(phone || '').replace(/[\s\-\.\(\)\+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.substring(1);
  if (digits.length === 9 && digits.startsWith('5')) return '972' + digits;
  return digits;
}

// =============================================
// Automation: When task status changes,
// update the linked student's status accordingly
// =============================================

Deno.serve(async (req) => {
  console.log('=== onTaskStatusChange triggered ===');

  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { event, data, old_data } = body;

    console.log('Event:', JSON.stringify(event));

    // Only process updates
    if (event.type !== 'update') {
      console.log('Not an update event, skipping');
      return Response.json({ status: 'skipped', reason: 'not update' });
    }

    const newStatus = data?.status;
    const oldStatus = old_data?.status;
    const studentId = data?.student_id;

    // Skip if status didn't change or no student linked
    if (!studentId || newStatus === oldStatus) {
      console.log('No status change or no student linked, skipping');
      return Response.json({ status: 'skipped', reason: 'no status change or no student' });
    }

    console.log(`Task status changed: "${oldStatus}" → "${newStatus}" for student ${studentId}`);

    let whatsappSentImmediately = false;

    if (newStatus === 'ניסיון לשיחה') {
      const student = await base44.asServiceRole.entities.Student.get(studentId);
      const whatsappNumber = normalizeWhatsappNumber(student?.phone);
      const settings = await base44.asServiceRole.entities.AutomationSettings.list();
      const automationSettings = settings?.[0] || {};
      const messageTemplate = automationSettings.whatsapp_task_try_call_message || 'היי {{name}}, ניסיתי ליצור איתך קשר, מתי יהיה לך נוח לדבר?';
      const studentName = student?.full_name || data?.student_name || '';

      if (whatsappNumber) {
        const GREEN_ID = Deno.env.get('GREEN_ID');
        const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

        if (!GREEN_ID || !GREEN_TOKEN) {
          console.log('Green API credentials are missing, skipping immediate WhatsApp send');
        } else {
          const messageContent = messageTemplate.replace(/\{\{name\}\}/g, studentName || 'שלום');
          const response = await fetch(`https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${whatsappNumber}@c.us`,
              message: messageContent
            })
          });
          const result = await response.json();

          if (response.ok && result.idMessage) {
            whatsappSentImmediately = true;
            console.log('✅ WhatsApp follow-up message sent immediately');
          } else {
            console.log('WhatsApp immediate send failed:', JSON.stringify(result));
          }
        }
      } else {
        console.log('No phone number found for WhatsApp follow-up');
      }
    }

    let newStudentStatus = null;

    // Rule 1: Task "בבדיקה" → Student "במעקב ראשוני"
    if (newStatus === 'בבדיקה') {
      newStudentStatus = 'במעקב ראשוני';
    }

    // Rule 1b: Task "לא ענתה" → Student "במעקב ראשוני"
    if (newStatus === 'לא ענתה') {
      newStudentStatus = 'במעקב ראשוני';
    }

    // Rule 2: Task "לא רלוונטי" → Student "לא רלוונטי"
    if (newStatus === 'לא רלוונטי') {
      newStudentStatus = 'לא רלוונטי';
    }

    // Rule 3: Task "אבוד" → Student "לא רלוונטי"
    if (newStatus === 'אבוד') {
      newStudentStatus = 'לא רלוונטי';
    }

    if (newStudentStatus) {
      console.log(`Updating student ${studentId} status to "${newStudentStatus}"`);
      await base44.asServiceRole.entities.Student.update(studentId, {
        status: newStudentStatus
      });
      console.log('✅ Student status updated successfully');
    } else {
      console.log('No student status mapping for this task status');
    }

    return Response.json({ 
      status: 'success', 
      task_status: newStatus, 
      student_status: newStudentStatus,
      whatsapp_sent_immediately: whatsappSentImmediately
    });

  } catch (error) {
    console.error('❌ Error in onTaskStatusChange:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});