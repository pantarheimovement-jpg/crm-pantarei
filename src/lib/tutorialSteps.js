import { 
  Sparkles, LayoutDashboard, Users, GraduationCap, CheckSquare, 
  Mail, BarChart3, Settings, PartyPopper, Upload, Globe, MessageSquare,
  UserPlus, ArrowLeftRight, Zap, FileText, Shield
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'ברוכה הבאה למערכת! 🌸',
    content: 'המערכת מנהלת את כל הלידים, הקורסים, השיחות, והדיוור שלך.\nהמדריך יעביר אותך שלב אחרי שלב — עם אפשרות לתרגל כל נושא.',
    icon: Sparkles,
    iconColor: 'text-[#6D436D]',
    bgColor: 'from-purple-50 to-pink-50',
    position: 'center',
    navigateTo: null,
  },

  // דשבורד
  {
    id: 'dashboard',
    title: 'דשבורד — מבט-על',
    content: 'בדשבורד את רואה כמה לידים, רשומים, ויחס המרה.\nכל מספר לחיץ ומוביל לרשימה מסוננת.\nכרטיסי התראות צבעוניים מראים מה דורש תשומת לב.',
    tip: 'לחצי על כל מספר או כרטיס — הם מובילים ישירות לרשימה המתאימה.',
    icon: LayoutDashboard,
    iconColor: 'text-emerald-600',
    bgColor: 'from-emerald-50 to-green-50',
    navigateTo: '/PipelineDashboard',
    navigateLabel: 'עברי לדשבורד',
    practiceNote: 'נסי ללחוץ על מספר הלידים החדשים בדשבורד ולראות לאן זה מוביל.',
  },

  // משתתפים — סקירה
  {
    id: 'students-overview',
    title: 'משתתפים — ניהול לידים ורשומים',
    content: 'כאן מנהלים את כל המשתתפים והלידים.\n• חיפוש לפי שם, טלפון או מייל\n• סינון לפי סטטוס וקורס\n• תצוגת כרטיסים או טבלה\n• ייבוא מ-Summit, ייצוא CSV + Google Sheets',
    tip: 'מחיקה מרובה: סמני כמה משתתפים ומחקי בלחיצה אחת.',
    icon: Users,
    iconColor: 'text-[#D29486]',
    bgColor: 'from-rose-50 to-orange-50',
    navigateTo: '/Students',
    navigateLabel: 'עברי לדף משתתפים',
    practiceNote: 'נסי לחפש משתתף לפי שם, ואז לסנן לפי קורס ספציפי.',
  },

  // משתתפים — סטטוסים
  {
    id: 'students-statuses',
    title: 'משתתפים — סטטוסים לפי קורס',
    content: 'לכל משתתף יש סטטוס נפרד לכל קורס:\n\n• ליד חדש — טרם נוצר קשר\n• הודעה מוואטסאפ לבדיקה — צריך אישור ידני\n• במעקב ראשוני — נוצר קשר, ממתינים\n• היה ביום היכרות\n• רשום/נרשם — משלם, נספר במונה\n• לחזור לקראת הרשמה — ממתין לפתיחת קורס\n• לא רלוונטי',
    tip: 'הסטטוס הכללי מחושב אוטומטית לפי הקורס עם הסטטוס "החזק" ביותר (רשום > ליד חדש > לחזור > במעקב > לא רלוונטי).',
    icon: ArrowLeftRight,
    iconColor: 'text-[#8B5CF6]',
    bgColor: 'from-violet-50 to-purple-50',
    navigateTo: '/Students',
    navigateLabel: 'עברי לדף משתתפים',
    practiceNote: 'פתחי כרטיס משתתף ונסי לשנות סטטוס של קורס ספציפי דרך הכפתור הסגול.',
    autoNote: 'סטטוסים כמו "ליד חדש" ו"במעקב ראשוני" מתעדכנים אוטומטית מוואטסאפ/אתר/שיחות.',
  },

  // קורסים
  {
    id: 'courses',
    title: 'קורסים — ניהול והרשמה',
    content: 'כאן מנהלים קורסים עם סטטוסים:\n\n• לא פתוח להרשמה (ברירת מחדל)\n• פתוח להרשמה\n• מלא / בתהליך / הסתיים\n\nלחיצה על קורס מעבירה לדף ייעודי עם נוכחות ורשימת משתתפים.',
    tip: 'שייכי מורה לקורס דרך שדה "אימייל מורה" — היא תוכל לגשת לדף הקורס ולסמן נוכחות.',
    icon: GraduationCap,
    iconColor: 'text-teal-600',
    bgColor: 'from-teal-50 to-cyan-50',
    navigateTo: '/Courses',
    navigateLabel: 'עברי לדף קורסים',
    autoNote: 'כשקורס עובר ל"פתוח להרשמה" — נוצרות שיחות בדיקה אוטומטית ללידים עם "לחזור לקראת הרשמה".',
    practiceNote: 'נסי ללחוץ על קורס כדי לראות את דף הקורס הייעודי עם מעקב נוכחות.',
  },

  // שיחות ומשימות
  {
    id: 'tasks',
    title: 'שיחות ופגישות — מעקב יומי',
    content: 'כאן עוקבים אחרי שיחות היכרות ומשימות.\nסטטוסי שיחות:\n\n• ממתין — טרם בוצעה\n• ניסיון לשיחה — ניסו, צריך לנסות שוב\n• בבדיקה — בתהליך (→ לקוח עובר ל"במעקב")\n• הושלם / לחזור לקראת הרשמה\n• לא רלוונטי / אבוד',
    tip: 'לכל שיחה יש תג קורס סגול. הסטטיסטיקות למעלה לחיצות — מסננות את הרשימה.',
    icon: CheckSquare,
    iconColor: 'text-blue-600',
    bgColor: 'from-blue-50 to-indigo-50',
    navigateTo: '/Tasks',
    navigateLabel: 'עברי לדף שיחות',
    autoNote: 'שיחות היכרות נוצרות אוטומטית לכל ליד חדש — עם שם הקורס (למשל "שיחת היכרות - נענע").',
    practiceNote: 'נסי לשנות סטטוס של שיחה ל"בבדיקה" ולראות מה קורה למשתתף המקושר.',
  },

  // אוטומציות
  {
    id: 'automations',
    title: 'אוטומציות — מה קורה מאחורי הקלעים',
    content: '• ווצאפ נכנס עם התעניינות → ליד חדש + שיחת היכרות + תגובה אוטומטית\n• ווצאפ לבדיקה → התראה לאופיר, אישור/דחייה (דחייה = מחיקה!)\n• טופס Elementor → ליד + שיחה + וואטסאפ\n• רישום → סגירת שיחות פתוחות + עדכון מונה\n• שיחה ל"ניסיון" → הודעת וואטסאפ מיידית',
    tip: 'כל האוטומציות מופעלות/מכובות בהגדרות CRM → לשונית אוטומציה.',
    icon: Zap,
    iconColor: 'text-amber-600',
    bgColor: 'from-amber-50 to-yellow-50',
    navigateTo: '/CRMSettings',
    navigateLabel: 'עברי להגדרות',
  },

  // ניוזלטר — מנויים
  {
    id: 'newsletter-subscribers',
    title: 'ניוזלטר — ניהול מנויים',
    content: 'מערכת דיוור מלאה: ניהול מנויים בקבוצות,\nייבוא מ-CSV או העתק-הדבק, וסנכרון עם ה-CRM.\n\nמנויים ומשתתפים הם רשימות נפרדות!',
    tip: 'כל מנוי יכול להשתייך למספר קבוצות. בזמן שליחה בוחרים קבוצה ספציפית.',
    icon: Mail,
    iconColor: 'text-[#9B59B6]',
    bgColor: 'from-purple-50 to-fuchsia-50',
    navigateTo: '/NewsletterManager',
    navigateLabel: 'עברי לניוזלטר',
    practiceNote: 'נסי לעבור ללשונית "ייבוא" ולהוריד את ה-CSV לדוגמה.',
  },

  // ניוזלטר — שליחה
  {
    id: 'newsletter-send',
    title: 'ניוזלטר — שליחת דיוור',
    content: 'בוחרים ערוץ (מייל/ווצאפ/שניהם), תבנית, קבוצה ושולחים.\n\n• תבנית מהירה — מתבניות Anti-Spam (מומלץ!)\n• HTML מתקדם — הדבקת קוד\n• עורך חופשי — כתיבה חופשית\n\nבוואטסאפ — תישאלי אם לצרף קישור הסרה.',
    tip: 'תמיד שלחי מייל ניסיון לעצמך לפני שליחה כללית!',
    icon: FileText,
    iconColor: 'text-[#9B59B6]',
    bgColor: 'from-purple-50 to-fuchsia-50',
    navigateTo: '/NewsletterManager',
    navigateLabel: 'עברי לניוזלטר',
    practiceNote: 'נסי לעבור ללשונית "שליחה", לבחור ערוץ, ולשלוח מייל ניסיון לעצמך.',
  },

  // אנליטיקות
  {
    id: 'analytics',
    title: 'אנליטיקות דיוור',
    content: '• KPI של פתיחות, קליקים, bounces ותלונות\n• מפה גאוגרפית — מאיפה פותחים מיילים\n• גרף שעות — מתי הכי פותחים\n• טבלת ביצועי קמפיינים',
    tip: 'המפה מציגה בועות — ככל שהבועה גדולה יותר, יותר פתיחות מאותה עיר.',
    icon: BarChart3,
    iconColor: 'text-[#9B59B6]',
    bgColor: 'from-indigo-50 to-blue-50',
    navigateTo: '/NewsletterAnalytics',
    navigateLabel: 'עברי לסטטיסטיקות',
    practiceNote: 'נסי לעבור לדף הסטטיסטיקות ולבדוק את הביצועים של הקמפיין האחרון.',
  },

  // הגדרות — כללי
  {
    id: 'settings-general',
    title: 'הגדרות — עיצוב, סטטוסים ואוטומציה',
    content: '• הגדרות כלליות — שם, טלפון, מייל, לוגו\n• עיצוב — צבעים, פונטים, עיגול פינות\n• סטטוסים — הוספה/מחיקה/עריכת צבע\n• אוטומציה — מתג דיוור, בוט וואטסאפ, תגובות אוטומטיות\n• אנשי קשר מוכרים — לא ייחשבו כלידים',
    tip: 'סטטוסים מוגנים (משמשים באוטומציות) לא ניתנים למחיקה — מופיע מנעול.',
    icon: Settings,
    iconColor: 'text-gray-600',
    bgColor: 'from-gray-50 to-slate-50',
    navigateTo: '/CRMSettings',
    navigateLabel: 'עברי להגדרות CRM',
    practiceNote: 'נסי לשנות צבע המערכת בלשונית "עיצוב ומיתוג" ולראות את השינוי בזמן אמת.',
  },

  // הגדרות — תבניות
  {
    id: 'settings-templates',
    title: 'הגדרות — תבניות Anti-Spam',
    content: 'בלשונית "תבניות Anti-Spam" יוצרים תבניות מותאמות:\n\n• בלוקי טקסט, תמונה, סרטון וכפתור\n• שכפול בלוקים בלחיצה\n• Preheader — טקסט תצוגה מקדימה (חשוב!)\n• alt text לתמונות — קריטי למניעת ספאם',
    tip: 'יחס 60% טקסט / 40% תמונות ולא יותר מ-5 קישורים = deliverability מעולה.',
    icon: Shield,
    iconColor: 'text-green-600',
    bgColor: 'from-green-50 to-emerald-50',
    navigateTo: '/CRMSettings',
    navigateLabel: 'עברי להגדרות CRM',
    practiceNote: 'נסי ליצור תבנית חדשה, להוסיף בלוק תמונה, ולמלא alt text תיאורי.',
  },

  // סיום
  {
    id: 'finish',
    title: 'את מוכנה! 🌷',
    content: 'עכשיו את מכירה את כל חלקי המערכת.\n\nכפתור ❓ בפינה תמיד יחזיר את המדריך הזה.\nבהגדרות CRM → "מדריך למשתמשת" יש הסברים מפורטים נוספים.',
    icon: PartyPopper,
    iconColor: 'text-pink-500',
    bgColor: 'from-pink-50 to-rose-50',
    position: 'center',
    navigateTo: null,
  },
];

export default TUTORIAL_STEPS;