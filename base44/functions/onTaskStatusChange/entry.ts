import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeWhatsappNumber(phone) {
  const digits = String(phone || '').replace(/[\s\-\.\(\)\+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.substring(1);
  if (digits.length === 9 && digits.startsWith('5')) return '972' + digits;
  return digits;
}

const OPEN_FOR_REGISTRATION = 'פתוח להרשמה';
const TARGET_REGISTRATION_STATUSES = ['בבדיקה', 'לחזור לקראת הרשמה'];

function isTargetCourse(courseName) {
  const name = String(courseName || '');
  if (name.includes('נענע')) {
    return name === 'נענע – בית ספר למחול ותנועה סומטית';
  }
  return name.toLowerCase().includes('lbms');
}

function getTemplateKey(courseName) {
  const name = String(courseName || '').toLowerCase();
  return name.includes('lbms') ? 'whatsapp_lbms_status_messages' : 'whatsapp_nana_status_messages';
}

function isUsableTemplate(template) {
  if (!template || !String(template).trim()) return false;
  return !String(template).includes('כתבי כאן את נוסחי ההודעות');
}

function applyTemplate(template, student, course, status) {
  return String(template)
    .replace(/\{\{name\}\}/g, student?.full_name || 'שלום')
    .replace(/\{\{course\}\}/g, course?.name || '')
    .replace(/\{\{status\}\}/g, status || '');
}

function getEntryDate(entry) {
  const value = entry?.registration_date || entry?.lead_entry_date || '';
  return value ? new Date(value).getTime() : 0;
}

function descriptionMentionsCourse(task, courseName) {
  return Boolean(task?.description && courseName && task.description.includes(courseName));
}

async function sendWhatsappToNumber(whatsappNumber, messageContent) {
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
    reason: response.ok ? null : (result.message || JSON.stringify(result)),
    result
  };
}

function studentHasNanaCourse(student, courseById) {
  const entries = student?.courses || [];
  for (const entry of entries) {
    const course = courseById.get(entry.course_id);
    if (course && course.name && course.name.includes('נענע') && course.name !== 'נענע – בית ספר למחול ותנועה סומטית') {
      return true;
    }
    // גם קורס קיץ נענע
    if (course && course.name && (course.name.includes('סמסטר קיץ') || course.name.includes('יום היכרות נענע'))) {
      return true;
    }
  }
  // בדיקה גם ב-course_id הראשי
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

async function findOpenTargetCourseForTask(base44, student, task) {
  const courses = await base44.asServiceRole.entities.Course.list();
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

  // אם המשימה היא LBMS אבל לסטודנטית יש קורס נענע — לא לשלוח
  if (isLbmsTask(task) && studentHasNanaCourse(student, courseById)) {
    console.log('⚠️ LBMS task but student has Nana course — skipping WhatsApp send');
    return null;
  }

  const openTargetCourses = candidates.filter((course) =>
    course?.status === OPEN_FOR_REGISTRATION && isTargetCourse(course.name)
  );

  return openTargetCourses.find((course) => descriptionMentionsCourse(task, course.name)) || openTargetCourses[0] || null;
}

async function sendRegistrationStatusWhatsapp(base44, { student, task, newStatus }) {
  const course = await findOpenTargetCourseForTask(base44, student, task);
  if (!course) return { sent: false, reason: 'no_open_target_course' };

  const whatsappNumber = normalizeWhatsappNumber(student?.phone);
  if (!whatsappNumber) return { sent: false, reason: 'missing_student_phone', course_name: course.name };

  const settings = await base44.asServiceRole.entities.AutomationSettings.list();
  const automationSettings = settings?.[0] || {};
  const template = automationSettings[getTemplateKey(course.name)] || '';

  if (!isUsableTemplate(template)) {
    return { sent: false, reason: 'missing_message_template', course_name: course.name };
  }

  const messageContent = applyTemplate(template, student, course, newStatus);
  const result = await sendWhatsappToNumber(whatsappNumber, messageContent);
  return { ...result, course_name: course.name };
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

    let registrationStatusWhatsapp = null;

    if (TARGET_REGISTRATION_STATUSES.includes(newStatus)) {
      const student = await base44.asServiceRole.entities.Student.get(studentId);
      registrationStatusWhatsapp = await sendRegistrationStatusWhatsapp(base44, {
        student,
        task: data,
        newStatus
      });
      whatsappSentImmediately = whatsappSentImmediately || registrationStatusWhatsapp.sent;
      console.log('Registration status WhatsApp result:', JSON.stringify(registrationStatusWhatsapp));
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
      
      // חיפוש לפי שם המשימה: "שיחת היכרות - קורס X" או "שיחת היכרות פאשיה בתנועה"
      if (taskName.startsWith('שיחת היכרות - ')) {
        const courseNameFromTask = taskName.replace('שיחת היכרות - ', '');
        const match = studentCourses.find(c => c.course_name === courseNameFromTask);
        if (match) targetCourseId = match.course_id;
      } else if (taskName === 'שיחת היכרות פאשיה בתנועה') {
        const match = studentCourses.find(c => c.course_name && c.course_name.includes('פאשיה'));
        if (match) targetCourseId = match.course_id;
      }
      
      // fallback: חיפוש לפי תיאור המשימה
      if (!targetCourseId) {
        for (const c of studentCourses) {
          if (c.course_name && taskDescription.includes(c.course_name)) {
            targetCourseId = c.course_id;
            break;
          }
        }
      }
      
      const updateData = {};
      
      // עדכון סטטוס קורס ספציפי במערך courses
      if (targetCourseId && studentCourses.length > 0) {
        const updatedCourses = studentCourses.map(c => {
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
          if (updatedCourses.some(c => c.status === status)) { bestStatus = status; break; }
        }
        const hasRegistered = updatedCourses.some(c => REGISTERED_SET.includes(c.status) || c.status === 'הסתיים');
        if (!bestStatus) {
          bestStatus = hasRegistered ? 'רשום' : newStudentStatus;
        }

        updateData.status = bestStatus;
        if (hasRegistered) updateData.is_customer = true;
        console.log(`📊 Per-course update: course ${targetCourseId} → "${newStudentStatus}", general status → "${bestStatus}"`);
      } else {
        // אין מערך courses או לא מצאנו קורס — עדכון סטטוס כללי בלבד (כמו קודם)
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