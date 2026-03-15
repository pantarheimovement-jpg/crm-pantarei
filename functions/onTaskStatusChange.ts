import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    let newStudentStatus = null;

    // Rule 1: Task "בבדיקה" → Student "מעקב ראשוני"
    if (newStatus === 'בבדיקה') {
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
      await base44.asServiceRole.entities.Student.update(studentId, {
        status: newStudentStatus
      });
      console.log('✅ Student status updated successfully');
    } else {
      console.log('No student status mapping for this task status');
    }

    return Response.json({ 
      status: 'success', 
      task_status: newStatus, 
      student_status: newStudentStatus 
    });

  } catch (error) {
    console.error('❌ Error in onTaskStatusChange:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});