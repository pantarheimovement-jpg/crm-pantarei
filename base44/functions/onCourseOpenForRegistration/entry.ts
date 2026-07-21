import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { queueFollowup1, missingCourseLinks, notifyMissingCourseLinks } from '../../shared/waFollowups.ts';

// =============================================
// Automation: When a course status changes to "פתוח להרשמה",
// find all students with tasks in "לחזור לקראת הרשמה" status
// linked to that course, create new tasks, queue the approved
// WhatsApp template (followup_1) via WhatsappQueue, and notify admin.
//
// 21.7.2026: הוסב משליחת טקסט חופשי (Green API) לתבנית מאושרת דרך התור.
// חל על כל הקורסים — הוסרה מגבלת נענע/LBMS (החלטת עינת).
// =============================================

Deno.serve(async (req) => {
  console.log('=== onCourseOpenForRegistration triggered ===');

  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { event, data, old_data } = body;

    console.log('Event:', JSON.stringify(event));

    if (event.type !== 'update') {
      console.log('Not an update event, skipping');
      return Response.json({ status: 'skipped', reason: 'not update' });
    }

    const newStatus = data?.status;
    const oldStatus = old_data?.status;
    const courseId = event.entity_id;
    const courseName = data?.name;
    const course = data;

    // Only trigger when status changes TO "פתוח להרשמה"
    if (newStatus !== 'פתוח להרשמה' || newStatus === oldStatus) {
      console.log(`Status: "${oldStatus}" → "${newStatus}" - not relevant, skipping`);
      return Response.json({ status: 'skipped', reason: 'not opening for registration' });
    }

    console.log(`🎓 Course "${courseName}" (${courseId}) opened for registration!`);

    // Find all tasks with status "לחזור לקראת הרשמה"
    const pendingTasks = await base44.asServiceRole.entities.Task.filter({
      status: 'לחזור לקראת הרשמה'
    }, 'created_date', 500);

    console.log(`Found ${pendingTasks.length} tasks with "לחזור לקראת הרשמה" status`);

    if (pendingTasks.length === 0) {
      return Response.json({ status: 'success', message: 'No pending tasks found', course: courseName });
    }

    // Load ALL students with pagination
    let allStudents = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Student.list('created_date', 500, skip);
      if (!batch || batch.length === 0) break;
      allStudents = allStudents.concat(batch);
      skip += batch.length;
      if (batch.length < 500) break;
    }
    const studentMap = {};
    allStudents.forEach((s) => { studentMap[s.id] = s; });

    console.log(`Loaded ${allStudents.length} students into map`);

    // Filter tasks where the linked student is interested in THIS course
    const relevantStudentIds = [];
    const relevantStudents = [];

    for (const task of pendingTasks) {
      if (!task.student_id) continue;

      const student = studentMap[task.student_id];
      if (!student) continue;

      const studentCourses = student.courses || [];
      const hasCourse = studentCourses.some((c) => c.course_id === courseId);
      const hasMainCourse = student.course_id === courseId;
      const hasInterest = student.interest_area && courseName &&
        student.interest_area.toLowerCase().includes(courseName.toLowerCase());

      if (hasCourse || hasMainCourse || hasInterest) {
        if (!relevantStudentIds.includes(student.id)) {
          relevantStudentIds.push(student.id);
          relevantStudents.push({ student, task });
        }
      }
    }

    console.log(`Found ${relevantStudents.length} relevant students for course "${courseName}"`);

    if (relevantStudents.length === 0) {
      return Response.json({ status: 'success', message: 'No relevant students found', course: courseName });
    }

    // בדיקת שלמות פרטי הקורס לתבנית followup_1 — פעם אחת, לפני הלולאה
    const missing = missingCourseLinks(course);
    if (missing.length > 0) {
      console.log(`⚠️ Course is missing followup_1 fields: ${missing.map((m) => m.key).join(', ')} — templates will NOT be queued`);
      await notifyMissingCourseLinks(base44, course, missing);
    }

    const createdTasks = [];
    const whatsappResults = [];
    const nowIso = new Date().toISOString();

    for (const { student } of relevantStudents) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);

      const newTask = await base44.asServiceRole.entities.Task.create({
        name: 'שיחת בדיקה להרשמה',
        description: `הקורס "${courseName}" נפתח להרשמה! ${student.full_name} הביע/ה עניין בעבר.`,
        status: 'לחזור לקראת הרשמה',
        status_changed_date: nowIso,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        student_id: student.id,
        student_name: student.full_name
      });

      createdTasks.push(newTask.id);
      console.log(`✅ Created task for ${student.full_name}`);

      if (missing.length === 0) {
        const result = await queueFollowup1(base44, student, course);
        whatsappResults.push({ student_id: student.id, student_name: student.full_name, ...result });
        console.log(`WhatsApp queue result for ${student.full_name}:`, JSON.stringify(result));
      } else {
        whatsappResults.push({ student_id: student.id, student_name: student.full_name, queued: false, reason: 'missing_course_links' });
      }
    }

    // Send email notification to admin
    const studentList = relevantStudents.map(({ student }) =>
      `• ${student.full_name} (${student.phone || 'ללא טלפון'})`
    ).join('<br>');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'pantarhei.movement@gmail.com',
      subject: `🎓 הקורס "${courseName}" נפתח להרשמה - ${relevantStudents.length} לידים ממתינים`,
      body: `<div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #6D436D;">הקורס "${courseName}" נפתח להרשמה!</h2>
        <p>נמצאו <strong>${relevantStudents.length}</strong> לידים שהביעו עניין וממתינים לפתיחת ההרשמה:</p>
        <div style="background: #f9f5ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
          ${studentList}
        </div>
        <p>נוצרו שיחות בדיקה להרשמה עבור כל אחד מהם.</p>
        <p>${missing.length === 0 ? 'הודעות וואטסאפ (תבנית מאושרת) נכנסו לתור השליחה.' : '⚠️ הודעות וואטסאפ לא נשלחו — חסרים פרטים בקורס (נשלח מייל נפרד).'}</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">סטודיו פנטהריי CRM</p>
      </div>`
    });

    console.log('✅ Admin notified via email');

    return Response.json({
      status: 'success',
      course: courseName,
      students_notified: relevantStudents.length,
      tasks_created: createdTasks.length,
      whatsapp_queued: whatsappResults.filter((item) => item.queued).length,
      whatsapp_results: whatsappResults
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});