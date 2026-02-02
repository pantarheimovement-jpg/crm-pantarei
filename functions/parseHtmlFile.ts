import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/\D/g, '');
};

const parseDate = (dateStr) => {
  if (!dateStr) {
    console.log('⚠️ parseDate: Empty date string');
    return null;
  }

  console.log(`🔄 parseDate: Parsing "${dateStr}"`);

  // טיפול בפורמט "HH.MM dd/mm/yyyy" או "dd/mm/yyyy HH:MM"
  let cleanDate = dateStr.trim();

  // אם יש שעה, הסר אותה
  if (cleanDate.includes(' ')) {
    const parts = cleanDate.split(' ');
    console.log(`   Split parts:`, parts);
    cleanDate = parts.find(p => p.includes('/')) || parts[parts.length - 1];
    console.log(`   Clean date after removing time: "${cleanDate}"`);
  }

  // פרסינג של dd/mm/yyyy
  const dateParts = cleanDate.split(/[\/\-\.]/);
  console.log(`   Date parts:`, dateParts);

  if (dateParts.length === 3) {
    let day = parseInt(dateParts[0], 10);
    let month = parseInt(dateParts[1], 10) - 1;
    let year = parseInt(dateParts[2], 10);
    if (year < 100) year += 2000;

    const parsed = new Date(year, month, day);
    console.log(`   ✅ Parsed result: ${parsed.toLocaleDateString('he-IL')} (valid: ${!isNaN(parsed)})`);
    if (!isNaN(parsed)) return parsed.toISOString();
  }

  console.log(`   ⚠️ Fallback to Date constructor`);
  return new Date(dateStr).toISOString();
};

const parseHtmlTable = (htmlContent) => {
  console.log("🔵 ========== START parseHtmlTable ==========");
  console.log(`📄 HTML Content length: ${htmlContent.length} characters`);
  console.log(`📄 HTML Preview (first 500 chars):`, htmlContent.substring(0, 500));
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const rows = Array.from(doc.querySelectorAll('tr'));

  console.log(`🔵 Found ${rows.length} total rows in <tr> tags`);

  if (rows.length === 0) {
    console.log("🔴 No rows found! Trying to find any table structure...");
    const tables = doc.querySelectorAll('table');
    console.log(`   Found ${tables.length} <table> elements`);
    const allTds = doc.querySelectorAll('td');
    console.log(`   Found ${allTds.length} <td> elements total`);
    return [];
  }

  // הדפסה של 5 השורות הראשונות לדיבוג
  console.log("📋 First 5 rows structure:");
  rows.slice(0, 5).forEach((row, idx) => {
    const thCount = row.querySelectorAll('th').length;
    const tdCount = row.querySelectorAll('td').length;
    const cells = Array.from(row.querySelectorAll('th, td')).map(c => c.textContent?.trim().substring(0, 30));
    console.log(`   Row ${idx}: ${thCount} <th>, ${tdCount} <td>`);
    console.log(`      Cells: ${JSON.stringify(cells)}`);
  });

  // זיהוי headers
  let headerMap = {};
  const headerRow = rows.find(r => r.querySelectorAll('th').length > 0);

  console.log(`🔍 Header row search: ${headerRow ? 'FOUND' : 'NOT FOUND'}`);

  if (headerRow) {
    const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
    console.log('🔍 RAW Detected headers:', headers);
    console.log('🔍 Detected headers JSON:', JSON.stringify(headers));

    headers.forEach((h, i) => {
      console.log(`   Checking header [${i}]: "${h}"`);
      
      if (h === 'לקוחה' || h === 'לקוח' || h === 'משתתף' || h === 'שם הלקוח' || h === 'שם לקוח') {
        headerMap.full_name = i;
        console.log(`   ✅ Mapped FULL_NAME to column ${i}`);
      }
      else if (h.includes('שם') && !h.includes('כרטיס') && !h.includes('סליקה') && !h.includes('קורס') && headerMap.full_name === undefined) {
        headerMap.full_name = i;
        console.log(`   ✅ Mapped FULL_NAME (generic) to column ${i}`);
      }

      if (h.includes('טלפון') || h.includes('phone') || h.includes('נייד')) {
        headerMap.phone = i;
        console.log(`   ✅ Mapped PHONE to column ${i}`);
      }
      if (h.includes('מייל') || h.includes('email') || h.includes('דוא"ל')) {
        headerMap.email = i;
        console.log(`   ✅ Mapped EMAIL to column ${i}`);
      }
      if (h.includes('קורס') || h.includes('סדנא') || h.includes('מוצר') || h.includes('תיאור')) {
        headerMap.course = i;
        console.log(`   ✅ Mapped COURSE to column ${i}`);
      }
      if (h.includes('תאריך חיוב') || h.includes('תאריך') || h.includes('date')) {
        headerMap.date = i;
        console.log(`   ✅ Mapped DATE to column ${i}`);
      }
    });

    console.log('📊 Final Header mapping:', JSON.stringify(headerMap));
  } else {
    console.log("🟠 No <th> headers found, will use default column indices");
  }

  // חילוץ נתונים מכל שורה
  const students = [];
  rows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    
    const getText = (idx) => cells[idx]?.textContent?.trim() || "";
    
    const full_name = headerMap.full_name !== undefined ? getText(headerMap.full_name) : getText(0);
    const phone = headerMap.phone !== undefined ? getText(headerMap.phone) : getText(1);
    const email = headerMap.email !== undefined ? getText(headerMap.email) : getText(2);
    const course = headerMap.course !== undefined ? getText(headerMap.course) : "";
    const rawDate = headerMap.date !== undefined ? getText(headerMap.date) : "";

    // לוג לשורות הראשונות
    if (rowIndex < 5) {
      console.log(`📝 Row ${rowIndex} data:`, { full_name, phone, email, course, rawDate });
    }

    // ולידציה משופרת
    if (full_name && 
        full_name !== "סליקת אשראי" && 
        !full_name.includes('כרטיס') && 
        !full_name.includes('שם הכרטיס') &&
        (phone || email)) {
      const parsedDate = parseDate(rawDate);
      console.log(`✅ Adding student: ${full_name} (Date: ${rawDate} → ${parsedDate})`);

      students.push({ 
        full_name, 
        phone: normalizePhone(phone), 
        email, 
        course, 
        rawDate,
        parsedDate 
      });
    } else if (full_name) {
      console.log(`⏭️ Skipping invalid row: ${full_name}`);
    }
  });
  
  console.log(`🔵 Total valid students extracted: ${students.length}`);
  console.log("🔵 ========== END parseHtmlTable ==========");
  return students;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ 
        error: 'Missing file_url parameter',
        success: false 
      }, { status: 400 });
    }

    console.log(`📥 Fetching file from: ${file_url}`);
    
    // טען את הקובץ
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ 
        error: `Failed to fetch file: ${fileResponse.status}`,
        success: false 
      }, { status: 400 });
    }

    const htmlContent = await fileResponse.text();
    console.log(`✅ File loaded successfully, size: ${htmlContent.length} bytes`);

    // פרסר את התוכן
    const students = parseHtmlTable(htmlContent);

    console.log(`🎉 Parsing complete! Found ${students.length} students`);

    return Response.json({
      success: true,
      students,
      total: students.length,
      logs: 'Check server logs for detailed parsing information'
    });

  } catch (error) {
    console.error("🔴 ERROR:", error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});