import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 📱 handleWhatsappWebhook Started ===');

  // Green API sends GET for webhook verification
  if (req.method === 'GET') {
    return Response.json({ status: 'ok' });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    console.log('📦 Webhook body:', JSON.stringify(body, null, 2));

    // Green API webhook structure
    const typeWebhook = body.typeWebhook;
    
    // We only care about incoming messages
    if (typeWebhook !== 'incomingMessageReceived') {
      console.log(`⏭️ Ignoring webhook type: ${typeWebhook}`);
      return Response.json({ status: 'ignored', reason: `Type: ${typeWebhook}` });
    }

    const messageData = body.messageData;
    const senderData = body.senderData;
    
    if (!senderData || !senderData.chatId) {
      console.log('❌ No sender data');
      return Response.json({ status: 'ignored', reason: 'No sender data' });
    }

    // Extract phone number from chatId (format: 972XXXXXXXXX@c.us)
    const chatId = senderData.chatId;
    
    // Ignore group messages
    if (chatId.includes('@g.us')) {
      console.log('⏭️ Ignoring group message');
      return Response.json({ status: 'ignored', reason: 'Group message' });
    }

    const phoneNumber = chatId.replace('@c.us', '');
    const senderName = senderData.senderName || senderData.pushName || '';
    const messageText = messageData?.textMessageData?.textMessage || 
                        messageData?.extendedTextMessageData?.text || 
                        '';
    
    console.log(`📞 From: ${phoneNumber}, Name: ${senderName}, Message: ${messageText}`);

    // Format phone for search - try both with and without 972 prefix
    const phoneVariants = [phoneNumber];
    if (phoneNumber.startsWith('972')) {
      phoneVariants.push('0' + phoneNumber.substring(3));
      phoneVariants.push('+' + phoneNumber);
    }

    // Check if this phone already exists as a Student
    let existingStudent = null;
    for (const variant of phoneVariants) {
      const results = await base44.asServiceRole.entities.Student.filter({ phone: variant });
      if (results && results.length > 0) {
        existingStudent = results[0];
        break;
      }
    }

    if (existingStudent) {
      console.log(`🔄 Existing student found: ${existingStudent.full_name} (ID: ${existingStudent.id})`);
      // Update last contact date
      await base44.asServiceRole.entities.Student.update(existingStudent.id, {
        last_contact_date: new Date().toISOString()
      });
      return Response.json({ status: 'existing_student', student_id: existingStudent.id, student_name: existingStudent.full_name });
    }

    // --- NEW LEAD ---
    console.log('✨ New WhatsApp lead detected!');

    // Get lead status
    const leadStatuses = await base44.asServiceRole.entities.LeadStatuses.filter({ name: 'ליד חדש' });
    const leadStatus = leadStatuses && leadStatuses.length > 0 ? leadStatuses[0].name : 'ליד חדש';

    // Format phone for storage (Israeli format with leading 0)
    let storedPhone = phoneNumber;
    if (storedPhone.startsWith('972')) {
      storedPhone = '0' + storedPhone.substring(3);
    }

    // Create new Student
    const student = await base44.asServiceRole.entities.Student.create({
      full_name: senderName || storedPhone,
      phone: storedPhone,
      status: leadStatus,
      lead_source: 'וואטסאפ',
      last_contact_date: new Date().toISOString(),
      notes: messageText ? `הודעה ראשונה: ${messageText}` : 'פנייה דרך וואטסאפ'
    });

    console.log(`✅ Student created: ${student.id} - ${student.full_name}`);

    // Create introduction task
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);

    await base44.asServiceRole.entities.Task.create({
      name: 'שיחת היכרות',
      description: `ליד חדש מוואטסאפ: ${senderName || storedPhone}${messageText ? '\nהודעה: ' + messageText : ''}`,
      status: 'ממתין',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      student_id: student.id,
      student_name: student.full_name
    });

    console.log('✅ Introduction task created');

    // Load automation settings for auto-reply message
    const automationSettingsArr = await base44.asServiceRole.entities.AutomationSettings.list();
    const automationSettings = automationSettingsArr && automationSettingsArr.length > 0 ? automationSettingsArr[0] : null;

    const autoReplyEnabled = automationSettings?.whatsapp_auto_reply_enabled !== false;
    const autoReplyTemplate = automationSettings?.whatsapp_auto_reply || 
      'הי {{name}}, קיבלנו את פנייתך 💜 אנחנו נדאג ליצור איתך קשר בהקדם. סטודיו פנטהריי';

    if (!autoReplyEnabled) {
      console.log('⏭️ Auto-reply disabled');
      return Response.json({ status: 'new_lead_created', student_id: student.id, auto_reply: false });
    }

    // Send auto-reply via Green API
    const GREEN_ID = Deno.env.get('GREEN_ID');
    const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

    if (!GREEN_ID || !GREEN_TOKEN) {
      console.log('⚠️ Green API not configured - skipping auto-reply');
      return Response.json({ status: 'new_lead_created', student_id: student.id, auto_reply: false, reason: 'Green API not configured' });
    }

    const displayName = senderName || 'שלום';
    const replyMessage = autoReplyTemplate.replace(/\{\{name\}\}/g, displayName);

    const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;

    const whatsappResponse = await fetch(greenApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chatId,
        message: replyMessage
      })
    });

    const whatsappResult = await whatsappResponse.json();

    if (whatsappResponse.ok && whatsappResult.idMessage) {
      console.log(`✅ Auto-reply sent: ${whatsappResult.idMessage}`);
    } else {
      console.log(`❌ Auto-reply failed:`, whatsappResult);
    }

    return Response.json({ 
      status: 'new_lead_created', 
      student_id: student.id, 
      student_name: student.full_name,
      auto_reply: whatsappResponse.ok 
    });

  } catch (error) {
    console.error('=== ❌ ERROR in handleWhatsappWebhook ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});