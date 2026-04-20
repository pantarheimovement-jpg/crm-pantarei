import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// One-time migration: assign existing subscribers to course-based groups
// Skips subscribers in test/placeholder groups

const SKIP_GROUP_PREFIXES = ['קבוצה ']; // Keep test groups untouched

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json().catch(() => ({}));

    // Load all data
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
      // Skip placeholder subscribers
      if (sub.email?.startsWith('_placeholder_')) {
        skipped++;
        continue;
      }

      // Skip subscribers in test groups (קבוצה 1, קבוצה 2, etc.)
      const isTestGroup = SKIP_GROUP_PREFIXES.some(prefix => (sub.group || '').startsWith(prefix));
      if (isTestGroup) {
        skipped++;
        details.push({ email: sub.email, action: 'skipped', reason: `test group: ${sub.group}` });
        continue;
      }

      // Find matching student
      if (!sub.email) {
        noMatch++;
        continue;
      }

      const student = studentsByEmail[sub.email.toLowerCase()];
      if (!student) {
        noMatch++;
        details.push({ email: sub.email, action: 'no_match', reason: 'no student found' });
        continue;
      }

      // Get course name
      const courseName = student.course_name || 
        (student.courses && student.courses.length > 0 ? student.courses[0].course_name : null);

      if (!courseName) {
        noMatch++;
        details.push({ email: sub.email, action: 'no_course', reason: 'student has no course' });
        continue;
      }

      // Update subscriber
      if (!dry_run) {
        const currentGroups = sub.groups && Array.isArray(sub.groups) ? [...sub.groups] : [];
        if (!currentGroups.includes(courseName)) {
          currentGroups.push(courseName);
        }
        await base44.asServiceRole.entities.Subscribers.update(sub.id, { 
          group: courseName,
          groups: currentGroups
        });
      }
      
      updated++;
      details.push({ 
        email: sub.email, 
        name: sub.name,
        action: dry_run ? 'would_update' : 'updated', 
        from: sub.group, 
        to: courseName 
      });
    }

    return Response.json({
      dry_run,
      total: allSubscribers.length,
      updated,
      skipped,
      noMatch,
      details: details.slice(0, 100) // Limit details to first 100
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});