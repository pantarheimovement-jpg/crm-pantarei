import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// =============================================
// CONFIGURATION
// =============================================
const OFIR_PHONE = '972515041100';
const OFIR_CHAT_ID = '972515041100@c.us';
const NOTIFICATION_EMAIL = 'pantarhei.movement@gmail.com';

// Ofir's approval keywords
const APPROVE_KEYWORDS = ['כן', 'שלח', 'מאושר', 'כ', 'אשר', 'אישור', 'yes', 'שלחי'];
const REJECT_KEYWORDS = ['לא', 'לא רלוונטי', 'ל', 'דלג', 'no', 'ביטול'];

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

function isOfirPhone(phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  const ofirVariants = getPhoneVariants(OFIR_PHONE);
  return ofirVariants.includes(normalized);
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

    console.log(`📞 From: ${phoneNumber}, Name: ${senderName}, Message: "${messageText}"`);

    // =============================================
    // CHECK IF THIS IS OFIR'S APPROVAL/REJECTION
    // =============================================
    if (isOfirPhone(phoneNumber)) {
      console.log('👩‍💼 Message from Ofir - checking for approval/rejection');
      const result = await handleOfirResponse(base44, messageText);
      return Response.json(result);
    }

    // --- STEP 1: Load course names for intent analysis ---
    const courses = await base44.asServiceRole.entities.Course.list();
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
    for (const variant of phoneVariants) {
      const results = await base44.asServiceRole.entities.Student.filter({ phone: variant });
      if (results && results.length > 0) {
        existingStudent = results[0];
        console.log(`✅ Found existing student with variant "${variant}": ${existingStudent.full_name}`);
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
    // STRONG LEAD PATH
    // =============================================
    if (intent.intentType === 'strong_lead') {

      if (existingStudent) {
        console.log(`🔄 Existing student "${existingStudent.full_name}" showing strong interest`);

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
          console.log(`✨ New course interest for existing student!`);

          let matchedCourse = null;
          if (identifiedCourse) {
            matchedCourse = courses.find(c => c.name === identifiedCourse);
          }

          const updatedCourses = [...existingCourses];
          if (matchedCourse) {
            updatedCourses.push({
              course_id: matchedCourse.id,
              course_name: matchedCourse.name,
              status: 'ליד חדש',
              registration_date: new Date().toISOString().split('T')[0]
            });
          }

          const updateData = {
            last_contact_date: new Date().toISOString(),
            notes: (existingStudent.notes || '') + `\n📱 ${new Date().toLocaleDateString('he-IL')}: התעניינות חדשה בוואטסאפ${identifiedCourse ? ' - ' + identifiedCourse : ''}: "${messageText}"`
          };

          if (updatedCourses.length > existingCourses.length) {
            updateData.courses = updatedCourses;
          }

          await base44.asServiceRole.entities.Student.update(existingStudent.id, updateData);
          console.log(`✅ Student updated with new interest`);

          // יצירת שיחת היכרות גם לאיש קשר קיים עם קורס חדש
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + 2);

          // בדיקה שאין כבר שיחת היכרות פתוחה לאותו סטודנט
          const existingIntroTasks = await base44.asServiceRole.entities.Task.filter({
            student_id: existingStudent.id,
            name: 'שיחת היכרות'
          });
          const hasOpenIntroTask = existingIntroTasks.some(t => t.status !== 'הושלם' && t.status !== 'אבוד');

          if (!hasOpenIntroTask) {
            await base44.asServiceRole.entities.Task.create({
              name: 'שיחת היכרות',
              description: `התעניינות חדשה מוואטסאפ: ${existingStudent.full_name}\nקורס: ${identifiedCourse || 'לא צוין'}\nהודעה: ${messageText}`,
              status: 'ממתין',
              scheduled_date: scheduledDate.toISOString().split('T')[0],
              student_id: existingStudent.id,
              student_name: existingStudent.full_name
            });
            console.log('✅ Introduction task created for existing student with new course');
          }

          const autoReplySent = await sendAutoReply(base44, chatId, senderName, 'existing_new_course');

          return Response.json({
            status: 'existing_student_new_interest',
            student_id: existingStudent.id,
            student_name: existingStudent.full_name,
            identified_course: identifiedCourse,
            auto_reply: autoReplySent,
            intro_task_created: !hasOpenIntroTask,
            intent: intent.debugInfo
          });

        } else {
          console.log(`⏭️ Existing student already linked to this course - updating last contact only`);
          await base44.asServiceRole.entities.Student.update(existingStudent.id, {
            last_contact_date: new Date().toISOString()
          });

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

        const student = await base44.asServiceRole.entities.Student.create({
          full_name: senderName || storedPhone,
          phone: storedPhone,
          status: 'ליד חדש',
          lead_source: 'וואטסאפ',
          interest_area: intent.identifiedCourseName || '',
          lead_entry_date: new Date().toISOString().split('T')[0],
          last_contact_date: new Date().toISOString(),
          notes: `הודעה ראשונה (ליד חזק): ${messageText}`
        });

        console.log(`✅ New lead created: ${student.id} - ${student.full_name}`);

        if (intent.identifiedCourseName) {
          const matchedCourse = courses.find(c => c.name === intent.identifiedCourseName);
          if (matchedCourse) {
            await base44.asServiceRole.entities.Student.update(student.id, {
              course_id: matchedCourse.id,
              course_name: matchedCourse.name,
              courses: [{
                course_id: matchedCourse.id,
                course_name: matchedCourse.name,
                status: 'ליד חדש',
                registration_date: new Date().toISOString().split('T')[0]
              }]
            });
          }
        }

        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 2);

        await base44.asServiceRole.entities.Task.create({
          name: 'שיחת היכרות',
          description: `ליד חדש מוואטסאפ: ${senderName || storedPhone}\nהודעה: ${messageText}${intent.identifiedCourseName ? '\nקורס: ' + intent.identifiedCourseName : ''}`,
          status: 'ממתין',
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          student_id: student.id,
          student_name: student.full_name
        });

        console.log('✅ Introduction task created');

        const autoReplySent = await sendAutoReply(base44, chatId, senderName, 'new_lead');

        return Response.json({
          status: 'new_lead_created',
          student_id: student.id,
          student_name: student.full_name,
          identified_course: intent.identifiedCourseName,
          auto_reply: autoReplySent,
          intent: intent.debugInfo
        });
      }
    }

    // =============================================
    // FOR REVIEW PATH — now sends notification to Ofir
    // =============================================
    if (intent.intentType === 'for_review') {

      if (existingStudent) {
        console.log(`📝 Existing student "${existingStudent.full_name}" - message for review`);

        await base44.asServiceRole.entities.Student.update(existingStudent.id, {
          last_contact_date: new Date().toISOString(),
          status: 'הודעה מוואטסאפ לבדיקה',
          lead_source: existingStudent.lead_source || 'וואטסאפ',
          notes: (existingStudent.notes || '') + `\n📱 ${new Date().toLocaleDateString('he-IL')}: הודעה לבדיקה: "${messageText}"`
        });

        // Notify Ofir
        await notifyOfir(base44, existingStudent.full_name, storedPhone, messageText, intent.identifiedCourseName);

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
          lead_entry_date: new Date().toISOString().split('T')[0],
          last_contact_date: new Date().toISOString(),
          notes: `הודעה לבדיקה: ${messageText}`
        });

        console.log(`✅ Student created for review: ${student.id} - ${student.full_name}`);

        // Notify Ofir
        await notifyOfir(base44, student.full_name, storedPhone, messageText, intent.identifiedCourseName);

        return Response.json({
          status: 'pending_review',
          student_id: student.id,
          student_name: student.full_name,
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
});

// =============================================
// NOTIFY OFIR — WhatsApp + Email
// =============================================
async function notifyOfir(base44, leadName, leadPhone, messageText, courseName) {
  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

  // WhatsApp notification to Ofir
  if (GREEN_ID && GREEN_TOKEN) {
    const whatsappMsg = `💜 ליד חדש מוואטסאפ לבדיקה:\n\n👤 *${leadName}*\n📞 ${leadPhone}${courseName ? '\n📚 ' + courseName : ''}\n💬 "${messageText}"\n\nלשלוח תגובה אוטומטית?\nהשיבי *כן ${leadName}* או *לא ${leadName}*`;

    const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;

    try {
      const resp = await fetch(greenApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: OFIR_CHAT_ID, message: whatsappMsg })
      });
      const result = await resp.json();
      if (resp.ok && result.idMessage) {
        console.log(`✅ Ofir notified via WhatsApp: ${result.idMessage}`);
      } else {
        console.log(`❌ Failed to notify Ofir via WhatsApp:`, result);
      }
    } catch (e) {
      console.error('❌ Error sending WhatsApp to Ofir:', e.message);
    }
  }

  // Email notification
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
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
    console.log('✅ Ofir notified via email');
  } catch (e) {
    console.error('❌ Error sending email to Ofir:', e.message);
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

    await base44.asServiceRole.entities.Task.create({
      name: 'שיחת היכרות',
      description: `ליד מאושר ע"י אופיר: ${student.full_name}\n${student.notes || ''}`,
      status: 'ממתין',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      student_id: student.id,
      student_name: student.full_name
    });

    // Confirm to Ofir
    await sendWhatsApp(`✅ נשלחה הודעה ל${student.full_name} (${student.phone}) ונוצרה משימת שיחת היכרות.`);

    console.log(`✅ Lead approved: ${student.full_name}`);
    return { status: 'lead_approved', student_id: student.id, student_name: student.full_name, reply_sent: replySent };

  } else {
    // Rejection
    await base44.asServiceRole.entities.Student.update(student.id, {
      status: 'לא רלוונטי'
    });

    await sendWhatsApp(`❌ הליד "${student.full_name}" סומן כלא רלוונטי.`);

    console.log(`❌ Lead rejected: ${student.full_name}`);
    return { status: 'lead_rejected', student_id: student.id, student_name: student.full_name };
  }
}

// =============================================
// WHATSAPP HELPERS
// =============================================
async function sendWhatsApp(message) {
  return sendWhatsAppToChat(OFIR_CHAT_ID, message);
}

async function sendWhatsAppToChat(chatId, message) {
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
// AUTO-REPLY HELPER (for strong leads)
// =============================================
async function sendAutoReply(base44, chatId, senderName, replyType) {
  const automationSettingsArr = await base44.asServiceRole.entities.AutomationSettings.list();
  const automationSettings = automationSettingsArr && automationSettingsArr.length > 0 ? automationSettingsArr[0] : null;

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