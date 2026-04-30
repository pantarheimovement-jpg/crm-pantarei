import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SHEET_ID = '1tw4b_7cvuK7_gG_Y8fFup9OgyADaPFEfygX_NgoTk2k';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function parseLeadDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const ddmmyyyy = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return '';
}

function parseSheetRows(values) {
  const rows = values || [];
  const headerIndex = rows.findIndex((row) => row.includes('אימייל'));
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((header) => String(header || '').trim());
  const emailIndex = headers.indexOf('אימייל');
  const dateIndex = headers.indexOf('תאריך');
  const nameIndex = headers.indexOf('שם');

  return rows.slice(headerIndex + 1)
    .map((row) => ({
      email: normalizeEmail(row[emailIndex]),
      lead_entry_date: parseLeadDate(row[dateIndex]),
      original_date: row[dateIndex] || '',
      name: row[nameIndex] || '',
    }))
    .filter((row) => row.email && row.lead_entry_date);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true, limit = null } = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:Z`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetResponse.ok) {
      const details = await sheetResponse.text();
      return Response.json({ error: 'Failed reading Google Sheet', details }, { status: 500 });
    }

    const sheetData = await sheetResponse.json();
    const sheetRows = parseSheetRows(sheetData.values);
    const datesByEmail = new Map();

    for (const row of sheetRows) {
      if (!datesByEmail.has(row.email)) {
        datesByEmail.set(row.email, row);
      }
    }

    const students = await base44.asServiceRole.entities.Student.list('-created_date', 3000);
    const historicalStudents = (students || []).filter((student) =>
      student.status === 'ליד היסטורי' || student.lead_source === 'ייבוא היסטורי LBMS'
    );

    const updates = [];
    const missingInSheet = [];

    for (const student of historicalStudents) {
      const row = datesByEmail.get(normalizeEmail(student.email));
      if (!row) {
        missingInSheet.push({ id: student.id, name: student.full_name, email: student.email || '' });
        continue;
      }

      if (student.lead_entry_date !== row.lead_entry_date) {
        updates.push({
          student,
          date: row.lead_entry_date,
          original_date: row.original_date,
          sheet_name: row.name,
        });
      }
    }

    const limitedUpdates = limit ? updates.slice(0, limit) : updates;

    if (!dry_run) {
      for (const item of limitedUpdates) {
        await base44.asServiceRole.entities.Student.update(item.student.id, {
          lead_entry_date: item.date,
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return Response.json({
      success: true,
      dry_run,
      sheet_rows_with_dates: sheetRows.length,
      historical_students: historicalStudents.length,
      students_to_update: updates.length,
      updated_this_run: dry_run ? 0 : limitedUpdates.length,
      missing_in_sheet: missingInSheet.length,
      sample_updates: updates.slice(0, 10).map((item) => ({
        name: item.student.full_name,
        email: item.student.email,
        current_lead_entry_date: item.student.lead_entry_date || '',
        new_lead_entry_date: item.date,
        original_excel_date: item.original_date,
      })),
    });
  } catch (error) {
    console.error('updateHistoricalLeadEntryDates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});