import { 
  Sparkles, LayoutDashboard, Users, GraduationCap, CheckSquare, 
  Mail, BarChart3, Settings, PartyPopper, Upload, Globe, MessageSquare
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'ברוכה הבאה למערכת! 🌸',
    content: 'המערכת מנהלת את כל הלידים, הקורסים, השיחות, והדיוור שלך.\nבואי נעבור יחד על כל חלק.',
    icon: Sparkles,
    iconColor: 'text-[#6D436D]',
    position: 'center',
    highlightSelector: null,
    navigateTo: null,
  },

  // דשבורד
  {
    id: 'dashboard',
    title: 'דשבורד — מבט-על',
    content: 'בדשבורד את רואה כמה לידים, רשומים, ויחס המרה.\nכל מספר לחיץ ומוביל לרשימה מסוננת.',
    tip: 'הכרטיסים הצבעוניים למעלה מראים התראות שדורשות תשומת לב — לחצי עליהם!',
    icon: LayoutDashboard,
    iconColor: 'text-emerald-600',
    position: 'bottom',
    navigateTo: '/PipelineDashboard',
  },

  // משתתפים 3a, 3b
  {
    id: 'students-overview',
    title: 'משתתפים — ניהול לידים ורשומים (3א)',
    content: 'כאן מנהלים את כל המשתתפים והלידים.\nחיפוש לפי שם/טלפון/מייל, סינון לפי סטטוס וקורס.',
    tip: 'תצוגת כרטיסים או טבלה — בחרי מה נוח לך.',
    icon: Users,
    iconColor: 'text-[#D29486]',
    position: 'bottom',
    navigateTo: '/Students',
  },
  {
    id: 'students-status',
    title: 'משתתפים — סטטוסים וקורסים (3ב)',
    content: 'לכל משתתף יש סטטוס נפרד לכל קורס.\nשינוי שיחה ל"לא רלוונטי" משפיע רק על הקורס הספציפי.',
    tip: 'לחצי על כפתור הסטטוס הסגול ליד כל קורס כדי לשנות סטטוס.',
    icon: Users,
    iconColor: 'text-[#D29486]',
    position: 'bottom',
    navigateTo: '/Students',
  },

  // קורסים
  {
    id: 'courses',
    title: 'קורסים — ניהול והרשמה',
    content: 'כאן מנהלים קורסים, סטטוסים, מונים.\nלחיצה על קורס מעבירה לדף הייעודי שלו.',
    tip: 'כשקורס עובר ל"פתוח להרשמה" — נוצרות שיחות בדיקה אוטומטית ללידים רלוונטיים.',
    icon: GraduationCap,
    iconColor: 'text-teal-600',
    position: 'bottom',
    navigateTo: '/Courses',
  },

  // שיחות ומשימות
  {
    id: 'tasks',
    title: 'שיחות ופגישות — מעקב יומי',
    content: 'כאן עוקבים אחרי שיחות היכרות, ניסיונות שיחה, ומשימות.\nלכל שיחה יש תג קורס סגול לזיהוי מהיר.',
    tip: 'הסטטיסטיקות למעלה לחיצות — כל אחת מסננת את הרשימה.',
    icon: CheckSquare,
    iconColor: 'text-blue-600',
    position: 'bottom',
    navigateTo: '/Tasks',
  },

  // ניוזלטר 6a, 6b, 6c
  {
    id: 'newsletter-overview',
    title: 'ניוזלטר — ניהול מנויים (6א)',
    content: 'מערכת דיוור מלאה: ניהול מנויים בקבוצות,\nייבוא מ-CSV או העתק-הדבק, וסנכרון עם ה-CRM.',
    tip: 'מנויים ומשתתפים הם רשימות נפרדות — ניתן לייבא ביניהן.',
    icon: Mail,
    iconColor: 'text-[#9B59B6]',
    position: 'bottom',
    navigateTo: '/NewsletterManager',
  },
  {
    id: 'newsletter-send',
    title: 'ניוזלטר — שליחת דיוור (6ב)',
    content: 'בוחרים ערוץ (מייל/ווצאפ/שניהם), תבנית, קבוצה ושולחים.\nתבניות Anti-Spam מומלצות להגעה לתיבת הדואר.',
    tip: 'תמיד שלחי מייל ניסיון לעצמך לפני שליחה כללית! קישור הסרה מתווסף אוטומטית.',
    icon: Mail,
    iconColor: 'text-[#9B59B6]',
    position: 'bottom',
    navigateTo: '/NewsletterManager',
  },
  {
    id: 'newsletter-import',
    title: 'ניוזלטר — ייבוא מנויים (6ג)',
    content: 'ייבוא מ-CSV או העתק-הדבק.\nהורידי CSV לדוגמה לבדיקה, בחרי קבוצה ומייבאים.',
    tip: 'הייבוא מזהה כפילויות אוטומטית ומוסיף קבוצות למנויים קיימים.',
    icon: Upload,
    iconColor: 'text-[#9B59B6]',
    position: 'bottom',
    navigateTo: '/NewsletterManager',
  },

  // אנליטיקות
  {
    id: 'analytics',
    title: 'אנליטיקות דיוור',
    content: 'KPI של פתיחות, קליקים, bounces ותלונות.\nמפה גאוגרפית, גרף שעות, וביצועי קמפיינים.',
    tip: 'המפה מציגה מאיפה פותחים את המיילים — בועות גדולות = יותר פתיחות.',
    icon: BarChart3,
    iconColor: 'text-[#9B59B6]',
    position: 'bottom',
    navigateTo: '/NewsletterAnalytics',
  },

  // הגדרות 9a, 9b
  {
    id: 'settings-general',
    title: 'הגדרות — עיצוב ואוטומציה (9א)',
    content: 'צבעים, פונטים, שמות דפים, סטטוסים.\nהפעלת/כיבוי דיוור ובוט וואטסאפ.',
    tip: 'ודאי שמתג הדיוור מופעל לפני שליחת ניוזלטרים.',
    icon: Settings,
    iconColor: 'text-gray-600',
    position: 'bottom',
    navigateTo: '/CRMSettings',
  },
  {
    id: 'settings-templates',
    title: 'הגדרות — תבניות Anti-Spam (9ב)',
    content: 'בלשונית "תבניות Anti-Spam" יוצרים תבניות מותאמות\nעם בלוקי טקסט, תמונה, סרטון וכפתור.',
    tip: 'alt text לתמונות + preheader = מפתח להגעה לתיבת הדואר.',
    icon: Settings,
    iconColor: 'text-gray-600',
    position: 'bottom',
    navigateTo: '/CRMSettings',
  },

  // סיום
  {
    id: 'finish',
    title: 'את מוכנה! 🌷',
    content: 'עכשיו את מכירה את כל חלקי המערכת.\nכפתור ❓ בפינה תמיד יחזיר את המדריך הזה.',
    icon: PartyPopper,
    iconColor: 'text-pink-500',
    position: 'center',
    navigateTo: null,
  },
];

export default TUTORIAL_STEPS;