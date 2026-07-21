import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { normalizePhone972, queueFollowup1, missingCourseLinks, notifyMissingCourseLinks } from '../../shared/waFollowups.ts';

const OPEN_FOR_REGISTRATION = 'פתוח להרשמה';
const TARGET_REGISTRATION_STATUSES = ['בבדיקה', 'לחזור לקראת הרשמה'];

function getEntryDate(entry) {
  const value = entry?.registration_date || entry?.lead_entry_date || '';
  return value ? new Date(value).getTime() : 0;
}

function descriptionMentionsCourse(task, courseName) {
  return Boolean(task?.description && courseName && task.description.includes(courseName));
}

// שליחת טקסט חופשי (רק להודעת "ניסיון לשיחה" — בתוך חלון 24 שעות)
async function sendWhatsappToNumber(whatsappNumber, messageContent) {
  const provider = (Deno.env.get('WHATSAPP_PROVIDER') || 'green').toLowerCase();

  if (provider === 'uchat') {
    const token = Deno.env.get('UCHAT_API_TOKEN');
    if (!token) return { sent: false, reason: 'uchat: UCHAT_API_TOKEN not configured' };
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const infoResp = await fetch(`https://www.uchat.com.au/api/subscriber/get-info-by-user-id?user_id=${encodeURIComponent(whatsappNumber)}`, { headers });
    let info = {};
    try { info = await infoResp.json(); } catch (_e) { info = {}; }
    const userNs = info?.user_ns || info?.data?.user_ns;
    if (!userNs) {
      console.log(`uchat: subscriber not found for ${whatsappNumber}`);
      return { sent: false, reason: `uchat: subscriber not found for ${whatsappNumber}` };
    }
    const sendResp = await fetch('https://www.uchat.com.au/api/subscriber/send-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ns: userNs, text: messageContent })
    });
    if (sendResp.ok) return { sent: true, reason: null };
    const errText = await sendResp.text();
    return { sent: false, reason: `uchat send failed: ${errText}` };
  }

  const GREEN_ID = Deno.env.get('GREEN_ID');
  const GREEN_TOKEN = Deno.env.get('GREEN_TOKEN');

  if (!GREEN_ID || !GREEN_TOKEN) {
    return { sent: false, reason: 'missing_green_api_credentials' };
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
  return {
    sent: response.ok && Boolean(result.idMessage),
    reason: response.ok ? null : (result.message || JSON.stringify(result))
  };
}

function studentHasNanaCourse(student, courseById) {
  const entries = student?.courses || [];
  for (const entry of entries) {
    const course = courseById.get(entry.course_id);
    if (course && course.name && course.name.includes('נענע') && course.name !== 'נענע – בית ספר למחול ותנועה סומטית') {
      return true;
    }
    if (course && course.name && (course.name.includes('סמסטר קיץ') || course.name.includes('יום היכרות נענע'))) {
      return true;
    }
  }
  if (student?.course_name && (student.course_name.includes('סמסטר קיץ') || student.course_name.includes('יום היכרות נענע'))) {
    return true;
  }
  return false;
}

function isLbmsTask(task) {
  const name = String(task?.name || '').toLowerCase();
  const desc = String(task?.description || '').toLowerCase();
  return name.includes('lbms') || desc.includes('lbms');
}

// מציאת קורס פתוח להרשמה המקושר לסטודנטית — כל קורס (הוסרה מגבלת נענע/LBMS, החלטת עינת 21.7)
async function findOpenCourseForTask(base44, student, task) {
  const courses = await base44.asServiceRole.entities.Course.list('-created_date', 200);
  const studentEntries = [...(student?.courses || [])]
    .sort((a, b) => getEntryDate(b) - getEntryDate(a));

  const courseById = new Map((courses || []).map((course) => [course.id, course]));
  const candidates = [];

  for (const entry of studentEntries) {
    const course = courseById.get(entry.course_id);
    if (course) candidates.push(course);
  }

  if (student?.course_id) {
    const mainCourse = courseById.get(student.course_id);
    if (mainCourse && !candidates.some((course) => course.id === mainCourse.id)) {
      candidates.unshift(mainCourse);
    }
  }

  // אם המשימה היא LBMS אבל לסטודנטית יש קורס נענע — לא לשלוח (מניעת בלבול קטגוריות)
  if (isLbmsTask(task) && studentHasNanaCourse(student, courseById)) {
    console.log('⚠️ LBMS task but student has Nana course — skipping WhatsApp send');
    return null;
  }

  const openCourses = candidates.filter((course) => course?.status === OPEN_FOR_REGISTRATION);

  return openCourses.find((course) => descriptionMentionsCourse(task, course.name)) || openCourses[0] || null;
}

// 21.7.2026: הוסב משליחת טקסט חופשי לתבנית מאושרת followup_1 דרך WhatsappQueue
async function queueRegistrationTemplate(base44, { student, task }) {
  const course = await findOpenCourseForTask(base44, student, task);
  if (!course) return { queued: false, reason: 'no_open_course' };

  const missing = missingCourseLinks(course);
  if (missing.length > 0) {
    console.log(`⚠️ Course "${course.name}" missing followup_1 fields: ${missing.map((m) => m.key).join(', ')}`);
    await notifyMissingCourseLinks(base44, course, missing);
    return { queued: false, reason: 'missing_course_links', course_name: course.name };
  }

  const result = await queueFollowup1(base44, student, course);
  return { ...result, course_name: course.name };
}

// =============================================
// Automation: When task status changes,
// update the linked student's status accordingly,
// stamp status_changed_date, and queue WhatsApp follow-ups.
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
    const taskId = event.entity_id;

    // Skip if status didn't change
    if (newStatus === oldStatus) {
      console.log('No status change, skipping');
      return Response.json({ status: 'skipped', reason: 'no status change' });
    }

    console.log(`Task status changed: "${oldStatus}" → "${newStatus}" for student ${studentId || '(none)'}`);

    // 🕒 חותמת זמן לשינוי הסטטוס — ממנה נספרים ימי הפולואפ האוטומטי.
    // העדכון הזה מפעיל את האוטומציה שוב, אבל הריצה השנייה נעצרת מיד (הסטטוס לא השתנה).
    await base44.asServiceRole.entities.Task.update(taskId, {
      status_changed_date: new Date().toISOString()
    });

    if (!studentId) {
      console.log('No student linked, done after stamping status_changed_date');
      return Response.json({ status: 'success', stamped: true, reason: 'no student linked' });
    }

    let whatsappSentImmediately = false;

    if (newStatus === 'ניסיון לשיחה') {
      const student = await base44.asServiceRole.entities.Student.get(studentId);
      const whatsappNumber = normalizePhone972(student?.phone);
      const settings = await base44.asServiceRole.entities.AutomationSettings.list();
      const automationSettings = settings?.[0] || {};
      const messageTemplate = automationSettings.whatsapp_task_try_call_message || 'היי {{name}}, ניסיתי ליצור איתך קשר, מתי יהיה לך נוח לדבר?';
      const studentName = student?.full_name || data?.student_name || '';

      if (whatsappNumber) {
        const messageContent = messageTemplate.replace(/\{\{name\}\}/g, studentName || 'שלום');
        const sendResult = await sendWhatsappToNumber(whatsappNumber, messageContent);

        if (sendResult.sent) {
          whatsappSentImmediately = true;
          console.log('✅ WhatsApp follow-up message sent immediately');
        } else {
          console.log('WhatsApp immediate send failed:', sendResult.reason || '');
        }
      } else {
        console.log('No phone number found for WhatsApp follow-up');
      }
    }

    let registrationStatusWhatsapp = null;

    if (TARGET_REGISTRATION_STATUSES.includes(newStatus)) {
      const student = await base44.asServiceRole.entities.Student.get(studentId);
      registrationStatusWhatsapp = await queueRegistrationTemplate(base44, {
        student,
        task: data
      });
      console.log('Registration template queue result:', JSON.stringify(registrationStatusWhatsapp));
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

      const student = await base44.asServiceRole.entities.Student.get(studentId);
      const studentCourses = student?.courses || [];
      const taskName = data?.name || '';
      const taskDescription = data?.description || '';

      // זיהוי הקורס הספציפי מתוך שם/תיאור המשימה
      let targetCourseId = null;

      if (taskName.startsWith('שיחת היכרות - ')) {
        const courseNameFromTask = taskName.replace('שיחת היכרות - ', '');
        const match = studentCourses.find((c) => c.course_name === courseNameFromTask);
        if (match) targetCourseId = match.course_id;
      } else if (taskName === 'שיחת היכרות פאשיה בתנועה') {
        const match = studentCourses.find((c) => c.course_name && c.course_name.includes('פאשיה'));
        if (match) targetCourseId = match.course_id;
      }

      if (!targetCourseId) {
        for (const c of studentCourses) {
          if (c.course_name && taskDescription.includes(c.course_name)) {
            targetCourseId = c.course_id;
            break;
          }
        }
      }

      const updateData = {};

      if (targetCourseId && studentCourses.length > 0) {
        const updatedCourses = studentCourses.map((c) => {
          if (c.course_id === targetCourseId) {
            return { ...c, status: newStudentStatus };
          }
          return c;
        });
        updateData.courses = updatedCourses;

        // חישוב סטטוס ראשי (מודל דו-ממדי):
        // הליד הפתוח החם ביותר גובר; אם אין לידים פתוחים — "רשום" (אם לקוחה)
        const OPEN_LEAD_STATUSES = ['ליד חדש', 'חדש', 'לחזור לקראת הרשמה', 'במעקב ראשוני', 'היה ביום היכרות', 'הודעה מוואטסאפ לבדיקה', 'בבדיקה'];
        const REGISTERED_SET = ['רשום', 'נרשם'];

        let bestStatus = null;
        for (const status of OPEN_LEAD_STATUSES) {
          if (updatedCourses.some((c) => c.status === status)) { bestStatus = status; break; }
        }
        const hasRegistered = updatedCourses.some((c) => REGISTERED_SET.includes(c.status) || c.status === 'הסתיים');
        if (!bestStatus) {
          bestStatus = hasRegistered ? 'רשום' : newStudentStatus;
        }

        updateData.status = bestStatus;
        if (hasRegistered) updateData.is_customer = true;
        console.log(`📊 Per-course update: course ${targetCourseId} → "${newStudentStatus}", general status → "${bestStatus}"`);
      } else {
        updateData.status = newStudentStatus;
      }

      await base44.asServiceRole.entities.Student.update(studentId, updateData);
      console.log('✅ Student status updated successfully');
    } else {
      console.log('No student status mapping for this task status');
    }

    return Response.json({
      status: 'success',
      task_status: newStatus,
      student_status: newStudentStatus,
      whatsapp_sent_immediately: whatsappSentImmediately,
      registration_status_whatsapp: registrationStatusWhatsapp
    });

  } catch (error) {
    console.error('❌ Error in onTaskStatusChange:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});