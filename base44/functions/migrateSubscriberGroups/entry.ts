import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true, course_filter = null } = await req.json().catch(() => ({}));

    const [allSubscribers, allStudents] = await Promise.all([
      base44.asServiceRole.entities.Subscribers.list(),
      base44.asServiceRole.entities.Student.list()
    ]);

    // Build email -> student map
    const studentsByEmail = {};
    allStudents.forEach(s => {
      if (s.email) studentsByEmail[s.email.toLowerCase()] = s;
    });

    let updated = 0;
    let skipped = 0;
    let noMatch = 0;
    const details = [];

    for (const sub of allSubscribers) {
      if (sub.email?.startsWith('_placeholder_')) { skipped++; continue; }
      if (!sub.email) { noMatch++; continue; }
      // Skip specific emails
      const skipEmails = ['s.ganels@gmail.com'];
      if (skipEmails.includes(sub.email.toLowerCase())) { skipped++; details.push({ email: sub.email, name: sub.name, action: 'skipped_manual' }); continue; }

      const student = studentsByEmail[sub.email.toLowerCase()];
      if (!student) { noMatch++; continue; }

      // Get all course names for this student
      const courseNames = [];
      if (student.course_name) courseNames.push(student.course_name);
      if (student.courses && Array.isArray(student.courses)) {
        student.courses.forEach(c => {
          if (c.course_name && !courseNames.includes(c.course_name)) {
            courseNames.push(c.course_name);
          }
        });
      }

      if (courseNames.length === 0) { noMatch++; continue; }

      // If course_filter is set, only process students in that course
      if (course_filter) {
        const match = courseNames.some(cn => cn.toLowerCase().includes(course_filter.toLowerCase()));
        if (!match) { skipped++; continue; }
      }

      const targetCourse = course_filter 
        ? courseNames.find(cn => cn.toLowerCase().includes(course_filter.toLowerCase()))
        : courseNames[0];

      if (!dry_run) {
        const currentGroups = sub.groups && Array.isArray(sub.groups) ? [...sub.groups] : [];
        if (!currentGroups.includes(targetCourse)) {
          currentGroups.push(targetCourse);
        }
        await base44.asServiceRole.entities.Subscribers.update(sub.id, { 
          group: targetCourse,
          groups: currentGroups
        });
      }
      
      updated++;
      details.push({ 
        email: sub.email, 
        name: sub.name || student.full_name,
        action: dry_run ? 'would_update' : 'updated', 
        from: sub.group, 
        to: targetCourse 
      });
    }

    return Response.json({ dry_run, course_filter, total: allSubscribers.length, updated, skipped, noMatch, details });
  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});