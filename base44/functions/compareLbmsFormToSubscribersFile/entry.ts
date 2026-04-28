import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LBMS_GROUP = 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף';

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

function normalizeHeader(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

async function fetchCsvRows(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Could not fetch CSV: ${fileUrl}`);

  const text = await response.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));

  return { headers, rows };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { form_file_url, subscribers_file_url } = await req.json();
    if (!form_file_url || !subscribers_file_url) {
      return Response.json({ error: 'Missing form_file_url or subscribers_file_url' }, { status: 400 });
    }

    const formCsv = await fetchCsvRows(form_file_url);
    const subscribersCsv = await fetchCsvRows(subscribers_file_url);

    const formEmailIndex = formCsv.headers.findIndex((header) => header === 'אימייל');
    const firstNameIndex = formCsv.headers.findIndex((header) => header === 'שם פרטי');
    const lastNameIndex = formCsv.headers.findIndex((header) => header === 'שם משפחה');
    const dateIndex = formCsv.headers.findIndex((header) => header === 'תאריך');
    const phoneIndex = formCsv.headers.findIndex((header) => header === 'טלפון');
    const interestIndex = formCsv.headers.findIndex((header) => header === 'במה מתעניין');

    const subscriberEmailIndex = subscribersCsv.headers.findIndex((header) => header === 'מייל');
    const subscriberGroupIndex = subscribersCsv.headers.findIndex((header) => header === 'קבוצה');
    const subscriberStatusIndex = subscribersCsv.headers.findIndex((header) => header === 'סטטוס');

    const formLbmsByEmail = new Map();
    for (const row of formCsv.rows) {
      const interest = String(row[interestIndex] || '');
      if (!interest.includes('LBMS')) continue;

      const email = normalizeEmail(row[formEmailIndex]);
      if (!email || !email.includes('@')) continue;

      const existing = formLbmsByEmail.get(email);
      if (existing) {
        existing.occurrences += 1;
      } else {
        formLbmsByEmail.set(email, {
          date: row[dateIndex] || '',
          name: [row[firstNameIndex] || '', row[lastNameIndex] || ''].join(' ').trim(),
          email,
          phone: row[phoneIndex] || '',
          interest,
          occurrences: 1,
        });
      }
    }

    const lbmsSubscriberEmails = new Set();
    for (const row of subscribersCsv.rows) {
      const group = String(row[subscriberGroupIndex] || '');
      const status = String(row[subscriberStatusIndex] || '');
      const email = normalizeEmail(row[subscriberEmailIndex]);

      if (!email || !email.includes('@')) continue;
      if (!group.includes('LBMS')) continue;
      if (status && status !== 'פעיל') continue;

      lbmsSubscriberEmails.add(email);
    }

    const missing = [...formLbmsByEmail.values()]
      .filter((row) => !lbmsSubscriberEmails.has(row.email))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');
    const title = `LBMS - חסרים מול קובץ מנויים - ${new Date().toISOString().split('T')[0]}`;

    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: { title } }),
    });

    if (!createResponse.ok) {
      const details = await createResponse.text();
      return Response.json({ error: 'Failed creating Google Sheet', details }, { status: 500 });
    }

    const spreadsheet = await createResponse.json();
    const values = [
      ['תאריך', 'שם', 'אימייל', 'טלפון', 'במה מתעניין', 'מספר הופעות בקובץ'],
      ...missing.map((row) => [
        row.date,
        row.name,
        row.email,
        row.phone,
        row.interest,
        String(row.occurrences),
      ]),
    ];

    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}/values/A1:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!updateResponse.ok) {
      const details = await updateResponse.text();
      return Response.json({ error: 'Failed writing Google Sheet', details }, { status: 500 });
    }

    return Response.json({
      success: true,
      form_lbms_unique_emails: formLbmsByEmail.size,
      active_lbms_subscriber_emails: lbmsSubscriberEmails.size,
      missing_count: missing.length,
      sheet_url: spreadsheet.spreadsheetUrl,
      missing,
    });
  } catch (error) {
    console.error('compareLbmsFormToSubscribersFile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});