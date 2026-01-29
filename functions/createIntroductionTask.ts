import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { student } = await req.json();

    if (!student || !student.id) {
      return Response.json({ error: 'Student data required' }, { status: 400 });
    }

    // חישוב תאריך יעד - יומיים קדימה
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);

    // יצירת המשימה
    const task = await base44.asServiceRole.entities.Task.create({
      description: "שיחת היכרות",
      status: "פתוח",
      priority: "גבוהה",
      due_date: dueDate.toISOString().split('T')[0],
      student_id: student.id,
      student_name: student.full_name
    });

    console.log(`✅ Created introduction task for ${student.full_name} (ID: ${task.id})`);

    return Response.json({ 
      success: true, 
      task_id: task.id,
      message: 'Introduction task created successfully'
    });

  } catch (error) {
    console.error('Error creating introduction task:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});