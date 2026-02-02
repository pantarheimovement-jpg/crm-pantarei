import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
// שימוש ב-deno-dom-wasm שהיא הגרסה היציבה והמהירה ביותר ל-Deno
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

// --- Helper Functions ---

const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/\D/g, '');
};

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // ניקוי רווחים מיותרים
  let cleanDate = dateStr.trim();
  
  // הפיצול מטפל במקרים כמו "07:50 01/02/2026" ע"י פיצול לפי רווחים
  const parts = cleanDate.split(/\s+/);
  
  // חיפוש החלק שמכיל "/" (התאריך עצמו)
  const datePart = parts.find(p => p.includes('/'));

  if (datePart) {
      // פירוק ליום, חודש, שנה
      const [day, month, year] = datePart.split('/').map(n => parseInt(n, 10));
      
      // ווידוא שהמספרים תקינים
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          let finalYear = year;
          // טיפול בשנה מקוצרת (26 -> 2026)
          if (finalYear < 100) finalYear += 2000;
          
          // יצירת אובייקט Date (חודשים ב-JS מתחילים מ-0)
          const d = new Date(finalYear, month - 1, day);
          return d; 
      }
  }
  
  // Fallback למקרה הסטנדרטי
  return new Date(dateStr);
};

// --- Main Parsing Logic ---

const parseHtmlTable = (htmlContent, startDate, endDate) => {
  console.log(`🔵 Start Parsing. Filter Range: ${startDate || 'All'} -> ${endDate || 'All'}`);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  if (!doc) {
      throw new Error("Critical Error: Failed to initialize DOMParser document.");
  }

  const rows = Array.from(doc.querySelectorAll('tr'));
  console.log(`📄 Found ${rows.length} table rows.`);

  if (rows.length === 0) return [];

  // 1. זיהוי כותרות (Headers)
  let headerMap = {};
  
  // מנסה למצוא שורה ראשונה עם th, או לוקח את השורה הראשונה בטבלה
  const headerRow = rows.find(r => r.querySelectorAll('th').length > 0) || rows[0];

  if (headerRow) {
    const cells = headerRow.querySelectorAll('th').length > 0 
        ? headerRow.querySelectorAll('th') 
        : headerRow.querySelectorAll('td'); // תמיכה בטבלאות ללא th

    const headers = Array.from(cells).map(c => c.textContent.trim().toLowerCase());
    
    headers.forEach((h, i) => {
      // זיהוי עמודת שם (כולל "לקוחה", "משתתף")
      if (h === 'לקוחה' || h === 'לקוח' || h === 'משתתף' || h === 'שם הלקוח') {
          headerMap.full_name = i;
      } else if (h.includes('שם') && !h.includes('כרטיס') && !h.includes('סליקה') && headerMap.full_name === undefined) {
          headerMap.full_name = i;
      }
      
      if (h.includes('טלפון') || h.includes('phone') || h.includes('נייד')) headerMap.phone = i;
      if (h.includes('מייל') || h.includes('email') || h.includes('דוא"ל')) headerMap.email = i;
      if (h.includes('קורס') || h.includes('סדנא') || h.includes('מוצר')) headerMap.course = i;
      if (h.includes('תאריך') || h.includes('date')) headerMap.date = i;
    });
  }

  // 2. הכנת טווחי תאריכים לסינון
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  // איפוס שעות כדי להשוות תאריכים נטו
  if (start) start.setHours(0,0,0,0);
  if (end) end.setHours(23,59,59,999);

  const students = [];

  // 3. מעבר על השורות וזיהוי נתונים
  rows.forEach((row, idx) => {
    // דילוג על שורת הכותרת
    if (row === headerRow) return;

    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    
    const getText = (i) => cells[i]?.textContent?.trim() || "";
    
    // אם לא זוהה מיפוי, ברירת מחדל לאינדקסים 0,1,2
    const nameIdx = headerMap.full_name !== undefined ? headerMap.full_name : 0;
    
    const full_name = getText(nameIdx);
    const phone = headerMap.phone !== undefined ? getText(headerMap.phone) : getText(1);
    const email = headerMap.email !== undefined ? getText(headerMap.email) : getText(2);
    const course = headerMap.course !== undefined ? getText(headerMap.course) : "";
    const rawDate = headerMap.date !== undefined ? getText(headerMap.date) : "";

    // ולידציה: שם קיים, לא "סליקת אשראי", ויש פרטי קשר
    const isValidName = full_name && full_name !== "סליקת אשראי" && !full_name.includes('מערכת') && !full_name.includes('סה"כ');
    
    if (isValidName && (phone || email)) {
        
        const parsedDateObj = parseDate(rawDate);
        
        // --- לוגיקת סינון (Backend Filtering) ---
        let include = true;
        
        if (parsedDateObj && !isNaN(parsedDateObj)) {
            const checkDate = new Date(parsedDateObj);
            checkDate.setHours(0,0,0,0);
            
            if (start && checkDate < start) include = false;
            if (end && checkDate > end) include = false;
        } else if (start || end) {
            // אם יש סינון תאריכים אבל לתשורה אין תאריך תקין - נסנן אותה ליתר ביטחון
            // או שנחליט לכלול. כאן הגישה השמרנית: לא לכלול.
             include = false;
        }

        if (include) {
             students.push({ 
                full_name, 
                phone: normalizePhone(phone), 
                email, 
                course, 
                rawDate,
                parsedDate: parsedDateObj ? parsedDateObj.toISOString() : null
            });
        }
    }
  });

  return students;
};

// --- Deno Server Handler ---

Deno.serve(async (req) => {
  try {
    // 1. קריאת הפרמטרים מהבקשה
    const body = await req.json();
    const { file_url, startDate, endDate } = body;

    if (!file_url) {
        return Response.json({ error: 'Missing file_url parameter', success: false }, { status: 400 });
    }

    // 2. הורדת הקובץ
    console.log(`📥 Fetching file...`);
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
    
    const htmlContent = await fileRes.text();
    console.log(`✅ File loaded (${htmlContent.length} bytes). Processing...`);

    // 3. ביצוע הפרסור והסינון
    const students = parseHtmlTable(htmlContent, startDate, endDate);

    console.log(`🎉 Success: Returning ${students.length} students.`);

    return Response.json({
      success: true,
      students,
      count: students.length
    });

  } catch (error) {
    console.error('🔴 Server Error:', error);
    return Response.json({ 
        success: false, 
        error: error.message,
        stack: error.stack 
    }, { status: 500 });
  }
});