import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { date } = await req.json();
    
    // אם לא צוין תאריך, משתמשים בתאריך של היום
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log(`🔍 מחפש משתתפים שנוצרו בתאריך: ${targetDate}`);

    // מושך את כל המשתתפים
    const allStudents = await base44.asServiceRole.entities.Student.list();
    
    // מסנן רק את אלו שנוצרו בתאריך המבוקש
    const studentsToDelete = allStudents.filter(student => {
      const createdDate = student.created_date?.split('T')[0];
      return createdDate === targetDate;
    });

    console.log(`📋 נמצאו ${studentsToDelete.length} משתתפים למחיקה`);

    if (studentsToDelete.length === 0) {
      return Response.json({
        success: true,
        message: `לא נמצאו משתתפים שנוצרו בתאריך ${targetDate}`,
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
      target_date: targetDate
    });

  } catch (error) {
    console.error('❌ שגיאה:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});