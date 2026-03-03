import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// =============================================
// INTEREST PHRASES - ביטויים מובהקים של התעניינות
// =============================================
const INTEREST_PHRASES = [
  'אשמח לפרטים', 'אשמח לשמוע', 'אשמח לדעת',
  'מתעניינת', 'מתעניין', 'מעוניינת', 'מעוניין',
  'רוצה להירשם', 'רוצה לדעת', 'רוצה פרטים',
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
// COURSE-RELATED KEYWORDS - מילות מפתח הקשורות לקורסים
// =============================================
const COURSE_KEYWORDS = [
  'קורס', 'קורסי', 'קורסים',
  'סדנה', 'סדנת', 'סדנאות',
  'חוג', 'חוגים',
  'לימודים', 'לימוד',
  'הכשרה', 'הכשרת',
  'השתלמות',
  'מודול',
  // Brand-specific terms
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

  // Step 1: Check for INTEREST phrases
  for (const phrase of INTEREST_PHRASES) {
    if (lowerMessage.includes(phrase.toLowerCase())) {
      debugInfo.hasInterestPhrase = true;
      debugInfo.matchedInterestPhrase = phrase;
      break;
    }
  }

  // Step 2: Check for COURSE keywords (generic)
  for (const keyword of COURSE_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      debugInfo.hasCourseKeyword = true;
      debugInfo.matchedCourseKeyword = keyword;
      break;
    }
  }

  // Step 3: Check for SPECIFIC course names from database
  for (const name of courseNames) {
    if (!name) continue;
    const lowerName = name.toLowerCase();
    // Check if the full course name appears in message
    if (lowerMessage.includes(lowerName)) {
      debugInfo.hasSpecificCourseName = true;
      debugInfo.matchedCourseName = name;
      break;
    }
    // Check meaningful words from course name (4+ chars for specificity)
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

  // =============================================
  // CLASSIFICATION LOGIC
  // =============================================

  const hasCourseContext = debugInfo.hasCourseKeyword || debugInfo.hasSpecificCourseName;

  // STRONG LEAD: Must have BOTH interest phrase AND course context
  if (debugInfo.hasInterestPhrase && hasCourseContext) {
    debugInfo.intentType = 'strong_lead';
    return {
      intentType: 'strong_lead',
      identifiedCourseName: debugInfo.matchedCourseName || null,
      debugInfo
    };
  }

  // FOR REVIEW: Has course context but WITHOUT clear interest phrase
  // OR has interest phrase but WITHOUT course context (someone asking for details about "something")
  if (hasCourseContext || debugInfo.hasInterestPhrase) {
    debugInfo.intentType = 'for_review';
    return {
      intentType: 'for_review',
      identifiedCourseName: debugInfo.matchedCourseName || null,
      debugInfo
    };
  }

  // IGNORE: Nothing relevant detected
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

    // Also try last-9-digits search
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

    // Format phone for storage
    let storedPhone = normalizePhone(phoneNumber);
    if (storedPhone.startsWith('972')) {
      storedPhone = '0' + storedPhone.substring(3);
    }

    // =============================================
    // STRONG LEAD PATH
    // =============================================
    if (intent.intentType === 'strong_lead') {

      if (existingStudent) {
        // --- Existing student with strong interest in a course ---
        console.log(`🔄 Existing student "${existingStudent.full_name}" showing strong interest`);

        // Check if it's a NEW course interest for this student
        const existingCourses = existingStudent.courses || [];
        const identifiedCourse = intent.identifiedCourseName;
        let isNewCourseInterest = true;

        if (identifiedCourse) {
          // Check if student is already linked to this course
          for (const c of existingCourses) {
            if (c.course_name && c.course_name.toLowerCase().includes(identifiedCourse.toLowerCase())) {
              isNewCourseInterest = false;
              break;
            }
          }
        }

        if (isNewCourseInterest) {
          console.log(`✨ New course interest for existing student!`);

          // Find the course in the database
          let matchedCourse = null;
          if (identifiedCourse) {
            matchedCourse = courses.find(c => c.name === identifiedCourse);
          }

          // Update student record
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

          // Send auto-reply for existing student with new course interest
          const autoReplySent = await sendAutoReply(base44, chatId, senderName, 'existing_new_course');

          return Response.json({
            status: 'existing_student_new_interest',
            student_id: existingStudent.id,
            student_name: existingStudent.full_name,
            identified_course: identifiedCourse,
            auto_reply: autoReplySent,
            intent: intent.debugInfo
          });

        } else {
          // Already linked to this course - just update last contact
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
        // --- New student with strong lead signals ---
        console.log('✨ New WhatsApp STRONG LEAD detected!');

        const student = await base44.asServiceRole.entities.Student.create({
          full_name: senderName || storedPhone,
          phone: storedPhone,
          status: 'ליד חדש',
          lead_source: 'וואטסאפ',
          interest_area: intent.identifiedCourseName || '',
          last_contact_date: new Date().toISOString(),
          notes: `הודעה ראשונה (ליד חזק): ${messageText}`
        });

        console.log(`✅ New lead created: ${student.id} - ${student.full_name}`);

        // If a specific course was identified, link it
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

        // Create introduction task
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

        // Send auto-reply
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
    // FOR REVIEW PATH
    // =============================================
    if (intent.intentType === 'for_review') {

      if (existingStudent) {
        // Existing student - just add a note, no new record, no auto-reply
        console.log(`📝 Existing student "${existingStudent.full_name}" - message for review (updating notes)`);

        await base44.asServiceRole.entities.Student.update(existingStudent.id, {
          last_contact_date: new Date().toISOString(),
          notes: (existingStudent.notes || '') + `\n📱 ${new Date().toLocaleDateString('he-IL')}: הודעה לבדיקה: "${messageText}"`
        });

        return Response.json({
          status: 'existing_student_for_review',
          student_id: existingStudent.id,
          student_name: existingStudent.full_name,
          auto_reply: false,
          intent: intent.debugInfo
        });

      } else {
        // New contact - create with "for review" status, no auto-reply
        console.log('📋 New contact - creating for manual review');

        const student = await base44.asServiceRole.entities.Student.create({
          full_name: senderName || storedPhone,
          phone: storedPhone,
          status: 'הודעה מוואטסאפ לבדיקה',
          lead_source: 'וואטסאפ',
          last_contact_date: new Date().toISOString(),
          notes: `הודעה לבדיקה: ${messageText}`
        });

        console.log(`✅ Student created for review: ${student.id} - ${student.full_name}`);

        return Response.json({
          status: 'pending_review',
          student_id: student.id,
          student_name: student.full_name,
          auto_reply: false,
          intent: intent.debugInfo
        });
      }
    }

    // Fallback (should not reach here)
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
// AUTO-REPLY HELPER
// =============================================
async function sendAutoReply(base44, chatId, senderName, replyType) {
  const automationSettingsArr = await base44.asServiceRole.entities.AutomationSettings.list();
  const automationSettings = automationSettingsArr && automationSettingsArr.length > 0 ? automationSettingsArr[0] : null;

  const autoReplyEnabled = automationSettings?.whatsapp_auto_reply_enabled !== false;

  if (!autoReplyEnabled) {
    console.log('⏭️ Auto-reply disabled in settings');
    return false;
  }

  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

  if (!GREEN_ID || !GREEN_TOKEN) {
    console.log('⚠️ Green API not configured - skipping auto-reply');
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

  const greenApiUrl = `https://api.green-api.com/waInstance${GREEN_ID}/sendMessage/${GREEN_TOKEN}`;

  const whatsappResponse = await fetch(greenApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message: replyMessage })
  });

  const whatsappResult = await whatsappResponse.json();

  if (whatsappResponse.ok && whatsappResult.idMessage) {
    console.log(`✅ Auto-reply sent (${replyType}): ${whatsappResult.idMessage}`);
    return true;
  } else {
    console.log(`❌ Auto-reply failed:`, whatsappResult);
    return false;
  }
}