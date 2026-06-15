import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load all existing courses
    const courses = await base44.asServiceRole.entities.Course.list();
    const validCourseIds = new Set(courses.map(c => c.id));

    // Load all students (paginated)
    const rows = [];
    let skip = 0;
    const pageSize = 50;

    while (true) {
      const students = await base44.asServiceRole.entities.Student.list('-created_date', pageSize, skip);
      if (!students || students.length === 0) break;

      for (const student of students) {
        const badCourseEntries = Array.isArray(student.courses)
          ? student.courses.filter(c => c.course_id && !validCourseIds.has(c.course_id))
          : [];

        const topLevelBad = student.course_id && !validCourseIds.has(student.course_id);

        if (badCourseEntries.length > 0 || topLevelBad) {
          // One row per bad course entry
          if (badCourseEntries.length > 0) {
            for (const bc of badCourseEntries) {
              rows.push([
                student.full_name || '',
                student.phone || '',
                student.status || '',
                bc.course_name || '',
                bc.course_id || '',
                bc.status || '',
                student.id,
                '' // עמודה ריקה: "קורס חדש לשייך"
              ]);
            }
          } else {
            // top-level only
            rows.push([
              student.full_name || '',
              student.phone || '',
              student.status || '',
              student.course_name || '',
              student.course_id || '',
              '',
              student.id,
              ''
            ]);
          }
        }
      }

      if (students.length < pageSize) break;
      skip += pageSize;
    }

    // Build Google Sheets via connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Create new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: 'סטודנטים עם שיוך קורס פגום' },
        sheets: [{
          properties: { title: 'דוח' }
        }]
      })
    });

    const sheet = await createRes.json();
    const spreadsheetId = sheet.spreadsheetId;

    // Write header + data
    const header = ['שם סטודנט', 'טלפון', 'סטטוס סטודנט', 'שם קורס נמחק', 'ID קורס נמחק', 'סטטוס בקורס', 'ID סטודנט', 'קורס חדש לשייך (מלא ידנית)'];
    const values = [header, ...rows];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    return Response.json({
      success: true,
      total_rows: rows.length,
      sheet_url: sheetUrl
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});