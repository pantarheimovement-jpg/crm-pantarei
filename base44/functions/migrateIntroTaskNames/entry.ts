import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // משוך את כל המשימות עם השם הגנרי "שיחת היכרות"
    const genericTasks = await base44.asServiceRole.entities.Task.filter({
      name: 'שיחת היכרות'
    });

    console.log(`Found ${genericTasks.length} generic "שיחת היכרות" tasks`);

    if (genericTasks.length === 0) {
      return Response.json({ success: true, message: 'No generic tasks found', updated: 0, skipped: 0 });
    }

    // אסוף את כל ה-student IDs הייחודיים
    const studentIds = [...new Set(genericTasks.filter(t => t.student_id).map(t => t.student_id))];
    console.log(`Unique student IDs: ${studentIds.length}`);

    // משוך את כל הסטודנטים הרלוונטיים
    const studentsMap = {};
    for (const sid of studentIds) {
      try {
        const students = await base44.asServiceRole.entities.Student.filter({ id: sid });
        if (students && students.length > 0) {
          studentsMap[sid] = students[0];
        }
      } catch (e) {
        console.warn(`Could not fetch student ${sid}: ${e.message}`);
      }
    }
    console.log(`Loaded ${Object.keys(studentsMap).length} students`);

    let updated = 0;
    let skipped = 0;
    const details = [];

    for (const task of genericTasks) {
      const student = studentsMap[task.student_id];
      if (!student) {
        skipped++;
        details.push({ task_id: task.id, student_name: task.student_name, action: 'skipped', reason: 'student not found' });
        continue;
      }

      // שלוף שם קורס: מ-course_name, או מהקורס האחרון ב-courses[]
      const courseName = student.course_name || 
        (student.courses && student.courses.length > 0 ? student.courses[student.courses.length - 1].course_name : '') || 
        '';

      if (!courseName) {
        skipped++;
        details.push({ task_id: task.id, student_name: task.student_name, action: 'skipped', reason: 'no course found' });
        continue;
      }

      const isFascia = courseName.toLowerCase().includes('פאשיה') || courseName.toLowerCase().includes('fascia');
      const newName = isFascia ? 'שיחת היכרות פאשיה בתנועה' : `שיחת היכרות - ${courseName}`;

      await base44.asServiceRole.entities.Task.update(task.id, { name: newName });
      updated++;
      details.push({ task_id: task.id, student_name: task.student_name, course: courseName, old_name: 'שיחת היכרות', new_name: newName });
      console.log(`Updated task ${task.id}: "${task.student_name}" → "${newName}"`);
    }

    console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
    return Response.json({ success: true, total: genericTasks.length, updated, skipped, details });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});