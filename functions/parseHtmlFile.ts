import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const normalizePhone = (phone) => {
  if (!phone) return "";
  return phone.replace(/\D/g, '');
};

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  console.log(`[parseDate] Input: "${dateStr}"`);
  
  const parts = dateStr.trim().split(/\s+/);
  const datePart = parts.find(p => p.includes('/'));
  
  if (!datePart) {
    console.log(`[parseDate] No date found in string`);
    return null;
  }
  
  const [day, month, year] = datePart.split('/').map(n => parseInt(n, 10));
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    console.log(`[parseDate] Invalid date parts: day=${day}, month=${month}, year=${year}`);
    return null;
  }
  
  const finalYear = year < 100 ? year + 2000 : year;
  const date = new Date(finalYear, month - 1, day);
  
  console.log(`[parseDate] Parsed: ${date.toISOString()}`);
  return date;
};

const isDateInRange = (date, startDate, endDate) => {
  if (!date) return false;
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (checkDate < start) return false;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (checkDate > end) return false;
  }
  
  return true;
};

const parseHtmlTable = (htmlContent) => {
  console.log(`[parseHtmlTable] Starting parse, content length: ${htmlContent.length}`);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  if (!doc) {
    throw new Error("Failed to parse HTML document");
  }
  
  const rows = Array.from(doc.querySelectorAll('tr'));
  console.log(`[parseHtmlTable] Found ${rows.length} rows`);
  
  if (rows.length === 0) {
    return { students: [], headers: [] };
  }
  
  let headerMap = {};
  const headerRow = rows.find(r => r.querySelectorAll('th').length > 0);
  
  if (headerRow) {
    const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
    console.log(`[parseHtmlTable] Headers found:`, headers);
    
    headers.forEach((h, i) => {
      const hLower = h.toLowerCase();
      
      if (hLower === 'לקוח/ה' || hLower === 'לקוחה' || hLower === 'לקוח' || hLower === 'שם הלקוח') {
        headerMap.full_name = i;
        console.log(`[parseHtmlTable] Mapped FULL_NAME to column ${i}: "${h}"`);
      }
      
      if (hLower.includes('טלפון')) {
        headerMap.phone = i;
        console.log(`[parseHtmlTable] Mapped PHONE to column ${i}: "${h}"`);
      }
      
      if (hLower.includes('מייל') || hLower.includes('email')) {
        headerMap.email = i;
        console.log(`[parseHtmlTable] Mapped EMAIL to column ${i}: "${h}"`);
      }
      
      if (hLower.includes('תיאור') || hLower.includes('מוצר') || hLower.includes('קורס')) {
        headerMap.description = i;
        console.log(`[parseHtmlTable] Mapped DESCRIPTION to column ${i}: "${h}"`);
      }
      
      if (hLower.includes('תאריך')) {
        headerMap.date = i;
        console.log(`[parseHtmlTable] Mapped DATE to column ${i}: "${h}"`);
      }
    });
  }
  
  console.log(`[parseHtmlTable] Final header mapping:`, headerMap);
  
  const students = [];
  
  rows.forEach((row, idx) => {
    if (row === headerRow) return;
    
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    
    const getText = (i) => cells[i]?.textContent?.trim() || "";
    
    const full_name = headerMap.full_name !== undefined ? getText(headerMap.full_name) : "";
    const phone = headerMap.phone !== undefined ? getText(headerMap.phone) : "";
    const email = headerMap.email !== undefined ? getText(headerMap.email) : "";
    const description = headerMap.description !== undefined ? getText(headerMap.description) : "";
    const rawDate = headerMap.date !== undefined ? getText(headerMap.date) : "";
    
    if (!full_name || full_name.length < 2) return;
    if (!phone && !email) return;
    if (full_name.includes('סה"כ') || full_name.includes('סליקת אשראי')) return;
    
    const parsedDate = parseDate(rawDate);
    
    students.push({
      full_name,
      phone: normalizePhone(phone),
      email,
      description,
      rawDate,
      parsedDate: parsedDate ? parsedDate.toISOString() : null
    });
  });
  
  console.log(`[parseHtmlTable] Extracted ${students.length} valid students`);
  return { students, headerMap };
};

Deno.serve(async (req) => {
  console.log("========== START parseHtmlFile ==========");
  
  try {
    const body = await req.json();
    const { file_url, startDate, endDate } = body;
    
    console.log(`[Main] Params: file_url=${file_url ? 'present' : 'missing'}, startDate=${startDate}, endDate=${endDate}`);
    
    if (!file_url) {
      return Response.json({ 
        success: false, 
        error: 'חסר פרמטר file_url' 
      }, { status: 400 });
    }
    
    console.log(`[Main] Fetching file...`);
    const fileRes = await fetch(file_url);
    
    if (!fileRes.ok) {
      return Response.json({ 
        success: false, 
        error: `שגיאה בהורדת הקובץ: ${fileRes.status}` 
      }, { status: 400 });
    }
    
    const htmlContent = await fileRes.text();
    console.log(`[Main] File loaded, size: ${htmlContent.length} bytes`);
    
    const { students: allStudents, headerMap } = parseHtmlTable(htmlContent);
    
    if (allStudents.length === 0) {
      return Response.json({
        success: false,
        error: 'לא נמצאו משתתפים בקובץ. וודא שהקובץ מכיל טבלה עם עמודת "לקוח/ה"'
      });
    }
    
    let filteredStudents = allStudents;
    
    if (startDate || endDate) {
      console.log(`[Main] Filtering by date range: ${startDate} to ${endDate}`);
      filteredStudents = allStudents.filter(s => isDateInRange(s.parsedDate, startDate, endDate));
      console.log(`[Main] After date filter: ${filteredStudents.length} students`);
    }
    
    console.log("========== END parseHtmlFile ==========");
    
    return Response.json({
      success: true,
      students: filteredStudents,
      totalFound: allStudents.length,
      totalFiltered: filteredStudents.length,
      headerMap
    });
    
  } catch (error) {
    console.error(`[Main] ERROR:`, error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});