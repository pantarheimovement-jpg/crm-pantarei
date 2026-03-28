import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// =============================================
// Automation: When a course status changes to "פתוח להרשמה",
// find all students with tasks in "לחזור לקראת הרשמה" status
// linked to that course, create new tasks and notify admin
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

    // Only trigger when status changes TO "פתוח להרשמה"
    if (newStatus !== 'פתוח להרשמה' || newStatus === oldStatus) {
      console.log(`Status: "${oldStatus}" → "${newStatus}" - not relevant, skipping`);
      return Response.json({ status: 'skipped', reason: 'not opening for registration' });
    }

    console.log(`🎓 Course "${courseName}" (${courseId}) opened for registration!`);

    // Find all tasks with status "לחזור לקראת הרשמה"
    const pendingTasks = await base44.asServiceRole.entities.Task.filter({
      status: 'לחזור לקראת הרשמה'
    });

    console.log(`Found ${pendingTasks.length} tasks with "לחזור לקראת הרשמה" status`);

    if (pendingTasks.length === 0) {
      return Response.json({ status: 'success', message: 'No pending tasks found', course: courseName });
    }

    // Load ALL students once (instead of per-task filter which doesn't work with id)
    const allStudents = await base44.asServiceRole.entities.Student.list();
    const studentMap = {};
    (allStudents || []).forEach(s => { studentMap[s.id] = s; });

    console.log(`Loaded ${allStudents.length} students into map`);

    // Filter tasks where the linked student is interested in THIS course
    const relevantStudentIds = [];
    const relevantStudents = [];

    for (const task of pendingTasks) {
      if (!task.student_id) continue;

      const student = studentMap[task.student_id];
      if (!student) {
        console.log(`Student ${task.student_id} not found in map`);
        continue;
      }

      // Check if student has this course in their courses array
      const studentCourses = student.courses || [];
      const hasCourse = studentCourses.some(c => c.course_id === courseId);

      // Also check the main course_id field
      const hasMainCourse = student.course_id === courseId;

      // Also check interest_area for course name match
      const hasInterest = student.interest_area && courseName && 
        student.interest_area.toLowerCase().includes(courseName.toLowerCase());

      console.log(`Checking student ${student.full_name}: hasCourse=${hasCourse}, hasMainCourse=${hasMainCourse}, hasInterest=${hasInterest}`);

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

    // Create new tasks for each relevant student
    const createdTasks = [];
    for (const { student } of relevantStudents) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);

      const newTask = await base44.asServiceRole.entities.Task.create({
        name: 'שיחת בדיקה להרשמה',
        description: `הקורס "${courseName}" נפתח להרשמה! ${student.full_name} הביע/ה עניין בעבר.`,
        status: 'לחזור לקראת הרשמה',
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        student_id: student.id,
        student_name: student.full_name
      });

      createdTasks.push(newTask.id);
      console.log(`✅ Created task for ${student.full_name}`);
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
        <p style="color: #666; font-size: 12px; margin-top: 20px;">סטודיו פנטהריי CRM</p>
      </div>`
    });

    console.log('✅ Admin notified via email');

    return Response.json({
      status: 'success',
      course: courseName,
      students_notified: relevantStudents.length,
      tasks_created: createdTasks.length
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});