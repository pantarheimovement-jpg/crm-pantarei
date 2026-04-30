import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SHEET_ID = '1tw4b_7cvuK7_gG_Y8fFup9OgyADaPFEfygX_NgoTk2k';
const COURSE_NAME = 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף';
const GROUPS = [
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 3🌿',
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 4🌸',
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 5🌞',
  'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף 6🌙',
];

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  const clean = String(value || '').replace(/[\s\-().+]/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) return `972${clean.slice(1)}`;
  if (clean.length === 9) return `972${clean}`;
  return clean;
}

function generateToken() {
  return crypto.randomUUID();
}

function parseSheetRows(values) {
  const rows = values || [];
  const headerIndex = rows.findIndex((row) => row.includes('אימייל'));
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((header) => String(header || '').trim());
  const emailIndex = headers.indexOf('אימייל');
  const nameIndex = headers.indexOf('שם');
  const phoneIndex = headers.indexOf('טלפון');
  const dateIndex = headers.indexOf('תאריך');
  const interestIndex = headers.indexOf('במה מתעניין');

  return rows.slice(headerIndex + 1)
    .map((row) => ({
      date: row[dateIndex] || '',
      name: row[nameIndex] || '',
      email: normalizeEmail(row[emailIndex]),
      phone: normalizePhone(row[phoneIndex]),
      interest: row[interestIndex] || COURSE_NAME,
    }))
    .filter((row) => row.email && row.email.includes('@'));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = false, subscriber_limit = null } = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    const sheetResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:Z`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetResponse.ok) {
      const details = await sheetResponse.text();
      return Response.json({ error: 'Failed reading Google Sheet', details }, { status: 500 });
    }

    const sheetData = await sheetResponse.json();
    const rows = parseSheetRows(sheetData.values);

    const students = await base44.asServiceRole.entities.Student.list('-created_date', 2000);
    const subscribers = await base44.asServiceRole.entities.Subscribers.list('-created_date', 2000);
    const courses = await base44.asServiceRole.entities.Course.list('-created_date', 500);
    const course = (courses || []).find((item) => item.name === COURSE_NAME);

    const studentEmails = new Set((students || []).map((student) => normalizeEmail(student.email)).filter(Boolean));
    const subscriberEmails = new Set((subscribers || []).map((subscriber) => normalizeEmail(subscriber.email)).filter(Boolean));
    const uniqueRows = [];
    const seen = new Set();

    for (const row of rows) {
      if (seen.has(row.email)) continue;
      seen.add(row.email);
      uniqueRows.push(row);
    }

    const studentsToCreate = uniqueRows.filter((row) => !studentEmails.has(row.email));
    const allSubscribersToCreate = uniqueRows.filter((row) => !subscriberEmails.has(row.email));
    const subscribersToCreate = subscriber_limit ? allSubscribersToCreate.slice(0, subscriber_limit) : allSubscribersToCreate;
    const groupCounts = Object.fromEntries(GROUPS.map((group) => [group, 0]));

    subscribersToCreate.forEach((row, index) => {
      const group = GROUPS[Math.floor(index / 35)] || GROUPS[GROUPS.length - 1];
      groupCounts[group] += 1;
    });

    if (dry_run) {
      return Response.json({
        dry_run: true,
        sheet_rows: rows.length,
        unique_emails: uniqueRows.length,
        students_to_create: studentsToCreate.length,
        students_already_exist: uniqueRows.length - studentsToCreate.length,
        subscribers_to_create: allSubscribersToCreate.length,
        subscribers_in_this_run: subscribersToCreate.length,
        subscribers_already_exist: uniqueRows.length - allSubscribersToCreate.length,
        group_counts: groupCounts,
      });
    }

    for (const row of studentsToCreate) {
      const studentData = {
        full_name: row.name || row.email,
        email: row.email,
        phone: row.phone,
        status: 'ליד היסטורי',
        lead_source: 'ייבוא היסטורי LBMS',
        interest_area: COURSE_NAME,
        lead_entry_date: row.date || undefined,
        notes: `ייבוא היסטורי מקובץ חסרים LBMS. לא נשלחה הודעת ליד חדש.`,
        marketing_consent: true,
      };

      if (course) {
        studentData.course_id = course.id;
        studentData.course_name = course.name;
        studentData.courses = [{
          course_id: course.id,
          course_name: course.name,
          status: 'ליד היסטורי',
          registration_date: row.date || new Date().toISOString().split('T')[0],
        }];
      }

      await base44.asServiceRole.entities.Student.create(studentData);
    }

    for (const [index, row] of subscribersToCreate.entries()) {
      const group = GROUPS[Math.floor(index / 35)] || GROUPS[GROUPS.length - 1];
      await base44.asServiceRole.entities.Subscribers.create({
        email: row.email,
        whatsapp: row.phone,
        name: row.name || row.email,
        group,
        groups: [group],
        subscribed: true,
        marketing_consent: true,
        unsubscribe_token: generateToken(),
        source: 'ייבוא היסטורי LBMS',
      });
    }

    return Response.json({
      success: true,
      sheet_rows: rows.length,
      unique_emails: uniqueRows.length,
      students_created: studentsToCreate.length,
      subscribers_created: subscribersToCreate.length,
      group_counts: groupCounts,
      note: 'No automatic WhatsApp lead messages were sent by this import.',
    });
  } catch (error) {
    console.error('importHistoricalLbmsLeads error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});