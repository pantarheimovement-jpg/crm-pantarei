// פרסר לשורות הערה שנכתבות אוטומטית ע"י handleSummitPayment / handleSumitDocument.
// עוגן: "בתאריך YYYY-MM-DD" + "(₪<סכום>)" באותה שורה. טקסט חופשי בלי שניהם — מדולג.
// כלל סיווג: "זיכוי"/"ביטול הרשמה" בכל השורה גובר על תחילית "תשלום"
// (למשל: "תשלום 2 ... (₪-250) — חשבון/קבלה זיכוי / 4000" הוא זיכוי).
export function parseSummitEvents(students) {
  const events = [];
  for (const s of students || []) {
    for (const rawLine of (s.notes || '').split('\n')) {
      const line = rawLine.trim();
      const dm = line.match(/בתאריך (\d{4}-\d{2}-\d{2})/);
      const am = line.match(/\(₪\s*(-?[\d.,]+)\)/);
      if (!dm || !am) continue;
      const amount = parseFloat(am[1].replace(/,/g, ''));
      if (isNaN(amount)) continue;
      const isCredit = /זיכוי|ביטול הרשמה/.test(line);
      const isPayment = /^תשלום/.test(line);
      if (!isCredit && !isPayment) continue;
      const cm = line.match(/—\s*(?:קורס|מוצר):\s*([^—\n]+)/);
      const docm = line.match(/חשבון\/קבלה(?:\s*זיכוי)?\s*\/\s*(\d+)/);
      events.push({
        studentId: s.id,
        studentName: s.full_name,
        type: isCredit ? 'credit' : 'payment',
        date: dm[1],
        amount: isCredit ? Math.abs(amount) : amount,
        course: cm ? cm[1].trim() : null,
        docNumber: docm ? docm[1] : null
      });
    }
  }
  return events;
}