// נרמול טלפון וזיהוי משתתפת קיימת — מקור אמת אחד לכל הפונקציות שיוצרות לידים.
//
// רקע (אובחן 22.7): הנרמול הישן עבד ב"רשימה שחורה" — replace(/[\s\-\.\(\)\+]/g,'') —
// שמסירה רווח/מקף/נקודה/סוגריים/פלוס, אבל *לא* תווי בידוד כיווניות (U+2066..U+2069, U+200E/F)
// שנדבקים למספרים כשמעתיקים אותם ממקור RTL. כך נשמרו במסד ערכים כמו "⁦+972 54-674-0420⁩",
// והחיפוש לפני יצירה — שהוא השוואה מדויקת — פספס אותם ויצר כפילות.
//
// כאן הנרמול הוא "רשימה לבנה": ספרות בלבד. אותה גישה שכבר עובדת ב-Students.jsx.

export function digitsOnly(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

// הצורה הקנונית לשמירה במסד: 0XXXXXXXXX
export function toLocalPhone(raw) {
  let n = digitsOnly(raw);
  if (!n) return '';
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('972')) n = '0' + n.slice(3);
  if (n.length === 9 && n.startsWith('5')) n = '0' + n;
  return n;
}

// כל הצורות שבהן מספר עשוי להיות שמור במסד, לחיפוש exact-match.
export function phoneSearchVariants(raw) {
  const local = toLocalPhone(raw);
  if (!local) return [];
  const bare = local.startsWith('0') ? local.slice(1) : local;
  return [...new Set([local, bare, '972' + bare, '+972' + bare])];
}

// ⚠️ שום וריאנט לא יתאים לערך שמור שמכיל תווים בלתי נראים — השוואה מדויקת לא סולחת.
// לכן זו שכבת הנפילה: משיכת הרשומות והשוואת 9 הספרות האחרונות בזיכרון, אחרי נרמול *שני הצדדים*.
// מוצא גם את הרשומות ההיסטוריות המלוכלכות, בלי לגעת בנתונים.
export async function findStudentByPhone(base44, rawPhone) {
  const local = toLocalPhone(rawPhone);
  if (!local) return null;

  for (const v of phoneSearchVariants(rawPhone)) {
    const rows = await base44.asServiceRole.entities.Student.filter({ phone: v }).catch(() => []);
    if (rows && rows.length > 0) {
      console.log(`✅ נמצאה משתתפת לפי וריאנט "${v}": ${rows[0].full_name}`);
      return rows[0];
    }
  }

  const last9 = local.slice(-9);
  if (last9.length < 9) return null;

  const all = await base44.asServiceRole.entities.Student.list().catch(() => []);
  const match = (all || []).find(s => digitsOnly(s.phone).slice(-9) === last9);
  if (match) {
    console.log(`✅ נמצאה משתתפת בסריקת נפילה (טלפון שמור לא תקני: ${JSON.stringify(match.phone)}): ${match.full_name}`);
    return match;
  }
  return null;
}
