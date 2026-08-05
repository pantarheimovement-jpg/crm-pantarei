// =====================================================
// sumitProducts — שכבת ההחלטה המשותפת: האם מוצר מסאמיט שלא זוהה
// אמור לפתוח קורס אוטומטית, או להמתין לשיוך ידני בתיבת הנכנסות.
//
// ההחלטה (עינת, 05.08.2026): עדיף כמה קורסי זבל על פני חיכוך של שיוך ידני.
// לכן ברירת המחדל היא פתיחה אוטומטית — למעט רשימת חריגים מוגדרת, שהם
// מוצרים שאינם קורס מבחינה עסקית ולכן לעולם לא ייפתחו כקורס.
// =====================================================

// חריגים — מוצרים שלא פותחים קורס אוטומטית, אלא ממתינים לשיוך בקליק.
// ההתאמה היא לפי הכלה בשם המוצר או בשם הקטלוג, ללא תלות במרכאות/רווחים.
const NO_AUTO_COURSE_KEYWORDS = [
  'בדיקות מערכת',
  'יום טיפולים קהילתי',
  'השכרת הסטודיו',
  'כרטיסייה לשני שיעורי ערב',
  'מנוי שנתי לכל האירועים המיוחדים',
  'פשוט רוצה לפרגן'
];

export function normalizeProductText(s) {
  return String(s || '').replace(/["״'׳]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isNoAutoCourseProduct(productName, catalogName) {
  const haystack = `${normalizeProductText(productName)} ${normalizeProductText(catalogName)}`;
  return NO_AUTO_COURSE_KEYWORDS.some((k) => haystack.includes(normalizeProductText(k)));
}

// סוג המיקל נגזר מהשם או מהקטלוג — יום היכרות נשאר יום היכרות ולא הופך לקורס
// רגיל. הקטלוג חשוב: מוצר בקטלוג "ימי היכרות נענע" הוא יום היכרות גם אם שמו
// לא מכיל את המילה, ורק כך נרשמות נשארות לידים ולא הופכות ללקוחות (05.08.2026).
export function inferCourseKind(productName, catalogName) {
  const haystack = `${productName || ''} ${catalogName || ''}`;
  return /היכרות/.test(haystack) ? 'יום היכרות' : 'קורס';
}

// פותח קורס חדש ממוצר סאמיט שלא זוהה. מחזיר את הקורס, או null אם המוצר
// נמצא ברשימת החריגים / אין שם מוצר / הפתיחה נכשלה.
export async function autoCreateCourseFromProduct(base44, { productName, catalogName, amount }) {
  if (!productName) return null;
  if (isNoAutoCourseProduct(productName, catalogName)) return null;

  try {
    const created = await base44.asServiceRole.entities.Course.create({
      name: productName,
      type: 'קורס קבוע',
      kind: inferCourseKind(productName, catalogName),
      status: 'פתוח להרשמה',
      current_students: 0,
      ...(catalogName ? { summit_catalog: catalogName } : {}),
      ...(amount ? { price_early: Math.abs(Number(amount)) || undefined } : {}),
      description: `נפתח אוטומטית מקליטת תשלום בסאמיט (${new Date().toISOString().slice(0, 10)}) — יש להשלים מועדים, מחירים ופרטים`
    });
    return created || null;
  } catch (err) {
    console.error('⚠️ autoCreateCourseFromProduct failed (non-fatal):', err.message);
    return null;
  }
}