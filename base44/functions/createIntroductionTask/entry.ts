import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('=== 🎯 createIntroductionTask STARTED ===');
  
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();
    
    console.log('📦 Event Type:', event?.type);
    console.log('📦 Student Data:', JSON.stringify(data, null, 2));
    console.log('📦 Old Data:', JSON.stringify(old_data, null, 2));
    
    const student = data;

    if (!student || !student.id) {
      console.log('❌ No student ID provided');
      return Response.json({ error: 'Student data required' }, { status: 400 });
    }

    console.log(`👤 Student: ${student.full_name} (ID: ${student.id})`);
    console.log(`📊 Status: "${student.status}"`);
    
    // בדיקה שהסטטוס הוא בדיוק "חדש" או "ליד חדש" בלבד
    const isNewLead = student.status === 'חדש' || student.status === 'ליד חדש';
    
    console.log(`🔍 Is New Lead? ${isNewLead} (status === "חדש" || status === "ליד חדש")`);
    
    // אם הסטטוס לא "ליד חדש" - לא יוצרים משימה (כולל רשום, נרשם וכו')
    if (!isNewLead) {
      console.log(`⏭️ SKIPPING - status is "${student.status}", not a new lead`);
      return Response.json({ 
        success: true, 
        message: 'No task needed - status is not new lead'
      });
    }
    
    console.log(`✅ Status is new lead - will check for existing tasks`);
    console.log(`📅 Current Date: ${new Date().toISOString()}`);
    
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
    console.log(`🔍 Checking for existing tasks...`);
    
    const existingTasks = await base44.asServiceRole.entities.Task.filter({
      student_id: student.id,
      name: "שיחת היכרות"
    });

    console.log(`📋 Found ${existingTasks.length} existing "שיחת היכרות" tasks`);
    
    const openTask = existingTasks.find(t => 
      t.status !== "הושלם" && t.status !== "אבוד"
    );

    if (openTask) {
      console.log(`⏭️ SKIPPING - Introduction task already exists (Task ID: ${openTask.id}, Status: ${openTask.status})`);
      return Response.json({ 
        success: true, 
        message: 'Introduction task already exists',
        existing_task_id: openTask.id
      });
    }

    console.log(`✅ No existing open tasks - creating new task`);

    // חישוב תאריך מתוזמן - יומיים קדימה
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);
    
    console.log(`📅 Scheduled date: ${scheduledDate.toISOString().split('T')[0]}`);

    // יצירת השיחה
    console.log(`🔨 Creating task with status: "ממתין"`);
    
    const task = await base44.asServiceRole.entities.Task.create({
      name: "שיחת היכרות",
      description: `שיחת היכרות עם ${student.full_name}`,
      status: "ממתין",
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      student_id: student.id,
      student_name: student.full_name
    });

    console.log(`✅ Task created successfully!`);
    console.log(`   Task ID: ${task.id}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Scheduled: ${task.scheduled_date}`);

    return Response.json({ 
      success: true, 
      task_id: task.id,
      message: 'Introduction task created successfully'
    });

  } catch (error) {
    console.error('=== ❌ ERROR in createIntroductionTask ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});