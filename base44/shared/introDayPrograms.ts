// =====================================================
// introDayPrograms — הכלל היחיד שממפה יום היכרות לתוכנית שהוא מקדם.
// יום היכרות אינו מטרה בעצמו: מי שנרשמה אליו היא ליד לתוכנית שמאחוריו.
// הזיהוי לפי שם הקורס *או* הקטלוג בסאמיט, כי "יום היכרות 9.9" לא מכיל את
// שם התוכנית — רק הקטלוג שלו (dancefullness) מגלה לאיזו תוכנית הוא שייך.
// שני ימי היכרות באותו תאריך אינם כפילות: 9.9 יש גם לנענע וגם לתדרים.
// =====================================================

export const INTRO_DAY_PROGRAMS = [
  { match: /נענע/, program_id: '698481146122f14c8f89df73', program_name: 'נענע – בית ספר למחול ותנועה סומטית' },
  { match: /LBMS|לאבאן|ברטניי/i, program_id: '697a280406466f42ce5b27c1', program_name: 'LBMS- הכשרה בינלאומית בשיטת לאבאן ברטנייף' },
  { match: /dancefullness|תדרים/i, program_id: '69a0414f292336bd32533bd1', program_name: 'dancefullness – תדרים בתנועה' }
];

export function isIntroDayCourse(course) {
  return course?.kind === 'יום היכרות' || /יום היכרות/.test(String(course?.name || ''));
}

// לאיזו תוכנית יום ההיכרות הזה מוביל. מחזיר null כשאין התאמה ודאית —
// עדיף לא ליצור ליד מנוחש מלשייך אותו לתוכנית הלא נכונה.
export function programForIntroDay(course) {
  const haystack = `${course?.name || ''} ${course?.summit_catalog || ''}`;
  return INTRO_DAY_PROGRAMS.find((p) => p.match.test(haystack)) || null;
}

// הסטטוסים שמעידים שהמשתתפת אכן על יום ההיכרות (ולא רק ליד רופף אליו)
export const INTRO_REGISTERED_STATUSES = ['רשומה ליום היכרות', 'רשום', 'נרשם', 'היה ביום היכרות'];