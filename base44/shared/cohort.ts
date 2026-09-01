// גזירת "שנת לימוד" (קוהורטה) ומספר תשלומים — בלתי-תלוי באזור-זמן.
//
// שנת הלימוד מתחילה בספטמבר. ההרשמה והוראות הקבע נפתחות לפניה (אוגוסט, לעיתים
// יולי), אך החיוב הראשון בספטמבר. לכן החתך הוא 1 באוגוסט: תאריך מאוגוסט ואילך
// שייך לקוהורטה של אותו ספטמבר (אוגוסט–דצמבר 2026 → "2026-2027").
//
// ⚠️ כל הגזירות כאן עובדות על המחרוזת "YYYY-MM-DD" ולא על new Date(), כדי
// שאזור-הזמן של השרת לא יזיז חודש (תאריך ב-1 בחודש בחצות UTC היה יכול
// ליפול לחודש הקודם ולשנות קוהורטה).

export const COHORT_CUTOFF_MONTH = 8; // אוגוסט

/** מחלץ { y, m } ממחרוזת תאריך ISO — ללא new Date(). */
export function ymFromString(dateStr: string | null | undefined): { y: number; m: number } | null {
  const match = String(dateStr || '').match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) };
}

/** "2026-09-15" → "2026-2027" · "2026-07-15" → "2025-2026" */
export function cohortFromDate(dateStr: string | null | undefined): string | null {
  const ym = ymFromString(dateStr);
  if (!ym) return null;
  const startYear = ym.m >= COHORT_CUTOFF_MONTH ? ym.y : ym.y - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * הקוהורטה של הוראת קבע. מקור עיקרי: תאריך החיוב הראשון בפועל.
 * נפילה: Date_Start (הו"ק שטרם חויבה).
 * מסמן needsReview כשהגזירה אינה חד-משמעית — ואז מכריעים ידנית:
 *   · תאריך ביולי — צמוד לגבול החתך
 *   · תאריך ההתחלה והחיוב הראשון נופלים לקוהורטות שונות
 */
export function resolveCohort(firstChargeDate: string | null, dateStart: string | null): {
  cohort: string | null;
  source: 'first-charge' | 'date-start' | null;
  needsReview: boolean;
  reviewReason: string | null;
} {
  const basis = firstChargeDate || dateStart;
  const cohort = cohortFromDate(basis);
  if (!cohort) return { cohort: null, source: null, needsReview: true, reviewReason: 'אין תאריך לגזירת שנת לימוד' };

  const source = firstChargeDate ? 'first-charge' : 'date-start';
  const ym = ymFromString(basis)!;

  if (ym.m === 7) {
    return { cohort, source, needsReview: true, reviewReason: `התאריך (${basis}) ביולי — צמוד לגבול שנת הלימוד` };
  }
  if (firstChargeDate && dateStart) {
    const startCohort = cohortFromDate(dateStart);
    if (startCohort && startCohort !== cohort) {
      return { cohort, source, needsReview: true, reviewReason: `החיוב הראשון (${firstChargeDate} → ${cohort}) ותאריך ההתחלה (${dateStart} → ${startCohort}) בשנים שונות` };
    }
  }
  return { cohort, source, needsReview: false, reviewReason: null };
}

/**
 * מספר תשלומי ההו"ק — הפרש חודשים כולל, מהמחרוזות בלבד.
 * ⚠️ קירוב ±1: השדה Recurrence (מספר המחזורים המדויק) אינו חוזר מ-
 * listforcustomer, ולכן הספירה נגזרת מטווח התאריכים. הו"ק שמתחילה באמצע
 * החודש עשויה להיספר בחסר חודש (נטע: 24.08→01.07 יוצא 11 ולא 12).
 * מדויק דיו לתחזית, לא לחיוב.
 */
export function monthsInclusive(a: string | null, b: string | null): number | null {
  const s = ymFromString(a), e = ymFromString(b);
  if (!s || !e) return null;
  return (e.y - s.y) * 12 + (e.m - s.m) + 1;
}