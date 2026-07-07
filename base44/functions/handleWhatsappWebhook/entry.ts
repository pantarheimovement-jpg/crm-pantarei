import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// =============================================
// CONFIGURATION
// =============================================
// PANTAREI_PHONE is loaded dynamically from GeneralSettings.business_phone
// Fallback to old number only if not configured
let PANTAREI_PHONE = '972503859256';
let PANTAREI_CHAT_ID = '972503859256@c.us';
const NOTIFICATION_EMAIL = 'pantarhei.movement@gmail.com';

// uChat business phone (WhatsApp Cloud API via uChat)
const UCHAT_BUSINESS_PHONE = '972515041100';

// Per-request state for uChat inbound flow (reply is returned in the response, not sent via API)
const uchatCapture = { active: false, chatId: null, reply: null, userNs: null, phone972: null };

// =============================================
// uChat SEND HELPERS
// =============================================
async function sendViaUchat(phone972, text) {
  const token = Deno.env.get('UCHAT_API_TOKEN');
  if (!token) {
    console.log('⚠️ uchat: UCHAT_API_TOKEN not configured');
    return false;
  }
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(phone972)}`, { headers });
    let info = {};
    try { info = await infoResp.json(); } catch (_e) { info = {}; }
    const userNs = info?.user_ns || info?.data?.user_ns;
    if (!userNs) {
      console.log(`uchat: subscriber not found for ${phone972}`);
      return false;
    }
    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/send-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ns: userNs, text })
    });
    if (sendResp.ok) {
      console.log(`✅ uChat message sent to ${phone972}`);
      return true;
    }
    const errText = await sendResp.text();
    console.log(`❌ uChat send failed for ${phone972}: ${errText}`);
    return false;
  } catch (e) {
    console.error('❌ uChat error:', e.message);
    return false;
  }
}

async function saveUchatUserNs(base44, phone972, userNs) {
  try {
    const local = '0' + phone972.substring(3);
    for (const variant of [phone972, local]) {
      const students = await base44.asServiceRole.entities.Student.filter({ phone: variant });
      if (students && students.length > 0) {
        if (students[0].uchat_user_ns !== userNs) {
          await base44.asServiceRole.entities.Student.update(students[0].id, { uchat_user_ns: userNs });
          console.log(`✅ uchat_user_ns saved on student ${students[0].full_name}`);
        }
        break;
      }
    }
    const subs = await base44.asServiceRole.entities.Subscribers.filter({ whatsapp: phone972 });
    if (subs && subs.length > 0 && subs[0].uchat_user_ns !== userNs) {
      await base44.asServiceRole.entities.Subscribers.update(subs[0].id, { uchat_user_ns: userNs });
      console.log('✅ uchat_user_ns saved on subscriber');
    }
  } catch (e) {
    console.log('⚠️ saveUchatUserNs error:', e.message);
  }
}

// Ofir's approval keywords
const APPROVE_KEYWORDS = ['כן', 'שלח', 'מאושר', 'כ', 'אשר', 'אישור', 'yes', 'שלחי'];
const REJECT_KEYWORDS = ['לא', 'לא רלוונטי', 'ל', 'דלג', 'no', 'ביטול'];

// Unsubscribe keywords
const UNSUBSCRIBE_KEYWORDS = ['הסר', 'הסרה', 'הסירו', 'הסירו אותי', 'הסר אותי', 'להסרה'];

// =============================================
// INTEREST PHRASES - ביטויים מובהקים של התעניינות
// =============================================
const INTEREST_PHRASES = [
  'אשמח לפרטים', 'אשמח לקבל פרטים', 'אשמח לשמוע', 'אשמח לדעת',
  'מתעניינת', 'מתעניין', 'מעוניינת', 'מעוניין',
  'מתעניינת בפרטים', 'מתעניין בפרטים', 'מעוניינת בפרטים', 'מעוניין בפרטים',
  'רוצה להירשם', 'רוצה לדעת', 'רוצה פרטים', 'לקבל פרטים',
  'איך נרשמים', 'איך אפשר להירשם', 'לגבי הרשמה',
  'כמה עולה', 'מה המחיר', 'מה העלות', 'מחיר',
  'פרטים נוספים', 'פרטים על', 'עוד פרטים',
  'יש מקום', 'יש מקומות', 'עדיין יש מקום',
  'מתי מתחיל', 'מתי זה', 'באיזה ימים',
  'שיעור נסיון', 'שיעור ניסיון', 'ניסיון',
  'אפשר לנסות', 'אפשר להצטרף',
  'הרשמה', 'להירשם', 'נרשמים', 'הצטרפות',
  'עלות', 'תשלום', 'תשלומים'
];

// =============================================
// COURSE-RELATED KEYWORDS
// =============================================
const COURSE_KEYWORDS = [
  'קורס', 'קורסי', 'קורסים',
  'סדנה', 'סדנת', 'סדנאות',
  'חוג', 'חוגים',
  'לימודים', 'לימוד',
  'הכשרה', 'הכשרת',
  'השתלמות',
  'מודול',
  'לאבאן', 'פאשיה', 'תדרים',
  'dancefullness', 'LBMS', 'lbms',
  'נקודות מגע', 'שומטות', 'בדיקת נוכחות',
  'הופעה ותעופה', 'פנטהריי', 'פנטרהיי', 'pantarhei',
  'נענע', 'סופש'
];

// =============================================
// PHONE NORMALIZATION
// =============================================
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\.\(\)\+]/g, '');
}

function getPhoneVariants(rawPhone) {
  const phone = normalizePhone(rawPhone);
  const variants = new Set();
  variants.add(phone);

  if (phone.startsWith('972')) {
    variants.add('0' + phone.substring(3));
    variants.add('+' + phone);
    variants.add(phone.substring(3));
  } else if (phone.startsWith('0')) {
    variants.add('972' + phone.substring(1));
    variants.add('+972' + phone.substring(1));
    variants.add(phone.substring(1));
  } else if (phone.length === 9) {
    variants.add('0' + phone);
    variants.add('972' + phone);
    variants.add('+972' + phone);
  }

  return [...variants];
}

function isPantareiPhone(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  const pantareiVariants = [...getPhoneVariants(PANTAREI_PHONE), ...getPhoneVariants(UCHAT_BUSINESS_PHONE)];
  return pantareiVariants.includes(normalized);
}


// =============================================
// MESSAGE INTENT ANALYSIS
// =============================================
function extractMessageIntent(message, courseNames) {
  const debugInfo = {
    hasInterestPhrase: false,
    matchedInterestPhrase: null,
    hasCourseKeyword: false,
    matchedCourseKeyword: null,
    hasSpecificCourseName: false,
    matchedCourseName: null,
    intentType: 'ignore'
  };

  if (!message || message.trim().length === 0) {
    return { intentType: 'ignore', identifiedCourseName: null, debugInfo };
  }

  const lowerMessage = message.toLowerCase().trim();

  for (const phrase of INTEREST_PHRASES) {
    if (lowerMessage.includes(phrase.toLowerCase())) {
      debugInfo.hasInterestPhrase = true;
      debugInfo.matchedInterestPhrase = phrase;
      break;
    }
  }

  for (const keyword of COURSE_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      debugInfo.hasCourseKeyword = true;
      debugInfo.matchedCourseKeyword = keyword;
      break;
    }
  }

  for (const name of courseNames) {
    if (!name) continue;
    const lowerName = name.toLowerCase();
    if (lowerMessage.includes(lowerName)) {
      debugInfo.hasSpecificCourseName = true;
      debugInfo.matchedCourseName = name;
      break;
    }
    const words = name.split(/[\s\-–,."'()]+/).filter(w => w.length >= 4);
    for (const word of words) {
      if (lowerMessage.includes(word.toLowerCase())) {
        debugInfo.hasSpecificCourseName = true;
        debugInfo.matchedCourseName = name;
        break;
      }
    }
    if (debugInfo.hasSpecificCourseName) break;
  }

  const hasCourseContext = debugInfo.hasCourseKeyword || debugInfo.hasSpecificCourseName;

  if (debugInfo.hasInterestPhrase) {
    debugInfo.intentType = 'strong_lead';
    return { intentType: 'strong_lead', identifiedCourseName: debugInfo.matchedCourseName || null, debugInfo };
  }

  if (hasCourseContext) {
    debugInfo.intentType = 'for_review';
    return { intentType: 'for_review', identifiedCourseName: debugInfo.matchedCourseName || null, debugInfo };
  }

  debugInfo.intentType = 'ignore';
  return { intentType: 'ignore', identifiedCourseName: null, debugInfo };
}

// =============================================
// MAIN WEBHOOK HANDLER
// =============================================
Deno.serve(async (req) => {
  console.log('=== 📱 handleWhatsappWebhook Started ===');

  if (req.method === 'GET') {
    return Response.json({ status: 'ok' });
  }

  const response = await handleRequest(req);

  if (uchatCapture.active) {
    // Save user_ns for future sends (record may have been created during handling)
    if (uchatCapture.userNs && uchatCapture.phone972) {
      try {
        const base44 = createClientFromRequest(req);
        await saveUchatUserNs(base44, uchatCapture.phone972, uchatCapture.userNs);
      } catch (e) {
        console.log('⚠️ user_ns save error:', e.message);
      }
    }
    // Inject captured auto-reply into the JSON response for the uChat flow
    try {
      const data = await response.json();
      if (uchatCapture.reply) data.reply = uchatCapture.reply;
      return Response.json(data, { status: response.status });
    } catch (_e) {
      return response;
    }
  }

  return response;
});

async function handleRequest(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // =============================================
    // uChat INBOUND FORMAT DETECTION
    // =============================================
    uchatCapture.active = false;
    uchatCapture.chatId = null;
    uchatCapture.reply = null;
    uchatCapture.userNs = null;
    uchatCapture.phone972 = null;

    if (body.phone && body.message && !body.messageData) {
      const webhookSecret = Deno.env.get('UCHAT_WEBHOOK_SECRET');
      if (webhookSecret && body.secret !== webhookSecret) {
        console.log('❌ uChat webhook secret mismatch');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      let phone972 = normalizePhone(body.phone);
      if (phone972.startsWith('0')) phone972 = '972' + phone972.substring(1);
      uchatCapture.active = true;
      uchatCapture.chatId = phone972 + '@c.us';
      uchatCapture.userNs = body.user_ns || null;
      uchatCapture.phone972 = phone972;
      // Synthesize Green API format so all existing logic runs unchanged
      body.typeWebhook = 'incomingMessageReceived';
      body.senderData = { chatId: phone972 + '@c.us', senderName: body.first_name || '' };
      body.messageData = { textMessageData: { textMessage: body.message } };
      console.log(`📥 uChat inbound message from ${phone972}`);
    }

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

    console.log(`📞 From: ${phoneNumber}, Name: ${senderName}, Message: "${messageText}"`);

    // Load ALL needed data in one parallel round-trip (keeps response time low)
    const [generalSettingsArr, knownContacts, courses, automationSettingsArr] = await Promise.all([
      base44.asServiceRole.entities.GeneralSettings.list().catch(() => []),
      base44.asServiceRole.entities.WhatsappKnownContacts.list().catch(() => []),
      base44.asServiceRole.entities.Course.list().catch(() => []),
      base44.asServiceRole.entities.AutomationSettings.list().catch(() => [])
    ]);

    const generalSettings = generalSettingsArr && generalSettingsArr.length > 0 ? generalSettingsArr[0] : null;
    if (generalSettings?.business_phone) {
      let bizPhone = normalizePhone(generalSettings.business_phone);
      if (bizPhone.startsWith('0')) bizPhone = '972' + bizPhone.substring(1);
      PANTAREI_PHONE = bizPhone;
      PANTAREI_CHAT_ID = bizPhone + '@c.us';
    }
    const automationSettings = automationSettingsArr && automationSettingsArr.length > 0 ? automationSettingsArr[0] : null;

    // =============================================
    // CHECK IF THIS IS AN UNSUBSCRIBE REQUEST
    // =============================================
    const lowerMsg = messageText.trim().toLowerCase();
    const isUnsubscribeRequest = UNSUBSCRIBE_KEYWORDS.some(kw => lowerMsg === kw || lowerMsg === kw + ' אותי');
    if (isUnsubscribeRequest && !isPantareiPhone(phoneNumber)) {
      console.log(`📭 Unsubscribe request from ${phoneNumber}`);
      await sendWhatsAppToChat(chatId, 'הוסרת מרשימת התפוצה בהצלחה 💜');
      const result = await handleUnsubscribe(base44, phoneNumber);
      return Response.json(result);
    }

    // =============================================
    // CHECK IF THIS IS OFIR'S APPROVAL/REJECTION
    // =============================================
    if (isPantareiPhone(phoneNumber)) {
      console.log('👩‍💼 Message from Pantarei phone - checking for approval/rejection');
      const result = await handleOfirResponse(base44, messageText);
      return Response.json(result);
    }

    // =============================================
    // CHECK IF THIS IS A KNOWN CONTACT (SKIP)
    // =============================================
    const senderVariants = getPhoneVariants(phoneNumber);
    const isKnownContact = (knownContacts || []).some(contact => {
      const contactVariants = getPhoneVariants(contact.phone);
      return senderVariants.some(v => contactVariants.includes(v));
    });

    if (isKnownContact) {
      console.log(`⏭️ Known contact (${phoneNumber}) - skipping lead check`);
      return Response.json({ status: 'ignored', reason: 'Known contact - not a lead' });
    }

    // --- STEP 1: Course names for intent analysis (preloaded in parallel above) ---
    const courseNames = (courses || []).map(c => c.name).filter(Boolean);
    console.log(`📚 Loaded ${courseNames.length} course names for keyword matching`);

    // --- STEP 2: Analyze message intent ---
    const intent = extractMessageIntent(messageText, courseNames);
    console.log(`🧠 Intent analysis:`, JSON.stringify(intent.debugInfo, null, 2));
    console.log(`🎯 Intent type: ${intent.intentType}`);

    // --- STEP 3: If intent is IGNORE, stop immediately ---
    if (intent.intentType === 'ignore') {
      console.log('🚫 Message ignored - no course-related content or interest detected');
      return Response.json({
        status: 'ignored',
        reason: 'No course-related content or interest phrases detected',
        debug: intent.debugInfo
      });
    }

    // --- STEP 4: Search for existing student ---
    const phoneVariants = getPhoneVariants(phoneNumber);
    console.log(`🔍 Searching with phone variants: ${phoneVariants.join(', ')}`);

    let existingStudent = null;
    const variantResults = await Promise.all(
      phoneVariants.map(v => base44.asServiceRole.entities.Student.filter({ phone: v }).catch(() => []))
    );
    for (let i = 0; i < variantResults.length; i++) {
      if (variantResults[i] && variantResults[i].length > 0) {
        existingStudent = variantResults[i][0];
        console.log(`✅ Found existing student with variant "${phoneVariants[i]}": ${existingStudent.full_name}`);
        break;
      }
    }

    if (!existingStudent) {
      const last9 = normalizePhone(phoneNumber).slice(-9);
      if (last9.length === 9) {
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

    let storedPhone = normalizePhone(phoneNumber);
    if (storedPhone.startsWith('972')) {
      storedPhone = '0' + storedPhone.substring(3);
    }

    // =============================================
    // FAST-REPLY PATHS: reply is computed now, heavy work runs in background
    // =============================================
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    if (intent.intentType === 'strong_lead') {

      if (existingStudent) {
        const existingCourses = existingStudent.courses || [];
        const identifiedCourse = intent.identifiedCourseName;
        let isNewCourseInterest = true;

        if (identifiedCourse) {
          for (const c of existingCourses) {
            if (c.course_name && c.course_name.toLowerCase().includes(identifiedCourse.toLowerCase())) {
              isNewCourseInterest = false;
              break;
            }
          }
        }

        if (isNewCourseInterest) {
          console.log(`✨ New course interest for existing student "${existingStudent.full_name}"`);
          const autoReplySent = await sendAutoReply(automationSettings, chatId, senderName, 'existing_new_course');

          {
            const matchedCourse = identifiedCourse ? courses.find(c => c.name === identifiedCourse) : null;
            const updatedCourses = [...existingCourses];
            if (matchedCourse) {
              updatedCourses.push({
                course_id: matchedCourse.id,
                course_name: matchedCourse.name,
                status: 'ליד חדש',
                registration_date: today
              });
            }

            const updateData = {
              last_contact_date: nowIso,
              notes: (existingStudent.notes || '') + `\n📱 ${new Date().toLocaleDateString('he-IL')}: התעניינות חדשה בוואטסאפ${identifiedCourse ? ' - ' + identifiedCourse : ''}: "${messageText}"`
            };
            if (updatedCourses.length > existingCourses.length) {
              updateData.courses = updatedCourses;
            }
            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() + 2);
            const isFasciaWA = (identifiedCourse || '').includes('פאשיה');
            const introTaskName = isFasciaWA ? 'שיחת היכרות פאשיה בתנועה' : (identifiedCourse ? `שיחת היכרות - ${identifiedCourse}` : 'שיחת היכרות');

            // Update student + check for existing intro task IN PARALLEL
            const [, existingIntroTasks] = await Promise.all([
              base44.asServiceRole.entities.Student.update(existingStudent.id, updateData),
              base44.asServiceRole.entities.Task.filter({
                student_id: existingStudent.id,
                name: introTaskName
              })
            ]);
            console.log('✅ Student updated with new interest');
            const hasOpenIntroTask = (existingIntroTasks || []).some(t => t.status !== 'הושלם' && t.status !== 'אבוד');

            if (!hasOpenIntroTask) {
              await base44.asServiceRole.entities.Task.create({
                name: introTaskName,
                description: `התעניינות חדשה מוואטסאפ: ${existingStudent.full_name}\nקורס: ${identifiedCourse || 'לא צוין'}\nהודעה: ${messageText}`,
                status: 'ממתין',
                scheduled_date: scheduledDate.toISOString().split('T')[0],
                student_id: existingStudent.id,
                student_name: existingStudent.full_name
              });
              console.log('✅ Introduction task created for existing student with new course');
            }
          }

          return Response.json({
            status: 'existing_student_new_interest',
            student_id: existingStudent.id,
            student_name: existingStudent.full_name,
            identified_course: identifiedCourse,
            auto_reply: autoReplySent,
            intent: intent.debugInfo
          });

        } else {
          console.log(`⏭️ Existing student already linked to this course - updating last contact only`);
          await base44.asServiceRole.entities.Student.update(existingStudent.id, { last_contact_date: nowIso });

          return Response.json({
            status: 'existing_student_known_course',
            student_id: existingStudent.id,
            student_name: existingStudent.full_name,
            auto_reply: false,
            intent: intent.debugInfo
          });
        }

      } else {
        console.log('✨ New WhatsApp STRONG LEAD detected!');
        const autoReplySent = await sendAutoReply(automationSettings, chatId, senderName, 'new_lead');

        {
          const matchedCourse = intent.identifiedCourseName ? courses.find(c => c.name === intent.identifiedCourseName) : null;

          const student = await base44.asServiceRole.entities.Student.create({
            full_name: senderName || storedPhone,
            phone: storedPhone,
            status: 'ליד חדש',
            lead_source: 'וואטסאפ',
            interest_area: intent.identifiedCourseName || '',
            lead_entry_date: today,
            last_contact_date: nowIso,
            notes: `הודעה ראשונה (ליד חזק): ${messageText}`,
            ...(matchedCourse ? {
              course_id: matchedCourse.id,
              course_name: matchedCourse.name,
              courses: [{
                course_id: matchedCourse.id,
                course_name: matchedCourse.name,
                status: 'ליד חדש',
                registration_date: today
              }]
            } : {})
          });
          console.log(`✅ New lead created: ${student.id} - ${student.full_name}`);

          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + 2);
          const isFasciaNewLead = (intent.identifiedCourseName || '').includes('פאשיה');
          const newLeadTaskName = isFasciaNewLead ? 'שיחת היכרות פאשיה בתנועה' : (intent.identifiedCourseName ? `שיחת היכרות - ${intent.identifiedCourseName}` : 'שיחת היכרות');

          // Task creation + subscriber upsert IN PARALLEL
          await Promise.all([
            base44.asServiceRole.entities.Task.create({
              name: newLeadTaskName,
              description: `ליד חדש מוואטסאפ: ${senderName || storedPhone}\nהודעה: ${messageText}${intent.identifiedCourseName ? '\nקורס: ' + intent.identifiedCourseName : ''}`,
              status: 'ממתין',
              scheduled_date: scheduledDate.toISOString().split('T')[0],
              student_id: student.id,
              student_name: student.full_name
            }),
            createOrUpdateSubscriber(base44, {
              name: senderName || storedPhone,
              phone: storedPhone,
              courseName: intent.identifiedCourseName
            })
          ]);
          console.log('✅ Introduction task created');
        }

        return Response.json({
          status: 'new_lead_created',
          student_name: senderName || storedPhone,
          identified_course: intent.identifiedCourseName,
          auto_reply: autoReplySent,
          intent: intent.debugInfo
        });
      }
    }

    // =============================================
    // FOR REVIEW PATH — notification to Ofir runs in background
    // =============================================
    if (intent.intentType === 'for_review') {

      if (existingStudent) {
        console.log(`📝 Existing student "${existingStudent.full_name}" - message for review`);

        // Student update + Ofir notification IN PARALLEL
        await Promise.all([
          base44.asServiceRole.entities.Student.update(existingStudent.id, {
            last_contact_date: nowIso,
            status: 'הודעה מוואטסאפ לבדיקה',
            lead_source: existingStudent.lead_source || 'וואטסאפ',
            notes: (existingStudent.notes || '') + `\n📱 ${new Date().toLocaleDateString('he-IL')}: הודעה לבדיקה: "${messageText}"`
          }),
          notifyOfir(base44, existingStudent.full_name, storedPhone, messageText, intent.identifiedCourseName)
        ]);

        return Response.json({
          status: 'existing_student_for_review',
          student_id: existingStudent.id,
          student_name: existingStudent.full_name,
          ofir_notified: true,
          intent: intent.debugInfo
        });

      } else {
        console.log('📋 New contact - creating for review + notifying Ofir');

        const student = await base44.asServiceRole.entities.Student.create({
          full_name: senderName || storedPhone,
          phone: storedPhone,
          status: 'הודעה מוואטסאפ לבדיקה',
          lead_source: 'וואטסאפ',
          lead_entry_date: today,
          last_contact_date: nowIso,
          notes: `הודעה לבדיקה: ${messageText}`
        });
        console.log(`✅ Student created for review: ${student.id} - ${student.full_name}`);
        await notifyOfir(base44, student.full_name, storedPhone, messageText, intent.identifiedCourseName);

        return Response.json({
          status: 'pending_review',
          student_name: senderName || storedPhone,
          ofir_notified: true,
          intent: intent.debugInfo
        });
      }
    }

    console.log('⚠️ Unexpected fallthrough - ignoring');
    return Response.json({ status: 'ignored', reason: 'Unexpected fallthrough' });

  } catch (error) {
    console.error('=== ❌ ERROR in handleWhatsappWebhook ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// =============================================
// NOTIFY OFIR — WhatsApp + Email
// =============================================
async function notifyOfir(base44, leadName, leadPhone, messageText, courseName) {
  // WhatsApp notification to Ofir (via active provider)
  const whatsappMsg = `💜 ליד חדש מוואטסאפ לבדיקה:\n\n👤 *${leadName}*\n📞 ${leadPhone}${courseName ? '\n📚 ' + courseName : ''}\n💬 "${messageText}"\n\nלשלוח תגובה אוטומטית?\nהשיבי *כן ${leadName}* או *לא ${leadName}*`;
  // WhatsApp + email notifications IN PARALLEL
  const whatsappPromise = sendWhatsAppToChat(PANTAREI_CHAT_ID, whatsappMsg);

  // Email notification
  try {
    const emailPromise = base44.asServiceRole.integrations.Core.SendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `💜 ליד חדש מוואטסאפ לבדיקה - ${leadName}`,
      body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #6D436D;">ליד חדש מוואטסאפ לבדיקה</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
          <tr><td style="padding: 8px; font-weight: bold;">שם:</td><td style="padding: 8px;">${leadName}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">טלפון:</td><td style="padding: 8px;">${leadPhone}</td></tr>
          ${courseName ? `<tr><td style="padding: 8px; font-weight: bold;">קורס:</td><td style="padding: 8px;">${courseName}</td></tr>` : ''}
          <tr><td style="padding: 8px; font-weight: bold;">הודעה:</td><td style="padding: 8px;">${messageText}</td></tr>
        </table>
        <p style="margin-top: 20px; color: #666;">ניתן לאשר/לדחות ע"י תגובה בוואטסאפ לסוכן.</p>
      </div>`
    });
    const [ofirSent] = await Promise.all([whatsappPromise, emailPromise]);
    console.log(ofirSent ? '✅ Ofir notified via WhatsApp' : '❌ Failed to notify Ofir via WhatsApp');
    console.log('✅ Ofir notified via email');
  } catch (e) {
    console.error('❌ Error notifying Ofir:', e.message);
    await whatsappPromise.catch(() => {});
  }
}

// =============================================
// HANDLE OFIR'S APPROVAL/REJECTION RESPONSE
// =============================================
async function handleOfirResponse(base44, messageText) {
  const trimmed = messageText.trim();
  const trimmedLower = trimmed.toLowerCase();

  // Extract name from message: "כן עינת גן אל" → name = "עינת גן אל"
  let extractedName = '';
  let isApproval = false;
  let isRejection = false;

  for (const k of APPROVE_KEYWORDS) {
    if (trimmedLower === k) {
      isApproval = true;
      break;
    }
    if (trimmedLower.startsWith(k + ' ')) {
      isApproval = true;
      extractedName = trimmed.substring(k.length).trim();
      break;
    }
  }

  if (!isApproval) {
    for (const k of REJECT_KEYWORDS) {
      if (trimmedLower === k) {
        isRejection = true;
        break;
      }
      if (trimmedLower.startsWith(k + ' ')) {
        isRejection = true;
        extractedName = trimmed.substring(k.length).trim();
        break;
      }
    }
  }

  if (!isApproval && !isRejection) {
    console.log('👩‍💼 Ofir sent a message but not an approval/rejection - ignoring');
    return { status: 'ignored', reason: 'Ofir message not approval/rejection' };
  }

  console.log(`👩‍💼 Ofir response: approval=${isApproval}, rejection=${isRejection}, extractedName="${extractedName}"`);

  // Find pending student - by name if provided, otherwise most recent
  let pendingStudents;
  if (extractedName) {
    // Search by name among pending students
    const allPending = await base44.asServiceRole.entities.Student.filter(
      { status: 'הודעה מוואטסאפ לבדיקה' },
      '-created_date',
      50
    );
    // Try exact match first, then partial match
    pendingStudents = allPending.filter(s => 
      s.full_name && s.full_name.trim().toLowerCase() === extractedName.toLowerCase()
    );
    if (pendingStudents.length === 0) {
      pendingStudents = allPending.filter(s => 
        s.full_name && s.full_name.trim().toLowerCase().includes(extractedName.toLowerCase())
      );
    }
    if (pendingStudents.length === 0) {
      console.log(`👩‍💼 No pending lead found with name "${extractedName}"`);
      await sendWhatsApp(`לא נמצא ליד בשם "${extractedName}" ממתין לבדיקה.`);
      return { status: 'no_matching_lead', name: extractedName };
    }
  } else {
    // Fallback: most recent pending
    pendingStudents = await base44.asServiceRole.entities.Student.filter(
      { status: 'הודעה מוואטסאפ לבדיקה' },
      '-created_date',
      1
    );
  }

  if (!pendingStudents || pendingStudents.length === 0) {
    console.log('👩‍💼 No pending leads to approve/reject');
    await sendWhatsApp(`אין לידים ממתינים לבדיקה כרגע.`);
    return { status: 'no_pending_leads' };
  }

  const student = pendingStudents[0];
  console.log(`👩‍💼 Processing Ofir's response for student: ${student.full_name}`);

  if (isApproval) {
    // Update student to "ליד חדש"
    await base44.asServiceRole.entities.Student.update(student.id, {
      status: 'ליד חדש'
    });

    // Send auto-reply to the lead
    let whatsappNumber = normalizePhone(student.phone);
    if (whatsappNumber.startsWith('0')) {
      whatsappNumber = '972' + whatsappNumber.substring(1);
    }
    const leadChatId = whatsappNumber + '@c.us';

    const automationSettingsArr = await base44.asServiceRole.entities.AutomationSettings.list();
    const automationSettings = automationSettingsArr && automationSettingsArr.length > 0 ? automationSettingsArr[0] : null;
    const template = automationSettings?.whatsapp_auto_reply ||
      'הי {{name}}, קיבלנו את פנייתך 💜 אנחנו נדאג ליצור איתך קשר בהקדם. סטודיו פנטהריי';
    const displayName = student.full_name.split(' ')[0] || 'שלום';
    const replyMessage = template.replace(/\{\{name\}\}/g, displayName);

    const replySent = await sendWhatsAppToChat(leadChatId, replyMessage);

    // Create introduction task
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);

    // קביעת שם משימה לפי קורס (ליד מאושר ע"י אופיר)
    const approvedCourseName = student.interest_area || student.course_name || '';
    const isFasciaApproved = approvedCourseName.includes('פאשיה');
    const approvedTaskName = isFasciaApproved ? 'שיחת היכרות פאשיה בתנועה' : (approvedCourseName ? `שיחת היכרות - ${approvedCourseName}` : 'שיחת היכרות');

    await base44.asServiceRole.entities.Task.create({
      name: approvedTaskName,
      description: `ליד מאושר ע"י אופיר: ${student.full_name}\n${student.notes || ''}`,
      status: 'ממתין',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      student_id: student.id,
      student_name: student.full_name
    });

    // יצירת מנוי עם שיוך קבוצה (ליד מאושר ע"י אופיר)
    await createOrUpdateSubscriber(base44, {
      name: student.full_name,
      email: student.email,
      phone: student.phone,
      courseName: student.interest_area || student.course_name
    });

    // Confirm to Ofir
    await sendWhatsApp(`✅ נשלחה הודעה ל${student.full_name} (${student.phone}) ונוצרה משימת שיחת היכרות.`);

    console.log(`✅ Lead approved: ${student.full_name}`);
    return { status: 'lead_approved', student_id: student.id, student_name: student.full_name, reply_sent: replySent };

  } else {
    // Rejection — מחיקת הליד לחלוטין
    const rejectedName = student.full_name;
    const rejectedId = student.id;
    await base44.asServiceRole.entities.Student.delete(rejectedId);

    await sendWhatsApp(`❌ הליד "${rejectedName}" נמחק מהמערכת.`);

    console.log(`❌ Lead rejected and deleted: ${rejectedName}`);
    return { status: 'lead_rejected_deleted', student_id: rejectedId, student_name: rejectedName };
  }
}

// =============================================
// WHATSAPP HELPERS
// =============================================
async function sendWhatsApp(message) {
  return sendWhatsAppToChat(PANTAREI_CHAT_ID, message);
}

async function sendWhatsAppToChat(chatId, message) {
  // uChat inbound request: reply to the sender is returned in the webhook response, not sent via API
  if (uchatCapture.active && chatId === uchatCapture.chatId) {
    uchatCapture.reply = uchatCapture.reply ? uchatCapture.reply + '\n' + message : message;
    console.log('↩️ Reply captured for uChat flow response');
    return true;
  }

  const provider = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();
  if (provider === 'uchat') {
    return await sendViaUchat(chatId.replace('@c.us', ''), message);
  }

  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

  if (!GREEN_ID || !GREEN_TOKEN) {
    console.log('⚠️ Green API not configured');
    return false;
  }

  const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;

  try {
    const resp = await fetch(greenApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message })
    });
    const result = await resp.json();
    if (resp.ok && result.idMessage) {
      console.log(`✅ WhatsApp sent to ${chatId}: ${result.idMessage}`);
      return true;
    } else {
      console.log(`❌ WhatsApp send failed:`, result);
      return false;
    }
  } catch (e) {
    console.error('❌ WhatsApp error:', e.message);
    return false;
  }
}

// =============================================
// CREATE OR UPDATE SUBSCRIBER (with duplicate check & group assignment)
// =============================================
async function createOrUpdateSubscriber(base44, { name, email, phone, courseName }) {
  // Must have at least phone or email
  if (!email && !phone) {
    console.log('⏭️ No email or phone for subscriber creation');
    return;
  }

  try {
    let existingSub = null;

    // Check by email
    if (email) {
      const byEmail = await base44.asServiceRole.entities.Subscribers.filter({ email });
      if (byEmail && byEmail.length > 0) existingSub = byEmail[0];
    }

    // Check by phone (whatsapp format)
    if (!existingSub && phone) {
      let whatsappNum = normalizePhone(phone);
      if (whatsappNum.startsWith('0')) whatsappNum = '972' + whatsappNum.substring(1);
      const byPhone = await base44.asServiceRole.entities.Subscribers.filter({ whatsapp: whatsappNum });
      if (byPhone && byPhone.length > 0) existingSub = byPhone[0];
    }

    let whatsappNum = '';
    if (phone) {
      whatsappNum = normalizePhone(phone);
      if (whatsappNum.startsWith('0')) whatsappNum = '972' + whatsappNum.substring(1);
    }

    const subscriberGroup = courseName || '';

    if (existingSub) {
      const updatedGroups = existingSub.groups || [];
      if (subscriberGroup && !updatedGroups.includes(subscriberGroup)) {
        updatedGroups.push(subscriberGroup);
      }
      await base44.asServiceRole.entities.Subscribers.update(existingSub.id, {
        subscribed: true,
        name: name || existingSub.name,
        email: email || existingSub.email,
        whatsapp: whatsappNum || existingSub.whatsapp,
        source: existingSub.source || 'וואטסאפ',
        group: subscriberGroup || existingSub.group,
        groups: updatedGroups
      });
      console.log(`✅ Subscriber updated: ${existingSub.email || whatsappNum}, group: ${subscriberGroup}`);
    } else {
      const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      await base44.asServiceRole.entities.Subscribers.create({
        email: email || '',
        name: name || '',
        whatsapp: whatsappNum,
        subscribed: true,
        marketing_consent: false,
        source: 'וואטסאפ',
        unsubscribe_token: token,
        group: subscriberGroup,
        groups: subscriberGroup ? [subscriberGroup] : []
      });
      console.log(`✅ New subscriber created: ${email || whatsappNum}, group: ${subscriberGroup}`);
    }
  } catch (e) {
    console.error('⚠️ Subscriber create/update error:', e.message);
  }
}

// =============================================
// HANDLE UNSUBSCRIBE REQUEST
// =============================================
async function handleUnsubscribe(base44, phoneNumber) {
  let whatsappNum = normalizePhone(phoneNumber);
  if (whatsappNum.startsWith('0')) whatsappNum = '972' + whatsappNum.substring(1);

  const variants = [whatsappNum];
  if (whatsappNum.startsWith('972')) variants.push('0' + whatsappNum.substring(3));

  let subscriber = null;
  for (const variant of variants) {
    const results = await base44.asServiceRole.entities.Subscribers.filter({ whatsapp: variant });
    if (results && results.length > 0) { subscriber = results[0]; break; }
  }

  if (subscriber) {
    await base44.asServiceRole.entities.Subscribers.update(subscriber.id, { subscribed: false });
    console.log(`✅ Subscriber ${subscriber.name || subscriber.whatsapp} unsubscribed`);
  } else {
    console.log(`⚠️ No subscriber found for ${phoneNumber}, but confirming removal anyway`);
  }

  return { status: 'unsubscribed', phone: phoneNumber, found: !!subscriber };
}

// =============================================
// AUTO-REPLY HELPER (for strong leads)
// =============================================
async function sendAutoReply(automationSettings, chatId, senderName, replyType) {
  const autoReplyEnabled = automationSettings?.whatsapp_auto_reply_enabled !== false;

  if (!autoReplyEnabled) {
    console.log('⏭️ Auto-reply disabled in settings');
    return false;
  }

  const displayName = senderName || 'שלום';
  let replyMessage;

  if (replyType === 'existing_new_course') {
    replyMessage = `הי ${displayName}, שמחים לשמוע על ההתעניינות שלך 💜 ניצור איתך קשר בהקדם עם כל הפרטים. סטודיו פנטהריי`;
  } else {
    const template = automationSettings?.whatsapp_auto_reply ||
      'הי {{name}}, קיבלנו את פנייתך 💜 אנחנו נדאג ליצור איתך קשר בהקדם. סטודיו פנטהריי';
    replyMessage = template.replace(/\{\{name\}\}/g, displayName);
  }

  return sendWhatsAppToChat(chatId, replyMessage);
}