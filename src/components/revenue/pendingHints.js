// חילוץ רמזים מיומן ההערות — לעין האנושית בלבד. ההערות לא אמינות מספיק
// לחלוקה אוטומטית, אבל השורות "— קורס: X" / "— מוצר: X" הן הרמז הטוב ביותר
// לאיזה קורס לשייך את הכסף.
export const NON_COURSE_KEYWORDS = [
  'השכרת הסטודיו',
  'השכרה',
  'תרומה',
  'פשוט רוצה לפרגן',
  'הכוריאוגרפים',
  'יום טיפולים קהילתי',
  'בדיקות מערכת'
];

export const NON_COURSE_BUCKET_NAME = 'הכנסות לא-קורסיות / השכרות';

export function extractProductHints(notes) {
  if (!notes) return [];
  const found = [];
  const re = /(?:קורס|מוצר):\s*([^—\n{]+)/g;
  let m;
  while ((m = re.exec(notes)) !== null) {
    const name = m[1].trim();
    if (name && !found.includes(name)) found.push(name);
  }
  return found.slice(0, 3);
}

export function looksNonCourse(hints, notes) {
  const haystack = [...hints, notes || ''].join(' ');
  return NON_COURSE_KEYWORDS.some(k => haystack.includes(k));
}