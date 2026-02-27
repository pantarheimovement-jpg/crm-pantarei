import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Static keywords that indicate a new lead
const STATIC_KEYWORDS = [
  'אשמח לפרטים', 'פרטים', 'השכרה', 'סדנת יום', 'יום היכרות',
  'קורס', 'קורסי', 'נענע', 'שיעור נסיון', 'שיעור ניסיון',
  'הרשמה', 'מחיר', 'עלות', 'לאבאן', 'פאשיה', 'תדרים',
  'dancefullness', 'LBMS', 'lbms', 'סדנה', 'סדנת',
  'הכשרה', 'השתלמות', 'מודול', 'נקודות מגע', 'סופש',
  'שומטות', 'בדיקת נוכחות', 'הופעה ותעופה', 'פנטהריי', 'פנטרהיי',
  'pantarhei'
];

// Normalize phone number: remove spaces, dashes, dots, parentheses
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\.\(\)\+]/g, '');
}

// Generate multiple search variants for a phone number
function getPhoneVariants(rawPhone) {
  const phone = normalizePhone(rawPhone);
  const variants = new Set();
  variants.add(phone);

  if (phone.startsWith('972')) {
    variants.add('0' + phone.substring(3));       // 0521234567
    variants.add('+' + phone);                     // +972521234567
    variants.add(phone.substring(3));              // 521234567
  } else if (phone.startsWith('0')) {
    variants.add('972' + phone.substring(1));      // 972521234567
    variants.add('+972' + phone.substring(1));     // +972521234567
    variants.add(phone.substring(1));              // 521234567
  } else if (phone.length === 9) {
    // Just the local number without 0 or 972
    variants.add('0' + phone);                     // 0521234567
    variants.add('972' + phone);                   // 972521234567
    variants.add('+972' + phone);                  // +972521234567
  }

  return [...variants];
}

// Check if message contains lead keywords (static + dynamic course names)
function containsLeadKeywords(message, courseNames) {
  if (!message) return false;
  const lowerMessage = message.toLowerCase();

  // Check static keywords
  for (const keyword of STATIC_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // Check dynamic course name keywords
  for (const name of courseNames) {
    if (!name) continue;
    // Extract meaningful words from course name (3+ chars)
    const words = name.split(/[\s\-–,."'()]+/).filter(w => w.length >= 3);
    for (const word of words) {
      if (lowerMessage.includes(word.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

Deno.serve(async (req) => {
  console.log('=== 📱 handleWhatsappWebhook Started ===');

  if (req.method === 'GET') {
    return Response.json({ status: 'ok' });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    console.log('📦 Webhook body:', JSON.stringify(body, null, 2));

    const typeWebhook = body.typeWebhook;
    
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

    const chatId = senderData.chatId;
    
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

    // --- STEP 1: Search for existing student with normalized phone variants ---
    const phoneVariants = getPhoneVariants(phoneNumber);
    console.log(`🔍 Searching with phone variants: ${phoneVariants.join(', ')}`);

    let existingStudent = null;
    for (const variant of phoneVariants) {
      const results = await base44.asServiceRole.entities.Student.filter({ phone: variant });
      if (results && results.length > 0) {
        existingStudent = results[0];
        console.log(`✅ Found existing student with variant "${variant}": ${existingStudent.full_name}`);
        break;
      }
    }

    // Also search by normalizing stored phone numbers (partial match on last 9 digits)
    if (!existingStudent) {
      const last9 = normalizePhone(phoneNumber).slice(-9);
      if (last9.length === 9) {
        // Try searching with 0 + last 9 digits format (most common Israeli storage)
        const formatted = '0' + last9;
        if (!phoneVariants.includes(formatted)) {
          const results = await base44.asServiceRole.entities.Student.filter({ phone: formatted });
          if (results && results.length > 0) {
            existingStudent = results[0];
            console.log(`✅ Found existing student with last-9 match: ${existingStudent.full_name}`);
          }
        }
      }
    }

    if (existingStudent) {
      console.log(`🔄 Existing student: ${existingStudent.full_name} (ID: ${existingStudent.id})`);
      await base44.asServiceRole.entities.Student.update(existingStudent.id, {
        last_contact_date: new Date().toISOString()
      });
      return Response.json({ status: 'existing_student', student_id: existingStudent.id, student_name: existingStudent.full_name });
    }

    // --- STEP 2: No existing student found - check for lead keywords ---
    console.log('🔍 No existing student found. Checking for lead keywords...');

    // Load course names dynamically
    const courses = await base44.asServiceRole.entities.Course.list();
    const courseNames = (courses || []).map(c => c.name).filter(Boolean);
    console.log(`📚 Loaded ${courseNames.length} course names for keyword matching`);

    const isLead = containsLeadKeywords(messageText, courseNames);
    console.log(`🔑 Lead keywords found: ${isLead}`);

    // Format phone for storage (Israeli format with leading 0)
    let storedPhone = normalizePhone(phoneNumber);
    if (storedPhone.startsWith('972')) {
      storedPhone = '0' + storedPhone.substring(3);
    }

    if (isLead) {
      // --- NEW LEAD with matching keywords ---
      console.log('✨ New WhatsApp lead detected (keywords matched)!');

      const student = await base44.asServiceRole.entities.Student.create({
        full_name: senderName || storedPhone,
        phone: storedPhone,
        status: 'ליד חדש',
        lead_source: 'וואטסאפ',
        last_contact_date: new Date().toISOString(),
        notes: messageText ? `הודעה ראשונה: ${messageText}` : 'פנייה דרך וואטסאפ'
      });

      console.log(`✅ Student created as lead: ${student.id} - ${student.full_name}`);

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

      // Send auto-reply
      const automationSettingsArr = await base44.asServiceRole.entities.AutomationSettings.list();
      const automationSettings = automationSettingsArr && automationSettingsArr.length > 0 ? automationSettingsArr[0] : null;

      const autoReplyEnabled = automationSettings?.whatsapp_auto_reply_enabled !== false;
      const autoReplyTemplate = automationSettings?.whatsapp_auto_reply || 
        'הי {{name}}, קיבלנו את פנייתך 💜 אנחנו נדאג ליצור איתך קשר בהקדם. סטודיו פנטהריי';

      if (!autoReplyEnabled) {
        console.log('⏭️ Auto-reply disabled');
        return Response.json({ status: 'new_lead_created', student_id: student.id, auto_reply: false });
      }

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
        body: JSON.stringify({ chatId, message: replyMessage })
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

    } else {
      // --- UNKNOWN: No existing student, no lead keywords ---
      console.log('⚠️ Unknown contact without lead keywords - creating for review');

      const student = await base44.asServiceRole.entities.Student.create({
        full_name: senderName || storedPhone,
        phone: storedPhone,
        status: 'הודעה מוואטסאפ לבדיקה',
        lead_source: 'וואטסאפ',
        last_contact_date: new Date().toISOString(),
        notes: messageText ? `הודעה לבדיקה: ${messageText}` : 'הודעה מוואטסאפ ללא מילות מפתח - לבדיקה ידנית'
      });

      console.log(`✅ Student created for review: ${student.id} - ${student.full_name} (status: הודעה מוואטסאפ לבדיקה)`);

      // NO auto-reply sent for unverified contacts
      return Response.json({ 
        status: 'pending_review', 
        student_id: student.id, 
        student_name: student.full_name,
        auto_reply: false,
        reason: 'No lead keywords found - pending manual review'
      });
    }

  } catch (error) {
    console.error('=== ❌ ERROR in handleWhatsappWebhook ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});