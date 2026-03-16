import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// =============================================
// One-time script: Backfill lead_entry_date
// Sets lead_entry_date from created_date for 
// all students where it's missing
// =============================================

Deno.serve(async (req) => {
  console.log('=== backfillLeadEntryDate Started ===');

  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all students
    const allStudents = await base44.asServiceRole.entities.Student.list('-created_date', 500);
    
    let updatedCount = 0;
    let skippedCount = 0;

    for (const student of allStudents) {
      if (!student.lead_entry_date) {
        const entryDate = new Date(student.created_date).toISOString().split('T')[0];
        
        await base44.asServiceRole.entities.Student.update(student.id, {
          lead_entry_date: entryDate
        });
        
        updatedCount++;
        console.log(`✅ ${student.full_name}: set lead_entry_date = ${entryDate}`);
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 300));
      } else {
        skippedCount++;
      }
    }

    console.log(`=== Done: ${updatedCount} updated, ${skippedCount} already had date ===`);

    return Response.json({
      status: 'success',
      total: allStudents.length,
      updated: updatedCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});