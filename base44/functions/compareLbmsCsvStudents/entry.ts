import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    const csvResponse = await fetch(file_url);
    if (!csvResponse.ok) {
      return Response.json({ error: 'Could not fetch CSV file' }, { status: 400 });
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
    const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/, '').trim());
    const emailIndex = headers.findIndex((header) => header === 'אימייל');
    const firstNameIndex = headers.findIndex((header) => header === 'שם פרטי');
    const lastNameIndex = headers.findIndex((header) => header === 'שם משפחה');
    const dateIndex = headers.findIndex((header) => header === 'תאריך');
    const interestIndex = headers.findIndex((header) => header === 'במה מתעניין');

    const csvByEmail = new Map();

    for (const line of lines.slice(1)) {
      const values = parseCsvLine(line);
      let email = normalizeEmail(values[emailIndex]);

      if (!email && values.length >= 3) {
        email = normalizeEmail(values.find((value) => String(value).includes('@')));
      }

      if (!email || !email.includes('@')) continue;

      const existing = csvByEmail.get(email);
      if (!existing) {
        csvByEmail.set(email, {
          email,
          name: [values[firstNameIndex] || '', values[lastNameIndex] || ''].join(' ').trim(),
          date: values[dateIndex] || '',
          interest: values[interestIndex] || '',
          occurrences: 1,
        });
      } else {
        existing.occurrences += 1;
      }
    }

    const students = await base44.asServiceRole.entities.Student.list('-created_date', 1000);
    const studentEmails = new Set((students || []).map((student) => normalizeEmail(student.email)).filter(Boolean));

    const missing = [...csvByEmail.values()]
      .filter((row) => !studentEmails.has(row.email))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return Response.json({
      csv_rows: lines.length - 1,
      unique_csv_emails: csvByEmail.size,
      students_total_checked: students.length,
      missing_count: missing.length,
      missing,
    });
  } catch (error) {
    console.error('compareLbmsCsvStudents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});