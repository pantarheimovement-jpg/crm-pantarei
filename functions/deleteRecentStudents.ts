import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { minutes } = await req.json();
    
    // אם לא צוין, ברירת מחדל 30 דקות
    const minutesAgo = minutes || 30;
    
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - minutesAgo * 60 * 1000);
    
    console.log(`🔍 מחפש משתתפים שנוצרו ב-${minutesAgo} דקות האחרונות`);
    console.log(`⏰ זמן גבול: ${cutoffTime.toISOString()}`);

    // מושך את כל המשתתפים
    const allStudents = await base44.asServiceRole.entities.Student.list();
    
    // מסנן רק את אלו שנוצרו בזמן האחרון
    const studentsToDelete = allStudents.filter(student => {
      const createdDate = new Date(student.created_date);
      return createdDate >= cutoffTime;
    });

    console.log(`📋 נמצאו ${studentsToDelete.length} משתתפים למחיקה`);

    if (studentsToDelete.length === 0) {
      return Response.json({
        success: true,
        message: `לא נמצאו משתתפים שנוצרו ב-${minutesAgo} דקות האחרונות`,
        deleted_count: 0,
        deleted_names: []
      });
    }

    const deletedNames = [];
    let deletedCount = 0;

    // מחיקת המשתתפים
    for (const student of studentsToDelete) {
      try {
        await base44.asServiceRole.entities.Student.delete(student.id);
        deletedNames.push(student.full_name);
        deletedCount++;
        console.log(`✅ נמחק: ${student.full_name}`);
      } catch (error) {
        console.error(`❌ שגיאה במחיקת ${student.full_name}:`, error.message);
      }
    }

    return Response.json({
      success: true,
      message: `נמחקו ${deletedCount} משתתפים בהצלחה`,
      deleted_count: deletedCount,
      deleted_names: deletedNames,
      minutes_ago: minutesAgo
    });

  } catch (error) {
    console.error('❌ שגיאה:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});