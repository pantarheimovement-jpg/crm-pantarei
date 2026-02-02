import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
// שינוי לייבוא יציב יותר עבור Deno
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/\D/g, '');
};

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  let cleanDate = dateStr.trim();
  console.log(`Original date string: "${cleanDate}"`);

  // טיפול במקרה של "HH:MM DD/MM/YYYY" (לדוגמה: 07:50 01/02/2026)
  // נחפש חלק שמכיל "/"
  const parts = cleanDate.split(/\s+/); // רווח אחד או יותר
  const datePart = parts.find(p => p.includes('/'));

  if (datePart) {
      console.log(`Extracted date part: "${datePart}"`);
      const [day, month, year] = datePart.split('/').map(n => parseInt(n, 10));
      
      // ולידציה בסיסית
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          // חודש ב-JS הוא 0-11
          let finalYear = year;
          if (finalYear < 100) finalYear += 2000;
          
          const d = new Date(finalYear, month - 1, day);
          // נחזיר בפורמט ISO כדי שהקליינט יוכל לקרוא את זה בקלות
          return d.toISOString();
      }
  }

  console.log('⚠️ Failed to parse date via robust method, falling back to new Date()');
  return new Date(dateStr).toISOString();
};

const parseHtmlTable = (htmlContent) => {
  console.log("Parsing HTML content...");
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  if (!doc) {
      throw new Error("Failed to parse HTML document");
  }

  const rows = Array.from(doc.querySelectorAll('tr'));
  console.log(`Found ${rows.length} rows`);

  if (rows.length === 0) return [];

  let headerMap = {};
  // נסה למצוא שורה עם th, אם אין, חפש שורה ראשונה עם td
  const headerRow = rows.find(r => r.querySelectorAll('th').length > 0) || rows[0];

  if (headerRow) {
    const cells = headerRow.querySelectorAll('th').length > 0 
        ? headerRow.querySelectorAll('th') 
        : headerRow.querySelectorAll('td');

    const headers = Array.from(cells).map(c => c.textContent.trim().toLowerCase());
    console.log('Headers:', headers);

    headers.forEach((h, i) => {
      // זיהוי שם
      if (h.includes('לקוח') || h === 'משתתף' || (h.includes('שם') && !h.includes('כרטיס'))) {
           headerMap.full_name = i;
      }
      
      if (h.includes('טלפון') || h.includes('phone') || h.includes('נייד')) headerMap.phone = i;
      if (h.includes('מייל') || h.includes('email')) headerMap.email = i;
      if (h.includes('קורס') || h.includes('סדנא') || h.includes('מוצר')) headerMap.course = i;
      if (h.includes('תאריך') || h.includes('date')) headerMap.date = i;
    });
  }

  const students = [];
  rows.forEach((row, idx) => {
    // דלג על שורת כותרת אם זוהתה
    if (row === headerRow) return;

    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    
    const getText = (i) => cells[i]?.textContent?.trim() || "";
    
    // אם לא זוהה מיפוי שם, נסה עמודה 0 כברירת מחדל
    const nameIdx = headerMap.full_name !== undefined ? headerMap.full_name : 0;

    const full_name = getText(nameIdx);
    const phone = headerMap.phone !== undefined ? getText(headerMap.phone) : getText(1);
    const email = headerMap.email !== undefined ? getText(headerMap.email) : getText(2);
    const course = headerMap.course !== undefined ? getText(headerMap.course) : "";
    const rawDate = headerMap.date !== undefined ? getText(headerMap.date) : "";

    // ולידציה קריטית: סינון "סליקת אשראי" ושורות ריקות
    if (full_name && 
        full_name !== "סליקת אשראי" && 
        !full_name.includes('מערכת') &&
        !full_name.includes('סה"כ') &&
        (phone || email)) {
            
      students.push({ 
        full_name, 
        phone: normalizePhone(phone), 
        email, 
        course, 
        rawDate,
        parsedDate: parseDate(rawDate) 
      });
    }
  });

  return students;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // אימות משתמש (אופציונלי, תלוי בהגדרות שלך)
    // const user = await base44.auth.me(); 

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'Missing file_url' }, { status: 400 });
    }

    console.log(`Fetching file: ${file_url}`);
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) throw new Error(`Fetch failed: ${fileRes.status}`);
    
    const htmlContent = await fileRes.text();
    const students = parseHtmlTable(htmlContent);

    return Response.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error('Error processing file:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});