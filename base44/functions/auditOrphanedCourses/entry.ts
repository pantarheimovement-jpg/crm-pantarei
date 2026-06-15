import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load all existing course IDs
    const courses = await base44.asServiceRole.entities.Course.list();
    const validCourseIds = new Set(courses.map(c => c.id));

    // Load all students (paginated)
    const orphaned = [];
    let skip = 0;
    const pageSize = 50;

    while (true) {
      const students = await base44.asServiceRole.entities.Student.list('-created_date', pageSize, skip);
      if (!students || students.length === 0) break;

      for (const student of students) {
        const badCourses = [];

        // Check courses array
        if (Array.isArray(student.courses)) {
          for (const c of student.courses) {
            if (c.course_id && !validCourseIds.has(c.course_id)) {
              badCourses.push({ course_id: c.course_id, course_name: c.course_name, status: c.status });
            }
          }
        }

        // Check top-level course_id
        const topLevelBad = student.course_id && !validCourseIds.has(student.course_id);

        if (badCourses.length > 0 || topLevelBad) {
          orphaned.push({
            student_id: student.id,
            full_name: student.full_name,
            phone: student.phone,
            status: student.status,
            bad_courses: badCourses,
            top_level_course_id: topLevelBad ? student.course_id : null,
            top_level_course_name: topLevelBad ? student.course_name : null,
          });
        }
      }

      if (students.length < pageSize) break;
      skip += pageSize;
    }

    return Response.json({
      total_orphaned: orphaned.length,
      valid_course_ids: [...validCourseIds],
      orphaned_students: orphaned
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});