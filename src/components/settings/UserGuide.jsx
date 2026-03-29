import React, { useState } from 'react';
import { 
  ChevronDown, ChevronUp, BookOpen, LayoutDashboard, Users, GraduationCap, 
  CheckSquare, Mail, Zap, Settings, Search, ArrowRight,
  Sparkles, AlertCircle, RefreshCw, MessageSquare, ClipboardList, ShieldCheck
} from 'lucide-react';

function FAQItem({ question, answer, icon: Icon, color = '#6D436D' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors"
      >
        {Icon && (
          <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: color + '15' }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
        )}
        <span className="flex-1 font-medium text-gray-900 text-sm">{question}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
          <div className="pt-3 space-y-2">{answer}</div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-right hover:bg-gray-50 transition-colors"
      >
        <div className="p-3 rounded-xl" style={{ backgroundColor: color }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="flex-1 font-bold text-lg text-gray-900">{title}</span>
        {open ? (
          <ChevronUp className="w-6 h-6 text-gray-400" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-400" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ name, color, description }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <span
        className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white flex-shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
      <span className="text-sm text-gray-700">{description}</span>
    </div>
  );
}

function AutoBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
      <Zap className="w-3 h-3" />
      {children}
    </span>
  );
}

function ManualBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
      ✋ {children}
    </span>
  );
}

export default function UserGuide() {
  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-gradient-to-l from-[#6D436D]/10 to-[#D29486]/10 rounded-2xl p-6 border border-[#6D436D]/20">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-6 h-6 text-[#6D436D]" />
          <h2 className="text-xl font-bold text-gray-900">ברוכה הבאה למדריך למשתמשת</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          כאן תמצאי הסברים מפורטים על כל חלקי המערכת — מה עושה כל דף, אילו סטטוסים קיימים, מה משתנה אוטומטית ומה צריך לעדכן ידנית, ואיך הכל מתחבר יחד. לחצי על כל שאלה כדי לפתוח את התשובה.
        </p>
      </div>

      {/* דשבורד */}
      <Section title="דשבורד סטודיו" icon={LayoutDashboard} color="#6D436D" defaultOpen={false}>
        <FAQItem
          icon={LayoutDashboard}
          question="מה מוצג בדשבורד?"
          answer={
            <div>
              <p>הדשבורד הוא מסך הבית של המערכת ונותן מבט-על מהיר:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>משתתפים רשומים</strong> — כמה נרשמו סה״כ, היום, והשבוע</li>
                <li><strong>לידים חדשים</strong> — כמה לידים חדשים נכנסו</li>
                <li><strong>יחס המרה</strong> — אחוז המשתתפים שהפכו מלידים לרשומים (עם גרף עוגה)</li>
                <li><strong>טבלת קורסים</strong> — כל הקורסים עם מספר הרשומים, חדשים היום והשבוע, ואחוז מילוי</li>
                <li><strong>שיחות היכרות</strong> — שיחות שעדיין לא בוצעו, כולל התראה על שיחות שעבר התאריך שלהן</li>
                <li><strong>לחזור לקראת הרשמה</strong> — שיחות שממתינות לפתיחת הרשמה לקורס. לחיצה מסננת את דף השיחות לסטטוס זה</li>
                <li><strong>התראות</strong> — קורסים שמתמלאים (90%+), קורסים שעומדים להתחיל</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={Search}
          question="איך משתמשים בחיפוש ובפילטרים בדשבורד?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>חיפוש</strong> — מאפשר למצוא משתתף לפי שם, לחיצה על Enter או ״חפש״ מעבירה ישירות לדף המשתתפים עם תוצאות החיפוש</li>
                <li><strong>פילטר תאריכים</strong> (הכל / היום / השבוע / החודש) — מסנן את כל הנתונים בדשבורד לפי תקופת זמן</li>
                <li><strong>פילטר קטגוריות קורסים</strong> — מסנן את טבלת הקורסים לפי סוג (קורס קבוע, סדנה, פרטי, אונליין)</li>
                <li>לחיצה על כל מספר בדשבורד מפנה ישירות לרשימה המתאימה בדף המשתתפים</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* משתתפים */}
      <Section title="דף משתתפים" icon={Users} color="#D29486">
        <FAQItem
          icon={Users}
          question="מה נמצא בדף המשתתפים?"
          answer={
            <div>
              <p>דף המשתתפים הוא המקום המרכזי לניהול כל המשתתפים והלידים:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>רשימת משתתפים</strong> — בתצוגת כרטיסים או טבלה</li>
                <li><strong>חיפוש</strong> — לפי שם, טלפון, מייל</li>
                <li><strong>סינון</strong> — לפי סטטוס (הכל / לידים חדשים / רשומים) ולפי קורס</li>
                <li><strong>הוספה / עריכה / מחיקה</strong> — ניהול מלא של כרטיס משתתף</li>
                <li><strong>ייבוא מ-Summit</strong> — העלאת קובץ HTML מהמערכת החיצונית</li>
                <li><strong>היסטוריית שיחות</strong> — לכל משתתף ניתן לראות את כל השיחות שלו (בלחיצה על ״הצג היסטוריית שיחות״)</li>
                <li><strong>תאריך כניסת ליד</strong> — נקבע אוטומטית בכניסת ליד (מוואטסאפ, אתר, Gmail) וניתן לעריכה ידנית</li>
                <li><strong>מקורות ליד</strong> — אתר / וואטסאפ / פייסבוק / ידני / אחר</li>
                <li><strong>מחיקה מרובה</strong> — סימון מספר משתתפים ומחיקה בו-זמנית</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={AlertCircle}
          color="#D29486"
          question="מה הסטטוסים של משתתפים ומה המשמעות של כל אחד?"
          answer={
            <div>
              <p className="mb-3">הסטטוסים מוגדרים בהגדרות CRM (לשונית ״סטטוסים ושלבים״) וניתנים לעריכה. אלה הסטטוסים הפעילים:</p>
              <div className="space-y-2">
                <StatusBadge name="ליד חדש" color="#6D436D" description="משתתף שנכנס למערכת — מוואטסאפ, אתר, או ידני. טרם נוצר קשר." />
                <StatusBadge name="הודעה מוואטסאפ לבדיקה" color="#D29486" description="הודעה שנכנסה מוואטסאפ שלא עברה סף התעניינות ברור — צריך לבדוק ידנית אם רלוונטי." />
                <StatusBadge name="במעקב ראשוני" color="#FAD980" description="נוצר קשר ראשוני, ממתינים לתגובה. מתעדכן אוטומטית כששיחה עוברת ל״בבדיקה״." />
                <StatusBadge name="רשום / נרשם" color="#2ECC71" description="המשתתף רשום ומשלם — נספר במונה הקורס." />
                <StatusBadge name="היה ביום היכרות" color="#8B5CF6" description="הלקוח השתתף ביום היכרות." />
                <StatusBadge name="לא רלוונטי" color="#95A5A6" description="ליד שלא מעוניין. מתעדכן אוטומטית כששיחה עוברת ל״לא רלוונטי״ או ל״אבוד״." />
              </div>
              <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                ❌ <strong>סטטוסים שהוסרו:</strong> ניסיון נקבע, ניסיון בוצע, ניסיון מתוכנן, אבוד, נוצר משיחה — כבר לא קיימים במערכת.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Zap}
          color="#9B59B6"
          question="אילו סטטוסים משתנים אוטומטית ואילו ידנית?"
          answer={
            <div>
              <p className="font-semibold mb-2">שינויים אוטומטיים:</p>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>ליד חדש</strong> — נקבע אוטומטית כשנכנסת הודעה מוואטסאפ עם ביטוי התעניינות ברור + הקשר לקורס</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>הודעה מוואטסאפ לבדיקה</strong> — נקבע כשההודעה מכילה הקשר לקורס אבל ללא ביטוי התעניינות ברור</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>במעקב ראשוני</strong> — מתעדכן אוטומטית כששיחה עוברת לסטטוס ״בבדיקה״</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>לא רלוונטי</strong> — מתעדכן אוטומטית כששיחה עוברת ל״לא רלוונטי״ או ל״אבוד״</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>תאריך כניסת ליד</strong> — נקבע אוטומטית בכל כניסת ליד (וואטסאפ, אתר, Gmail)</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>אושר מדיניות הפרטיות</strong> — מסומן אוטומטית כשמשתתף ממלא טופס באתר וסימן את צ׳קבוקס ההסכמה. ניתן גם לעדכן ידנית</span>
                </div>
              </div>
              <p className="font-semibold mb-2">שינויים ידניים:</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <ManualBadge>ידני</ManualBadge>
                  <span className="text-sm"><strong>רשום, היה ביום היכרות</strong> — צריכים להתעדכן ידנית דרך עריכת המשתתף</span>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={RefreshCw}
          question="מה משפיע על מה בדף המשתתפים?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>שינוי סטטוס ל<strong>״רשום/נרשם״</strong> → מעלה אוטומטית את מונה הקורס +1</li>
                <li>שינוי סטטוס מ<strong>״רשום״</strong> למשהו אחר → מוריד את מונה הקורס -1</li>
                <li>מחיקת משתתף רשום → מוריד אוטומטית את המונה בכל הקורסים שהוא רשום אליהם</li>
                <li>הקורס הראשי (שדה course_id) → קובע איפה המשתתף מוצג בדשבורד</li>
                <li>מערך הקורסים (courses[]) → שומר את כל הקורסים עם סטטוס נפרד לכל אחד</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* קורסים */}
      <Section title="דף קורסים" icon={GraduationCap} color="#4ECDC4">
        <FAQItem
          icon={GraduationCap}
          question="מה נמצא בדף הקורסים?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>רשימת קורסים</strong> — בתצוגת כרטיסים או טבלה</li>
                <li><strong>פרטי קורס</strong> — שם, סוג, לוח זמנים, מיקום, מחיר, תאריכי התחלה וסיום</li>
                <li><strong>מונה רשומים</strong> — מספר רשומים מתעדכן אוטומטית בכל שינוי סטטוס בדף המשתתפים</li>
                <li><strong>מונה לידים משויכים</strong> — כמה לידים (עדיין לא רשומים) משויכים לכל קורס</li>
                <li><strong>סטטוס קורס</strong> — לא פתוח להרשמה, פתוח להרשמה, מלא, בתהליך, הסתיים</li>
                <li><strong>לחיצה על מספר הרשומים/לידים</strong> — מובילה ישירות לדף משתתפים מסונן לפי הקורס והסטטוס</li>
                <li><strong>אימייל מורה</strong> — ניתן לשייך מורה לקורס דרך כתובת מייל (בעריכת קורס)</li>
                <li><strong>לינק ישיר לדף קורס</strong> — לחיצה על שם הקורס או כפתור ״דף קורס״ פותחת את דף הקורס הייעודי</li>
                <li><strong>ייצוא CSV</strong> — כפתור לייצוא רשימת הקורסים עם כל הנתונים לקובץ CSV</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={AlertCircle}
          color="#4ECDC4"
          question="מה הסטטוסים של קורסים?"
          answer={
            <div className="space-y-2">
              <StatusBadge name="לא פתוח להרשמה" color="#7B8794" description="ברירת מחדל לקורס חדש. הקורס עדיין לא מקבל נרשמים. כשהסטטוס ישתנה ל״פתוח להרשמה״ — תיפעל אוטומציה (ראי בסעיף אוטומציות)." />
              <StatusBadge name="פתוח להרשמה" color="#2ECC71" description="הקורס מקבל נרשמים חדשים." />
              <StatusBadge name="מלא" color="#E74C3C" description="הגיע למקסימום משתתפים." />
              <StatusBadge name="בתהליך" color="#3498DB" description="הקורס פעיל כרגע." />
              <StatusBadge name="הסתיים" color="#95A5A6" description="הקורס סיים את פעילותו." />
              <div className="mt-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">כשקורס עובר מ<strong>״לא פתוח להרשמה״</strong> ל<strong>״פתוח להרשמה״</strong> → נוצרות אוטומטית <strong>שיחות בדיקה להרשמה</strong> ללידים שמשויכים לקורס עם סטטוס ״לחזור לקראת הרשמה״ + נשלח <strong>מייל התראה</strong> לאדמין</span>
                </div>
                <div className="flex items-start gap-2">
                  <ManualBadge>ידני</ManualBadge>
                  <span className="text-sm">שאר הסטטוסים (מלא, בתהליך, הסתיים) מתעדכנים ידנית</span>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ShieldCheck}
          color="#4ECDC4"
          question="איך משייכים מורה לקורס?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>בדף הקורסים → לחצי על <strong>עריכה</strong> (אייקון העיפרון) של הקורס</li>
                <li>גללי למטה לשדה <strong>״אימייל מורה״</strong></li>
                <li>הזיני את כתובת המייל של המורה ושמרי</li>
                <li>כעת המורה תוכל להיכנס ל<strong>דף הקורס הייעודי</strong> דרך הלינק הייחודי</li>
                <li>הלינק מופיע מתחת לשדה אימייל המורה בחלון העריכה</li>
              </ul>
              <p className="mt-3 p-3 bg-teal-50 rounded-lg text-sm">
                💡 <strong>חשוב:</strong> המורה צריכה להיות רשומה כמשתמשת במערכת (עם אותה כתובת מייל). היא תראה רק את הקורס שמשויך אליה — לא שאר המערכת.
              </p>
            </div>
          }
        />
      </Section>

      {/* דף קורס ייעודי */}
      <Section title="דף קורס ייעודי (למורה)" icon={ClipboardList} color="#2ECC71">
        <FAQItem
          icon={ClipboardList}
          question="מה זה דף קורס ייעודי?"
          answer={
            <div>
              <p>כל קורס במערכת מקבל <strong>URL ייחודי</strong> (כתובת אינטרנט) שניתן לשתף עם המורה:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>פרטי הקורס</strong> — שם, לוז, מיקום, מחיר, תאריכים</li>
                <li><strong>מונים</strong> — כמה רשומים וכמה לידים משויכים</li>
                <li><strong>מעקב נוכחות</strong> — סימון נוכחות לכל משתתף לפי תאריך מפגש</li>
                <li><strong>רשימת משתתפים רשומים</strong> — כל המשתתפים הרשומים עם טלפון ומייל</li>
                <li><strong>רשימת לידים</strong> — כל הלידים המשויכים לקורס (שעדיין לא רשומים) מוצגים בנפרד</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={Users}
          color="#2ECC71"
          question="איך עובד מעקב הנוכחות?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>בוחרים <strong>תאריך מפגש</strong> בשדה התאריך למעלה</li>
                <li>לכל משתתף מופיעות 3 אפשרויות: <strong>נוכח/ת</strong>, <strong>נעדר/ת</strong>, <strong>איחור</strong></li>
                <li>לוחצים על הכפתור המתאים — הנוכחות נשמרת מיד</li>
                <li>כפתור <strong>״סמן כולם נוכחים״</strong> — מסמן את כל המשתתפים כנוכחים בלחיצה אחת</li>
                <li><strong>מפגשים קודמים</strong> — כפתורי תאריכים מהירים מאפשרים לחזור ולראות/לערוך נוכחות ממפגשים קודמים</li>
              </ul>
              <p className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                💡 <strong>טיפ:</strong> נתוני הנוכחות נשמרים לפי קורס + תאריך + משתתף. ניתן לערוך נוכחות בכל עת.
              </p>
            </div>
          }
        />
        <FAQItem
          icon={ShieldCheck}
          color="#2ECC71"
          question="מי יכול לגשת לדף הקורס?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>אדמין</strong> — יכול לגשת לכל דף קורס ללא הגבלה</li>
                <li><strong>מורה (משתמשת רגילה)</strong> — יכולה לגשת רק לקורס שבו האימייל שלה מוגדר בשדה ״אימייל מורה״</li>
                <li>אם מישהו מנסה לגשת לקורס שלא שייך אליו — תופיע הודעת <strong>״גישה נדחתה״</strong></li>
                <li>כדי לתת למורה גישה: הוסיפי אותה כמשתמשת במערכת + הזיני את המייל שלה בשדה אימייל מורה בקורס</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* שיחות ומשימות */}
      <Section title="שיחות ופגישות (משימות)" icon={CheckSquare} color="#3498DB">
        <FAQItem
          icon={CheckSquare}
          question="מה נמצא בדף השיחות?"
          answer={
            <div>
              <p>הדף מנהל את כל השיחות, הפגישות והמעקבים:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>רשימת שיחות</strong> — עם שם, תיאור, משתתף מקושר, סטטוס, ותאריך מתוזמן</li>
                <li><strong>סינון</strong> — לפי סטטוס, משתתף, וחיפוש חופשי</li>
                <li><strong>בחירת משתתף חכמה</strong> — Combobox עם חיפוש לפי שם, טלפון או מייל (גם ביצירת שיחה וגם בסינון)</li>
                <li><strong>סטטיסטיקות לחיצות</strong> — ניסיון לשיחה, בבדיקה, הושלמו, ומתוזמנות — לחיצה על כל סטטיסטיקה מסננת את הרשימה</li>
                <li><strong>מעבר על הכרטיס</strong> (hover) — מציג כרטיס מהיר של המשתתף עם טלפון, מייל וקורס</li>
                <li><strong>יצירת משתתף חדש</strong> — ניתן ליצור משתתף חדש ישירות מתוך השיחה</li>
                <li><strong>ייבוא / ייצוא CSV</strong></li>
              </ul>
              <p className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                💡 <strong>חשוב:</strong> השיחות מופיעות גם בדף המשתתפים! כל משתתף יכול לראות את היסטוריית השיחות שלו דרך כפתור ״הצג היסטוריית שיחות״.
              </p>
            </div>
          }
        />
        <FAQItem
          icon={AlertCircle}
          color="#3498DB"
          question="מה הסטטוסים של שיחות?"
          answer={
            <div className="space-y-2">
              <StatusBadge name="ממתין" color="#F39C12" description="השיחה טרם בוצעה, ממתינה לטיפול." />
              <StatusBadge name="ניסיון לשיחה" color="#E74C3C" description="נעשה ניסיון ליצור קשר — צריך לנסות שוב." />
              <StatusBadge name="לא ענתה" color="#F39C12" description="התקשרנו והמשתתפת לא ענתה. → הלקוחה עוברת אוטומטית ל״במעקב ראשוני״." />
              <StatusBadge name="בבדיקה" color="#3498DB" description="נמצאת בתהליך בדיקה, עדיין לא הושלמה." />
              <StatusBadge name="הושלם" color="#6D436D" description="השיחה/משימה טופלה בהצלחה." />
              <StatusBadge name="לא רלוונטי" color="#BDC3C7" description="לא רלוונטי יותר. → משנה אוטומטית את סטטוס הלקוח ל״לא רלוונטי״." />
              <StatusBadge name="לחזור לקראת הרשמה" color="#9B59B6" description="הליד מעוניין אך ממתין לפתיחת הרשמה לקורס. כשהקורס ייפתח להרשמה — תיווצר אוטומטית שיחת בדיקה." />
              <StatusBadge name="אבוד" color="#7F8C8D" description="הליד אבד, לא הצלחנו ליצור קשר. → משנה אוטומטית את סטטוס הלקוח ל״לא רלוונטי״." />
              <div className="mt-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>שיחת היכרות</strong> נוצרת אוטומטית כשליד חדש נכנס מוואטסאפ או מטופס Elementor</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">שינוי שיחה ל<strong>״בבדיקה״</strong> → לקוח עובר אוטומטית ל״במעקב ראשוני״</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">שינוי שיחה ל<strong>״לא ענתה״</strong> → לקוחה עוברת אוטומטית ל<strong>״במעקב ראשוני״</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">שינוי שיחה ל<strong>״לא רלוונטי״</strong> או <strong>״אבוד״</strong> → לקוח עובר אוטומטית ל״לא רלוונטי״</span>
                </div>
                <div className="flex items-start gap-2">
                  <ManualBadge>ידני</ManualBadge>
                  <span className="text-sm">שינוי סטטוס שיחה ל״ניסיון לשיחה״, ״הושלם״ — צריך לעדכן ידנית</span>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={RefreshCw}
          question="איפה מוצגות השיחות?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>דף שיחות ופגישות</strong> — הרשימה המלאה</li>
                <li><strong>דף משתתפים</strong> — בלחיצה על ״הצג היסטוריית שיחות״ בכרטיס משתתף, מופיעות כל השיחות שלו</li>
                <li><strong>דשבורד</strong> — שיחות להיום, שיחות מתוזמנות, ושיחות היכרות ללידים חדשים</li>
                <li>שיחה שמתוזמנת להיום ולא הושלמה מוצגת <strong>באדום בדשבורד</strong></li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* ניוזלטר */}
      <Section title="ניוזלטר ודיוור" icon={Mail} color="#9B59B6">
        <FAQItem
          icon={Mail}
          question="מה נמצא בדף הניוזלטר?"
          answer={
            <div>
              <p>מערכת דיוור מלאה עם ניהול מנויים ושליחת ניוזלטרים:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>ניהול מנויים</strong> — הוספה, עריכה, מחיקה, חלוקה לקבוצות</li>
                <li><strong>כתיבת ניוזלטר</strong> — עורך תבניות מייל עם בלוקים (טקסט, תמונה, וידאו, כפתור)</li>
                <li><strong>שליחת מייל</strong> — דרך Brevo (ספק המייל) לכל הרשימה או קבוצה ספציפית</li>
                <li><strong>שליחת וואטסאפ</strong> — ניוזלטר דרך וואטסאפ למנויים עם מספר טלפון</li>
                <li><strong>ייבוא מנויים</strong> — העתק-הדבק או קובץ CSV</li>
                <li><strong>היסטוריית שליחות</strong> — מעקב על כל ניוזלטר ששלחת, כולל מספר נמענים וסטטוס</li>
                <li><strong>שליחת מייל ניסיון</strong> — אפשרות לשלוח לעצמך לפני שליחה לכולם</li>
              </ul>
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                ⚠️ <strong>חשוב:</strong> מערכת הדיוור נשלטת על ידי <strong>מתג הפעלה</strong> בהגדרות CRM → לשונית אוטומציה. כשהמתג כבוי — לא יישלחו ניוזלטרים או מיילים שיווקיים (לא דרך Brevo ולא דרך Gmail). יש להפעיל את המתג לפני שליחה ראשונה.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={AlertCircle}
          color="#9B59B6"
          question="מה הסטטוסים של שליחת ניוזלטר?"
          answer={
            <div className="space-y-2">
              <StatusBadge name="נשלח בהצלחה" color="#2ECC71" description="הניוזלטר נשלח לכל הנמענים." />
              <StatusBadge name="נכשל" color="#E74C3C" description="אירעה שגיאה בשליחה." />
              <StatusBadge name="בתהליך" color="#F39C12" description="השליחה מתבצעת כעת." />
            </div>
          }
        />
        <FAQItem
          icon={Users}
          color="#9B59B6"
          question="מה ההבדל בין מנויים לבין משתתפים?"
          answer={
            <div>
              <p><strong>מנויים (Subscribers)</strong> — רשימת תפוצה לניוזלטרים. אנשים שרוצים לקבל עדכונים במייל או וואטסאפ.</p>
              <p className="mt-2"><strong>משתתפים (Students)</strong> — אנשים שמתעניינים או רשומים לקורסים. מנוהלים בדף המשתתפים.</p>
              <p className="mt-2 p-3 bg-purple-50 rounded-lg text-sm">
                💡 ניתן ליצור מנוי ולסנכרן אותו כאיש קשר ב-CRM. המערכות נפרדות אבל ניתן לייבא ביניהן.
              </p>
            </div>
          }
        />
        <FAQItem
          icon={Settings}
          question="איך עובדת מערכת הקבוצות בדיוור?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>כל מנוי יכול להשתייך ל<strong>קבוצה</strong> (לדוגמה: ״לאבאן״, ״סדנאות״, ״כללי״)</li>
                <li>בזמן שליחת ניוזלטר ניתן לבחור <strong>קבוצה ספציפית</strong> או ״כל המנויים״</li>
                <li>ניתן <strong>לאזן קבוצות</strong> — חלוקה אוטומטית שווה של מנויים בין הקבוצות</li>
                <li>כל מנוי יכול <strong>לבטל מנוי</strong> דרך קישור ייחודי שנשלח עם כל ניוזלטר</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* אוטומציות */}
      <Section title="אוטומציות — מה קורה מאחורי הקלעים" icon={Zap} color="#E74C3C">
        <FAQItem
          icon={Sparkles}
          color="#E74C3C"
          question="אילו אוטומציות פנימיות קיימות במערכת?"
          answer={
            <div>
              <p className="font-semibold mb-3">אוטומציות שרצות ברגע שמשהו קורה:</p>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="font-bold text-green-800 mb-1">📱 הודעת וואטסאפ נכנסת → יצירת ליד</p>
                  <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                    <li>הודעה עם <strong>ביטוי התעניינות + הקשר לקורס</strong> → נוצר ליד חדש + שיחת היכרות + תגובה אוטומטית</li>
                    <li>הודעה עם <strong>הקשר לקורס בלבד</strong> (ללא ביטוי ברור) → נוצר ליד ״הודעה מוואטסאפ לבדיקה״ ללא תגובה אוטומטית</li>
                    <li>הודעה <strong>ללא הקשר לקורס</strong> → מתעלמים (לא נוצר כלום)</li>
                    <li>אם המשתתף <strong>כבר קיים</strong> → מעדכן פרטים + מוסיף קורס חדש אם רלוונטי</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="font-bold text-blue-800 mb-1">📋 טופס Elementor (אתר) → יצירת ליד</p>
                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    <li>כשמישהו ממלא טופס באתר, נוצר אוטומטית <strong>ליד חדש</strong> עם כל הפרטים</li>
                    <li>נוצרת <strong>שיחת היכרות</strong> (מתוזמנת ליומיים קדימה)</li>
                    <li>נשלחת <strong>הודעת וואטסאפ אוטומטית</strong> אם הוגדר מספר טלפון</li>
                    <li>אם המשתתף כבר קיים — מעדכן קורס/סטטוס</li>
                    <li>אם סומן צ׳קבוקס <strong>הסכמה לדיוור</strong> (מדיניות פרטיות) בטופס → שדה <strong>״אושר מדיניות הפרטיות״</strong> מסומן אוטומטית על המשתתף ועל המנוי בניוזלטר</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="font-bold text-yellow-800 mb-1">🔄 שינוי סטטוס שיחה → עדכון אוטומטי של סטטוס לקוח</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    <li>שיחה עוברת ל<strong>״בבדיקה״</strong> → הלקוח המקושר עובר אוטומטית ל<strong>״במעקב ראשוני״</strong></li>
                    <li>שיחה עוברת ל<strong>״לא רלוונטי״</strong> → הלקוח עובר אוטומטית ל<strong>״לא רלוונטי״</strong></li>
                    <li>שיחה עוברת ל<strong>״אבוד״</strong> → הלקוח עובר אוטומטית ל<strong>״לא רלוונטי״</strong></li>
                  </ul>
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                  <p className="font-bold text-teal-800 mb-1">🎓 פתיחת הרשמה לקורס</p>
                  <ul className="list-disc list-inside text-sm text-teal-700 space-y-1">
                    <li>כשקורס עובר מ<strong>״לא פתוח להרשמה״</strong> ל<strong>״פתוח להרשמה״</strong>:</li>
                    <li>המערכת מחפשת <strong>לידים משויכים</strong> לקורס שיש להם שיחות בסטטוס ״לחזור לקראת הרשמה״</li>
                    <li>נוצרות אוטומטית <strong>שיחות בדיקה להרשמה</strong> לכל ליד רלוונטי (מתוזמנות ליום למחרת)</li>
                    <li>נשלח <strong>מייל התראה</strong> לאדמין עם רשימת הלידים שהמערכת מצאה</li>
                  </ul>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="font-bold text-purple-800 mb-1">📊 מונה קורס אוטומטי</p>
                  <ul className="list-disc list-inside text-sm text-purple-700 space-y-1">
                    <li>שינוי סטטוס ל״רשום/נרשם״ → <strong>מספר הנרשמים בקורס עולה ב-1</strong></li>
                    <li>שינוי מ״רשום״ לסטטוס אחר → <strong>מספר הנרשמים יורד ב-1</strong></li>
                    <li>מחיקת משתתף רשום → <strong>מעדכן את המונה בכל הקורסים שלו</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={MessageSquare}
          color="#E74C3C"
          question="אילו אוטומציות חיצוניות מחוברות?"
          answer={
            <div>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">🟢 Green API (וואטסאפ)</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>מקבל הודעות נכנסות ומנתח אותן</li>
                    <li>שולח הודעות תגובה אוטומטיות</li>
                    <li>שולח ניוזלטרים דרך וואטסאפ</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">📧 Brevo + Gmail (דיוור)</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>שליחת ניוזלטרים במייל דרך Brevo</li>
                    <li>שליחת מיילים בודדים</li>
                    <li>אם Brevo לא זמין — נופל אוטומטית ל-Gmail API כגיבוי</li>
                    <li>⚠️ <strong>נשלט על ידי מתג הפעלה</strong> בהגדרות CRM → אוטומציה. כשהמתג כבוי — לא נשלחים מיילים</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">📝 Elementor (טפסי אתר)</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>Webhook שמקבל מילוי טופס מהאתר</li>
                    <li>יוצר אוטומטית ליד + שיחת היכרות</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">💳 Summit (תשלומים)</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>חיבור למערכת התשלומים</li>
                    <li>ייבוא נתונים מ-Summit לתוך המערכת</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">📊 Microsoft Clarity</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>מעקב על התנהגות משתמשים באתר</li>
                    <li>מפות חום ושיקופי מסך</li>
                  </ul>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Settings}
          question="איך משנים את תגובת הוואטסאפ האוטומטית?"
          answer={
            <div>
              <p>בלשונית <strong>״אוטומציה״</strong> בהגדרות CRM:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>ניתן <strong>להפעיל/לכבות</strong> את התגובה האוטומטית</li>
                <li>ניתן <strong>לערוך את הטקסט</strong> — השתמשי ב-{`{{name}}`} כדי להכניס את שם השולח</li>
                <li>התגובה נשלחת רק <strong>ללידים חדשים</strong> שזוהו כהתעניינות ברורה</li>
                <li>הודעות ש״לבדיקה״ <strong>לא מקבלות תגובה אוטומטית</strong></li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* הגדרות CRM */}
      <Section title="הגדרות CRM" icon={Settings} color="#34495E">
        <FAQItem
          icon={Settings}
          question="מה ניתן להגדיר בלשוניות ההגדרות?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>הגדרות כלליות</strong> — שם מערכת, טלפון, מייל, כתובת, לוגו, משך ניסיון ברירת מחדל, ימים למעקב אוטומטי</li>
                <li><strong>עיצוב ומיתוג</strong> — צבעי המערכת (רקע, ראשי, הדגשה, פעולה, טקסט), פונטים, עגלות פינות וכפתורים</li>
                <li><strong>תוויות ושדות</strong> — שינוי שמות דפי הניווט, תוויות ישויות (משתתף/קורס), ותוויות שדות</li>
                <li><strong>סטטוסים ושלבים</strong> — הוספה, מחיקה ועריכת צבע של סטטוסי לידים ומשתתפים</li>
                <li><strong>אוטומציה</strong> — הגדרות וואטסאפ, תגובה אוטומטית, חיבור סוכן AI, <strong>מתג הפעלת דיוור (Brevo/Gmail)</strong>, Webhook, קישור תשלום</li>
                <li><strong>תבניות מייל</strong> — עורך תבניות לניוזלטרים עם גרירה ושחרור</li>
                <li><strong>מדריך למשתמשת</strong> — הדף הזה! הסברים מפורטים על כל חלקי המערכת</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={Sparkles}
          question="מה קורה כשמשנים עיצוב או תוויות?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>שינוי <strong>צבעים</strong> → משפיע על כל המערכת מיידית (כפתורים, רקע, טקסט)</li>
                <li>שינוי <strong>שמות דפי ניווט</strong> → משתנה בתפריט העליון ובמובייל</li>
                <li>שינוי <strong>תוויות ישויות</strong> (משתתף→תלמידה) → משתנה בדף המשתתפים ובדשבורד</li>
                <li>הוספת <strong>סטטוס חדש</strong> → מופיע מיד בתפריט הסטטוסים בדף המשתתפים ובדשבורד</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* יוזקייסים */}
      <Section title="יוזקייסים — מתי משתמשים במה?" icon={Sparkles} color="#F39C12">
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="ליד חדש נכנס מוואטסאפ — מה קורה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">הודעה מגיעה לוואטסאפ → Webhook מעביר למערכת</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">המערכת מנתחת: האם יש ביטוי התעניינות? הקשר לקורס?</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">אם כן → נוצר ליד חדש + שיחת היכרות (מתוזמנת ליומיים)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">נשלחת תגובה אוטומטית (אם מופעלת)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">את מקבלת התראה בדשבורד → עוברת לשיחות → מתקשרת → מעדכנת סטטוס</span>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="משתתפת רוצה להירשם לקורס — מה התהליך?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">מוצאת את המשתתפת בדף משתתפים (או יוצרת חדשה)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">בוחרת את הקורס הרלוונטי</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">משנה סטטוס ל״רשום/נרשם״ → מונה הקורס עולה אוטומטית</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">ממלאת תאריך רישום ופרטי תשלום</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">המשתתפת מופיעה כעת בדשבורד כ״רשומה״ ובמניין הקורס</span>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="רוצה לשלוח ניוזלטר — מה התהליך?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">0</span>
                <span className="text-sm">ודאי שמתג הדיוור <strong>מופעל</strong> בהגדרות CRM → אוטומציה (אחרת השליחה תיחסם)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">עוברת לדף ניוזלטר → לשונית ״כתיבת ניוזלטר״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">בוחרת תבנית מוכנה או יוצרת חדשה עם בלוקים (טקסט, תמונה, כפתור)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">בוחרת קבוצת נמענים או ״כל המנויים״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">שולחת מייל ניסיון לעצמך לבדיקה</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">לוחצת ״שלח לכולם״ → הניוזלטר נשלח + נרשם בהיסטוריה</span>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="איך עוקבים אחרי ליד שלא ענה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">בדשבורד — רואה ״שיחות היכרות פתוחות״ באדום</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">לוחצת ״צפה במשימות״ → עוברת לדף השיחות</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">מתקשרת → מעדכנת ״ניסיון לשיחה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">מתזמנת תאריך חדש לנסיון חוזר</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">אם אחרי כמה נסיונות אין מענה → משנה ל״אבוד״</span>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="איך מייבאים משתתפים מ-Summit?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>בדף המשתתפים → כפתור ״ייבוא מ-Summit״</li>
                <li>מעלים קובץ HTML שיוצא מ-Summit</li>
                <li>ניתן לסנן לפי תאריך</li>
                <li>המערכת בודקת כפילויות — מציגה למשתמשת אפשרויות: דלג, צור חדש, או מזג</li>
                <li>בסיום מציגה סיכום: כמה נוספו, כמה מוזגו, כמה דולגו</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="איך שולחים למורה לינק לקורס שלה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">ודאי שהמורה רשומה כמשתמשת במערכת (הזמנה דרך הגדרות)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">בדף הקורסים → ערכי את הקורס → הזיני את המייל של המורה בשדה ״אימייל מורה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">העתיקי את הלינק שמופיע מתחת לשדה (או לחצי ״דף קורס״ בכרטיס הקורס)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">שלחי את הלינק למורה → היא תתחבר עם המייל שלה ותראה רק את הקורס</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">המורה תוכל לסמן נוכחות ולראות את רשימת המשתתפים הרשומים</span>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="קורס נפתח להרשמה — מה קורה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">בדף הקורסים → עורכת את הקורס → משנה סטטוס ל״פתוח להרשמה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">המערכת מחפשת אוטומטית לידים שמשויכים לקורס עם שיחות ״לחזור לקראת הרשמה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">נוצרת אוטומטית שיחת ״בדיקה להרשמה״ לכל ליד רלוונטי (מתוזמנת ליום למחרת)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">נשלח מייל התראה לאדמין עם רשימת הלידים שנמצאו</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">עוברת לדף השיחות → רואה את השיחות החדשות → מתקשרת ללידים</span>
              </div>
              <p className="mt-3 p-3 bg-teal-50 rounded-lg text-sm">
                💡 <strong>טיפ:</strong> ודאי שסטטוס הלידים בשיחות הוא ״לחזור לקראת הרשמה״ לפני שמשנה את סטטוס הקורס — רק לידים כאלה יקבלו שיחת בדיקה אוטומטית.
              </p>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="איך מייצאים רשימת קורסים ל-CSV?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>בדף הקורסים → כפתור <strong>״ייצוא CSV״</strong> בפינה הימנית העליונה</li>
                <li>הקובץ יכלול: שם קורס, סוג, סטטוס, לוז, מיקום, מחיר, רשומים, לידים, מקסימום, ואימייל מורה</li>
                <li>הייצוא כולל רק את הקורסים המוצגים (אחרי חיפוש/סינון)</li>
              </ul>
            </div>
          }
        />
      </Section>
    </div>
  );
}