import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertCircle, Loader2, History, Link2, Plus, X, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportStudents({ onImportComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // State for unmatched students dialog
  const [unmatchedStudents, setUnmatchedStudents] = useState([]);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [existingStudents, setExistingStudents] = useState([]);
  const [studentMatches, setStudentMatches] = useState({});
  const [pendingFileName, setPendingFileName] = useState("");

  const normalizePhone = (phone) => {
    if (!phone) return "";
    return phone.replace(/\D/g, '');
  };

  const checkDuplicate = (student, existingList) => {
    const normalizedPhone = normalizePhone(student.phone);
    
    return existingList.find(existing => {
      // בדיקת מייל זהה
      if (student.email && existing.email && 
          student.email.toLowerCase() === existing.email.toLowerCase()) {
        return true;
      }
      
      // בדיקת טלפון זהה
      if (normalizedPhone && normalizePhone(existing.phone) === normalizedPhone) {
        return true;
      }
      
      // בדיקת שם דומה מאוד (>90% דמיון)
      if (student.full_name && existing.full_name) {
        const name1 = student.full_name.toLowerCase().trim();
        const name2 = existing.full_name.toLowerCase().trim();
        if (name1 === name2) return true;
      }
      
      return false;
      });
      };

      const parseDate = (dateStr) => {
        if (!dateStr) {
          console.log('⚠️ Empty date string');
          return null;
        }

        console.log(`🔄 Parsing date: "${dateStr}"`);

        // טיפול בפורמט "HH.MM dd/mm/yyyy" או "dd/mm/yyyy HH:MM"
        let cleanDate = dateStr.trim();

        // אם יש שעה, הסר אותה
        if (cleanDate.includes(' ')) {
          const parts = cleanDate.split(' ');
          console.log(`   Split parts:`, parts);
          // מצא את החלק שנראה כמו תאריך (מכיל /)
          cleanDate = parts.find(p => p.includes('/')) || parts[parts.length - 1];
          console.log(`   Clean date after removing time: "${cleanDate}"`);
        }

        // פרסינג של dd/mm/yyyy
        const dateParts = cleanDate.split(/[\/\-\.]/);
        console.log(`   Date parts:`, dateParts);

        if (dateParts.length === 3) {
          let day = parseInt(dateParts[0], 10);
          let month = parseInt(dateParts[1], 10) - 1; // JS months are 0-11
          let year = parseInt(dateParts[2], 10);
          if (year < 100) year += 2000;

          const parsed = new Date(year, month, day);
          console.log(`   ✅ Parsed result: ${parsed} (valid: ${!isNaN(parsed)})`);
          if (!isNaN(parsed)) return parsed;
        }

        console.log(`   ⚠️ Fallback to Date constructor`);
        return new Date(dateStr); // fallback
      };

      const parseHtmlTable = (htmlContent) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const rows = Array.from(doc.querySelectorAll('tr'));

        if (rows.length === 0) return [];

        // זיהוי headers
        let headerMap = {};
        const headerRow = rows.find(r => r.querySelectorAll('th').length > 0);

        if (headerRow) {
          const headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
          console.log('🔍 Detected headers:', headers); // לדיבוג

          headers.forEach((h, i) => {
            // --- תיקון קריטי: תמיכה ב-"לקוחה", "לקוח", "משתתף" ---
            if (h === 'לקוחה' || h === 'לקוח' || h === 'משתתף' || h === 'שם הלקוח' || h === 'שם לקוח') {
              headerMap.full_name = i;
              console.log(`✅ Found name column at index ${i}: "${h}"`);
            }
            else if (h.includes('שם') && !h.includes('כרטיס') && !h.includes('סליקה') && !h.includes('קורס') && headerMap.full_name === undefined) {
              headerMap.full_name = i;
              console.log(`✅ Found name column (generic) at index ${i}: "${h}"`);
            }
            // ---------------------------------------------------------

            if (h.includes('טלפון') || h.includes('phone') || h.includes('נייד')) headerMap.phone = i;
            if (h.includes('מייל') || h.includes('email') || h.includes('דוא"ל')) headerMap.email = i;
            if (h.includes('קורס') || h.includes('סדנא') || h.includes('מוצר') || h.includes('תיאור')) headerMap.course = i;
            if (h.includes('תאריך חיובם') || h.includes('תאריך') || h.includes('date')) headerMap.date = i;
          });

          console.log('📊 Header mapping:', headerMap);
        }
    
    // חילוץ נתונים מכל שורה
    const students = [];
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 0) return;
      
      const getText = (idx) => cells[idx]?.textContent?.trim() || "";
      
      const full_name = headerMap.full_name !== undefined ? getText(headerMap.full_name) : getText(0);
      const phone = headerMap.phone !== undefined ? getText(headerMap.phone) : getText(1);
      const email = headerMap.email !== undefined ? getText(headerMap.email) : getText(2);
      const course = headerMap.course !== undefined ? getText(headerMap.course) : "";
      const rawDate = headerMap.date !== undefined ? getText(headerMap.date) : "";

      // ולידציה משופרת: וודא ששם המשתתף אינו "סליקת אשראי" או טקסט לא רלוונטי
      if (full_name && 
          full_name !== "סליקת אשראי" && 
          !full_name.includes('כרטיס') && 
          !full_name.includes('שם הכרטיס') &&
          (phone || email)) {
        const parsedDate = parseDate(rawDate);
        console.log(`📅 Student: ${full_name}, Raw date: "${rawDate}", Parsed: ${parsedDate}`);

        students.push({ 
          full_name, 
          phone, 
          email, 
          course, 
          rawDate,
          parsedDate 
        });
      }
    });
    
    return students;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResults(null);
    setPendingFileName(file.name);

    try {
      let students = [];
      
      // בדיקה אם זה HTML - parsing מקומי
      if (file.type === "text/html" || file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        const text = await file.text();
        students = parseHtmlTable(text);
        
        if (students.length === 0) {
          throw new Error("לא נמצאו נתונים בטבלה");
        }

        // --- סינון לפי תאריכים ---
        if (startDate || endDate) {
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          // איפוס שעות להשוואה הוגנת
          if (start) start.setHours(0, 0, 0, 0);
          if (end) end.setHours(23, 59, 59, 999);

          const beforeFilter = students.length;
          console.log(`🎯 Filtering ${beforeFilter} students by date range: ${startDate} to ${endDate}`);

          students = students.filter(s => {
            if (!s.parsedDate || isNaN(s.parsedDate)) {
              console.log(`❌ Invalid date for ${s.full_name}: "${s.rawDate}"`);
              return false; // דלג על רשומות ללא תאריך תקין
            }

            const studentDate = new Date(s.parsedDate);
            studentDate.setHours(0, 0, 0, 0);

            if (start && studentDate < start) {
              console.log(`⏭️ ${s.full_name}: ${studentDate.toLocaleDateString()} < ${start.toLocaleDateString()} - SKIP`);
              return false;
            }
            if (end && studentDate > end) {
              console.log(`⏭️ ${s.full_name}: ${studentDate.toLocaleDateString()} > ${end.toLocaleDateString()} - SKIP`);
              return false;
            }
            console.log(`✅ ${s.full_name}: ${studentDate.toLocaleDateString()} - INCLUDE`);
            return true;
          });

          console.log(`סונן ${beforeFilter} -> ${students.length} משתתפים`);

          if (students.length === 0) {
            throw new Error(`לא נמצאו משתתפים בטווח התאריכים שנבחר (מתוך ${beforeFilter} רשומות בקובץ)`);
          }
        }
        // ---------------------------

        setIsUploading(false);
        setIsProcessing(true);
      } else {
        // PDF/Excel/CSV - שליחה ל-API
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        const file_url = uploadResult.file_url;
        
        setIsUploading(false);
        setIsProcessing(true);

        // חילוץ נתונים מהקובץ
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              students: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    full_name: { type: "string", description: "שם מלא של המשתתף" },
                    phone: { type: "string", description: "מספר טלפון" },
                    email: { type: "string", description: "כתובת מייל" },
                    course: { type: "string", description: "שם הקורס או תחום עניין" },
                    status: { type: "string", description: "סטטוס - ליד חדש, רשום, וכו'" }
                  }
                }
              }
            }
          }
        });

        if (extractResult.status === "error") {
          throw new Error(extractResult.details || "שגיאה בחילוץ נתונים");
        }

        students = extractResult.output?.students || [];
        
        if (students.length === 0) {
          throw new Error("לא נמצאו משתתפים בקובץ");
        }
      }

      // טען את כל המשתתפים הקיימים
      const allStudents = await base44.entities.Student.list();
      setExistingStudents(allStudents);

      // בדוק אילו משתתפים כבר קיימים
      const duplicates = [];
      const newStudents = [];

      for (const student of students) {
        if (!student.full_name?.trim()) continue;

        const duplicate = checkDuplicate(student, allStudents);

        if (duplicate) {
          duplicates.push({ ...student, existingStudent: duplicate });
        } else {
          newStudents.push(student);
        }
      }

      // אם יש דופליקטים, הצג דיאלוג
      if (duplicates.length > 0) {
        setUnmatchedStudents(duplicates);
        setStudentMatches({});
        setShowMatchDialog(true);
        setIsProcessing(false);
        // שמור את המשתתפים החדשים לעיבוד מאוחר יותר
        setResults({ newStudents, duplicates, fileName: file.name });
      } else {
        // עבד את כל המשתתפים ישירות
        await processStudents(newStudents, [], file.name);
      }

    } catch (err) {
      setError(err.message || "שגיאה בעיבוד הקובץ");
      setIsUploading(false);
      setIsProcessing(false);
    }

    e.target.value = "";
  };

  const handleMatchSelection = (studentName, value) => {
    setStudentMatches(prev => ({
      ...prev,
      [studentName]: value
    }));
  };

  const handleConfirmMatches = async () => {
    setShowMatchDialog(false);
    setIsProcessing(true);

    try {
      const { newStudents, duplicates, fileName } = results;

      // סנן רק את מי שנבחר "skip"
      const finalNew = [...newStudents];

      for (const dup of duplicates) {
        const matchChoice = studentMatches[dup.full_name];
        if (matchChoice === "add") {
          finalNew.push(dup);
        }
        // אם "skip" - לא עושים כלום
      }

      await processStudents(finalNew, duplicates.filter(d => studentMatches[d.full_name] !== "add"), fileName);
    } catch (err) {
      setError(err.message || "שגיאה בעיבוד");
    }

    setIsProcessing(false);
  };

  const processStudents = async (studentsToAdd, skippedStudents, fileName) => {
    const processResults = {
      added: [],
      skipped: [],
      errors: []
    };

    // הוסף משתתפים חדשים
    for (const student of studentsToAdd) {
      try {
        const studentData = {
          full_name: student.full_name?.trim(),
          phone: student.phone || "",
          email: student.email || "",
          status: "רשום", // משתתפים ששילמו דרך Summit
          interest_area: student.course || ""
        };

        await base44.entities.Student.create(studentData);

        processResults.added.push({ 
          name: student.full_name, 
          action: "נוסף למערכת" 
        });
      } catch (err) {
        processResults.errors.push({ name: student.full_name, error: err.message });
      }
    }

    processResults.skipped = skippedStudents.map(s => ({
      name: s.full_name,
      reason: "משתתף קיים"
    }));

    setResults({
      ...processResults,
      showSuccess: true
    });
    setIsProcessing(false);

    // רענן את רשימת המשתתפים בדף הראשי
    if (onImportComplete) {
      onImportComplete();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          ייבוא משתתפים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">
          העלה קובץ HTML, PDF או Excel והמערכת תייבא את המשתתפים אוטומטית.
        </p>

        {/* סינון לפי תאריכים */}
        <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline ml-1" />
              מתאריך
            </label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline ml-1" />
              עד תאריך
            </label>
            <input 
              type="date" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <div className="col-span-2 text-sm text-blue-700 bg-blue-100 p-2 rounded">
              ✓ יבוא רק משתתפים מ-{startDate || '...'} עד {endDate || '...'}
            </div>
          )}
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept=".html,.htm,.pdf,.xlsx,.xls,.csv,text/html,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleFileUpload}
            className="hidden"
            id="student-upload"
            disabled={isUploading || isProcessing}
          />
          <label 
            htmlFor="student-upload" 
            className={`cursor-pointer flex flex-col items-center gap-3 ${(isUploading || isProcessing) ? 'opacity-50' : ''}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
                <span className="text-gray-600">מעלה קובץ...</span>
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <span className="text-blue-600 font-medium">מעבד את הקובץ...</span>
                <span className="text-gray-500 text-sm">זה יכול לקחת כמה שניות</span>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400" />
                <span className="text-gray-600">לחץ להעלאת קובץ</span>
                <span className="text-gray-400 text-sm">תומך ב-HTML, PDF, Excel</span>
              </>
            )}
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">שגיאה</h4>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {results?.showSuccess && (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
              <h4 className="font-bold text-green-800 text-lg mb-3 flex items-center gap-2">
                <Check className="w-6 h-6" />
                הייבוא הושלם בהצלחה!
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ {results.added.length} משתתפים חדשים נוספו</p>
                {results.skipped.length > 0 && (
                  <p>⏭️ {results.skipped.length} משתתפים קיימים דולגו</p>
                )}
                {results.errors.length > 0 && (
                  <p>⚠️ {results.errors.length} שגיאות</p>
                )}
              </div>
            </div>

            {results.added.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">משתתפים שנוספו:</h4>
                <ul className="text-sm text-blue-700 space-y-1 max-h-40 overflow-auto">
                  {results.added.map((item, i) => (
                    <li key={i}>• {item.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.skipped.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">משתתפים שדולגו (קיימים):</h4>
                <ul className="text-sm text-orange-700 space-y-1 max-h-40 overflow-auto">
                  {results.skipped.map((item, i) => (
                    <li key={i}>• {item.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">שגיאות:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {results.errors.map((item, i) => (
                    <li key={i}>• {item.name}: {item.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* דיאלוג משתתפים קיימים */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              משתתפים קיימים זוהו
            </DialogTitle>
          </DialogHeader>
          
          <p className="text-sm text-gray-600 mb-4">
            המשתתפים הבאים כבר קיימים במערכת. בחר מה לעשות עם כל אחד מהם.
          </p>

          <div className="space-y-4">
            {unmatchedStudents.map((student, index) => (
              <div key={index} className="border rounded-lg p-3 bg-orange-50">
                <p className="font-medium text-gray-900">{student.full_name}</p>
                <p className="text-sm text-gray-600">
                  טלפון: {student.phone || "לא צוין"} | מייל: {student.email || "לא צוין"}
                </p>
                <p className="text-xs text-orange-700 mb-2">
                  ⚠️ נמצא משתתף דומה: {student.existingStudent.full_name}
                </p>
                <Select
                  value={studentMatches[student.full_name] || ""}
                  onValueChange={(value) => handleMatchSelection(student.full_name, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר פעולה..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">
                      <span className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        דלג (אל תוסיף)
                      </span>
                    </SelectItem>
                    <SelectItem value="add">
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        הוסף בכל זאת
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleConfirmMatches}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 ml-2" />
              אשר והמשך
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowMatchDialog(false);
                setResults(null);
              }}
            >
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}