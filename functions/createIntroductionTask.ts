import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();
    
    const student = data;

    if (!student || !student.id) {
      return Response.json({ error: 'Student data required' }, { status: 400 });
    }

    // בדיקה שהסטטוס הוא בדיוק "חדש" או "ליד חדש" בלבד
    const isNewLead = student.status === 'חדש' || student.status === 'ליד חדש';
    
    // אם הסטטוס לא "ליד חדש" - לא יוצרים משימה (כולל רשום, נרשם וכו')
    if (!isNewLead) {
      console.log(`⏭️ Skipping introduction task - status is "${student.status}", not a new lead`);
      return Response.json({ 
        success: true, 
        message: 'No task needed - status is not new lead'
      });
    }
    
    // בדיקה אם זה עדכון - נבדוק שהסטטוס השתנה
    if (event.type === 'update' && old_data) {
      const wasNewLead = old_data.status === 'חדש' || old_data.status === 'ליד חדש';
      
      // אם כבר היה ליד חדש, לא צריך ליצור משימה נוספת
      if (wasNewLead) {
        console.log(`⏭️ Skipping introduction task - was already a new lead`);
        return Response.json({ 
          success: true, 
          message: 'No task needed - was already a new lead'
        });
      }
    }

    // בדיקה אם כבר יש משימת היכרות פתוחה למשתתף הזה
    const existingTasks = await base44.asServiceRole.entities.Task.filter({
      student_id: student.id,
      name: "שיחת היכרות"
    });

    const openTask = existingTasks.find(t => 
      t.status !== "הושלם" && t.status !== "אבוד"
    );

    if (openTask) {
      console.log(`⏭️ Introduction task already exists for ${student.full_name} (Task ID: ${openTask.id})`);
      return Response.json({ 
        success: true, 
        message: 'Introduction task already exists',
        existing_task_id: openTask.id
      });
    }

    // חישוב תאריך מתוזמן - יומיים קדימה
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);

    // יצירת השיחה
    const task = await base44.asServiceRole.entities.Task.create({
      name: "שיחת היכרות",
      description: `שיחת היכרות עם ${student.full_name}`,
      status: "ממתין",
      scheduled_date: scheduledDate.toISOString().split('T')[0],
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