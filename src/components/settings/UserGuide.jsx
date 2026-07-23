import React, { useState } from 'react';
import { 
  ChevronDown, ChevronUp, BookOpen, LayoutDashboard, Users, GraduationCap, 
  CheckSquare, Mail, Zap, Settings, Search, ArrowRight,
  Sparkles, AlertCircle, RefreshCw, MessageSquare, ClipboardList, ShieldCheck, BarChart3,
  Copy, Check, Image, FileText, Globe, Upload
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
                <li><strong>טבלת קורסים</strong> — כל הקורסים עם מספר הרשומים, חדשים היום והשבוע, ואחוז מילוי. לחיצה על קורס מעבירה לדף הקורס הייעודי</li>
                <li><strong>שיחות היכרות מתוזמנות</strong> — כל שיחות ההיכרות הפתוחות (כולל פאשיה!) עם <strong>פירוט לפי קורס</strong> — לדוגמה: "נענע (3)", "LBMS (1)", "פאשיה בתנועה (2)". כל תג לחיץ ומסנן את דף השיחות לפי הקורס</li>
                <li><strong>לחזור לקראת הרשמה</strong> — שיחות שממתינות לפתיחת הרשמה לקורס. לחיצה מסננת את דף השיחות לסטטוס זה</li>
                <li><strong>התראות</strong> — קורסים שמתמלאים (90%+), קורסים שעומדים להתחיל</li>
              </ul>
              <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm">
                💡 <strong>כל המספרים בדשבורד הם לחיצות!</strong> לחיצה על כל מספר או סטטיסטיקה מפנה ישירות לרשימה המתאימה (דף משתתפים או דף שיחות) עם הסינון המתאים.
              </div>
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
                <li><strong>חיפוש קורס בדשבורד</strong> — מחפש בטבלת הקורסים ולוחץ על תוצאה → מעביר ישירות לדף הקורס הייעודי (ולא לרשימת המשתתפים)</li>
                <li><strong>פילטר תאריכים</strong> (הכל / היום / השבוע / החודש) — מסנן את כל הנתונים בדשבורד לפי תקופת זמן</li>
                <li><strong>פילטר קטגוריות קורסים</strong> — מסנן את טבלת הקורסים לפי סוג (קורס קבוע, סדנה, פרטי, אונליין)</li>
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
                <li><strong>ייצוא CSV + Google Sheets</strong> — ייצוא רשימת המשתתפים לקובץ או לגיליון Google Sheets</li>
                <li><strong>היסטוריית שיחות</strong> — לכל משתתף ניתן לראות את כל השיחות שלו (בלחיצה על ״הצג היסטוריית שיחות״)</li>
                <li><strong>תאריך כניסת ליד</strong> — נקבע אוטומטית בכניסת ליד (מוואטסאפ, אתר, Gmail) וניתן לעריכה ידנית</li>
                <li><strong>מקורות ליד</strong> — אתר / וואטסאפ / פייסבוק / ידני / אחר</li>
                <li><strong>מחיקה מרובה</strong> — סימון מספר משתתפים ומחיקה בו-זמנית</li>
                <li><strong>שיוך לכמה קורסים</strong> — משתתף יכול להתעניין ולהירשם למספר קורסים במקביל</li>
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
                <StatusBadge name="הודעה מוואטסאפ לבדיקה" color="#D29486" description="הודעה שנכנסה מוואטסאפ שלא עברה סף התעניינות ברור — צריך לבדוק ידנית אם רלוונטי. אופיר מקבלת התראה בוואטסאפ ומאשרת או דוחה." />
                <StatusBadge name="במעקב ראשוני" color="#FAD980" description="נוצר קשר ראשוני, ממתינים לתגובה. מתעדכן אוטומטית כששיחה עוברת ל״בבדיקה״." />
                <StatusBadge name="היה ביום היכרות" color="#8B5CF6" description="הלקוח השתתף ביום היכרות." />
                <StatusBadge name="רשום / נרשם" color="#2ECC71" description="המשתתף רשום ומשלם — נספר במונה הקורס." />
                <StatusBadge name="לחזור לקראת הרשמה" color="#9B59B6" description="הליד מעוניין אבל הקורס עדיין לא פתוח להרשמה, או שרוצים לחזור אליו כשייפתח. משמש באוטומציה — כשקורס נפתח להרשמה, לידים בסטטוס הזה מקבלים שיחה ו/או וואטסאפ אוטומטית." />
                <StatusBadge name="לא רלוונטי" color="#95A5A6" description="ליד שלא מעוניין. מתעדכן אוטומטית ברמת הקורס הספציפי כששיחה עוברת ל״לא רלוונטי״ או ל״אבוד״. הסטטוס הכללי מחושב מחדש לפי הקורס עם הסטטוס החזק ביותר." />
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
                  <span className="text-sm"><strong>ליד חדש</strong> — נקבע אוטומטית כשנכנסת הודעה מוואטסאפ עם ביטוי התעניינות ברור + הקשר לקורס, או מטופס Elementor באתר</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>הודעה מוואטסאפ לבדיקה</strong> — נקבע כשההודעה מכילה הקשר לקורס אבל ללא ביטוי התעניינות ברור. אופיר מקבלת התראה ומאשרת/דוחה</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>במעקב ראשוני</strong> — מתעדכן אוטומטית כששיחה עוברת לסטטוס ״בבדיקה״</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>לא רלוונטי (לפי קורס)</strong> — כששיחה עוברת ל״לא רלוונטי״ או ל״אבוד״, רק <strong>הקורס הספציפי</strong> של אותה שיחה עובר ל"לא רלוונטי". הסטטוס הכללי מחושב מחדש — אם יש קורס אחר בסטטוס חזק יותר, הסטטוס הכללי ישאר אותו קורס</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>תאריך כניסת ליד</strong> — נקבע אוטומטית בכל כניסת ליד (וואטסאפ, אתר, Gmail)</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>אושר מדיניות הפרטיות</strong> — מסומן אוטומטית כשמשתתף ממלא טופס באתר וסימן את צ׳קבוקס ההסכמה. ניתן גם לעדכן ידנית</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>שיחת היכרות לפי קורס</strong> — כשליד חדש (או קיים עם קורס חדש) נכנס מוואטסאפ/אתר, נוצרת אוטומטית שיחת היכרות <strong>עם שם הקורס</strong> (למשל: "שיחת היכרות - נענע"). פאשיה נשארת "שיחת היכרות פאשיה בתנועה". שיחות נפרדות לכל קורס — ליד שמתעניין בשני קורסים יקבל שתי שיחות היכרות!</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>סגירת שיחה ברישום</strong> — כשמשתתף עובר לסטטוס ״רשום״, אם יש שיחה פתוחה מקושרת אליו — היא עוברת אוטומטית לסטטוס ״הושלם״</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>תשלום מ-Summit</strong> — תשלום שנקלט מסאמיט מסמן את המשתתף כ״רשום״, מעדכן את הסכום ששולם, וסוגר שיחת היכרות פתוחה. אותו תשלום לא נספר פעמיים גם אם סאמיט שולח אותו שוב</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>ביטול / זיכוי מ-Summit</strong> — זיכוי מלא מסמן את הקורס כ״ביטול הרשמה״ ומוריד מהמונה. זיכוי חלקי מוריד את הסכום ששולם. הכל נקלט אוטומטית מסאמיט</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>קורס חדש מ-Summit</strong> — מוצר חדש שנמכר בסאמיט ואין לו קורס במערכת — הקורס נוצר אוטומטית ונפתח להרשמה. הוא <strong>לא שולח הודעות</strong> ללקוחות עד שממלאים לו קישורי תשלום ואתר, כך שלא ייצא דבר בטעות</span>
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
                <li>שינוי סטטוס ל<strong>״רשום/נרשם״</strong> → מעלה אוטומטית את מונה הקורס +1 + סוגר שיחות פתוחות מקושרות</li>
                <li>שינוי סטטוס מ<strong>״רשום״</strong> למשהו אחר → מוריד את מונה הקורס -1</li>
                <li>מחיקת משתתף רשום → מוריד אוטומטית את המונה בכל הקורסים שהוא רשום אליהם</li>
                <li>הקורס הראשי (שדה course_id) → קובע איפה המשתתף מוצג בדשבורד</li>
                <li>מערך הקורסים (courses[]) → שומר את כל הקורסים עם <strong>סטטוס נפרד לכל אחד</strong></li>
                <li><strong>שינוי סטטוס לפי קורס</strong> — ניתן לשנות סטטוס לכל קורס בנפרד (dropdown בכרטיס המשתתף). הסטטוס הכללי מחושב אוטומטית לפי הקורס עם הסטטוס "החזק" ביותר (רשום {">"} ליד חדש {">"} לחזור {">"} במעקב {">"} לא רלוונטי)</li>
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
                <li><strong>רשימת קורסים</strong> — בתצוגת כרטיסים או טבלה. <strong>לחיצה על כל קורס (כרטיס או שורה)</strong> מעבירה ישירות לדף הקורס הייעודי</li>
                <li><strong>פרטי קורס</strong> — שם, סוג, לוח זמנים, מיקום, מחיר, תאריכי התחלה וסיום</li>
                <li><strong>מונה רשומים</strong> — מספר רשומים מתעדכן אוטומטית בכל שינוי סטטוס בדף המשתתפים</li>
                <li><strong>מונה לידים משויכים</strong> — כמה לידים (עדיין לא רשומים) משויכים לכל קורס</li>
                <li><strong>סטטוס קורס</strong> — לא פתוח להרשמה, פתוח להרשמה, מלא, בתהליך, הסתיים</li>
                <li><strong>לחיצה על מספר הרשומים/לידים</strong> — מובילה ישירות לדף משתתפים מסונן לפי הקורס והסטטוס</li>
                <li><strong>אימייל מורה</strong> — ניתן לשייך מורה לקורס דרך כתובת מייל (בעריכת קורס)</li>
                <li><strong>לינק ישיר לדף קורס</strong> — בעריכת קורס מופיע URL מלא עם אפשרות העתקה</li>
                <li><strong>ייצוא CSV + Google Sheets</strong> — כפתור לייצוא רשימת הקורסים עם כל הנתונים לקובץ CSV או לגיליון Google Sheets</li>
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
                <li>הלינק מופיע מתחת לשדה אימייל המורה בחלון העריכה — עם <strong>כפתור העתקה</strong> שמעתיק את ה-URL המלא</li>
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
                <li>לוחצים על הכפתור המתאים — הנוכחות נשמרת מיד, והשורה נצבעת בהתאם</li>
                <li><strong>סרגל סיכום</strong> בראש מראה כמה סומנו וכמה עדיין לא (״היום: 5 נוכחים · 18 טרם סומנו״)</li>
                <li>כפתור <strong>״סמן כולם נוכחים״</strong> — מסמן את כולם בלחיצה אחת</li>
                <li><strong>ביטול טעות:</strong> כפתור <strong>״בטל״</strong> ליד שורה שכבר סומנה מנקה אותה, וכפתור <strong>״נקה את כל הסימונים״</strong> מבטל את כולם ליום שנבחר</li>
              </ul>
              <p className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                💡 <strong>אם סימון לא נשמר</strong> — תופיע הודעה אדומה ברורה עם מי לא נשמרה. אם אין הודעה אדומה, הכל נשמר בהצלחה.
              </p>
            </div>
          }
        />
        <FAQItem
          icon={ClipboardList}
          color="#2ECC71"
          question="איפה רואים את הנוכחות בתוך המערכת (לא בדף המורה)?"
          answer={
            <div>
              <p>כל נוכחות שסומנה — בין אם מדף המורה ובין אם מהמערכת — נשמרת באותו מקום ונראית ב<strong>דף הקורס במערכת</strong>:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>נכנסים ל<strong>קורסים</strong> ובוחרים את הקורס</li>
                <li>הקטע <strong>״מעקב נוכחות״</strong> פתוח אוטומטית</li>
                <li>הטבלה <strong>״נוכחות לפי ימים״</strong> מציגה כל מפגש שסומן, עם סיכום נוכחים / נעדרים / איחור</li>
                <li>לחיצה על יום מציגה את הפירוט השמי — מי היה נוכח באותו מפגש</li>
              </ol>
              <p className="mt-3 p-3 bg-purple-50 rounded-lg text-sm">
                💡 דף המורה והמערכת הם שני חלונות לאותם נתונים. מה שהמורה מסמנת מהלינק שלה מופיע כאן מיד, ולהפך.
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
                <li><strong>רשימת שיחות</strong> — עם שם, תיאור, משתתף מקושר, סטטוס, תאריך מתוזמן, ותג קורס סגול כשיש קורס משויך</li>
                <li><strong>תג קורס סגול</strong> — בכרטיס השיחה מוצג הקורס המשויך כדי להבין במהירות לאיזה קורס השיחה קשורה</li>
                <li><strong>זיהוי קורס לשיחת היכרות</strong> — המערכת מחפשת קודם קורס שמוזכר בתיאור השיחה, ואם אין כזה היא מציגה את הקורס האחרון של המשתתף בסטטוס ״ליד חדש״ / ״חדש״, או את הקורס הראשי שלו</li>
                <li><strong>צבעי סטטוסים</strong> — כל סטטוס מוצג בצבע שונה (כמו צבעי הסטטוסים של אנשי קשר) לזיהוי מהיר</li>
                <li><strong>סינון לפי משתתף</strong> — בחירת משתתף ספציפי מסננת את כל השיחות לאותו משתתף</li>
                <li><strong>סינון לפי סטטוס</strong> — בחירת סטטוס ספציפי או חיפוש חופשי</li>
                <li><strong>בחירת משתתף חכמה</strong> — Combobox עם חיפוש לפי שם, טלפון או מייל (גם ביצירת שיחה וגם בסינון)</li>
                <li><strong>סטטיסטיקות לחיצות</strong> — ניסיון לשיחה, בבדיקה, הושלמו, ומתוזמנות — <strong>כל סטטיסטיקה לחיצה שמסננת את הרשימה</strong></li>
                <li><strong>מעבר על הכרטיס</strong> (hover) — מציג כרטיס מהיר של המשתתף עם טלפון, מייל וקורס</li>
                <li><strong>יצירת משתתף חדש</strong> — ניתן ליצור משתתף חדש ישירות מתוך השיחה</li>
                <li><strong>ייבוא / ייצוא CSV + Google Sheets</strong></li>
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
              <StatusBadge name="בבדיקה" color="#3498DB" description="נמצאת בתהליך בדיקה, עדיין לא הושלמה. → הלקוח עובר אוטומטית ל״במעקב ראשוני״." />
              <StatusBadge name="הושלם" color="#6D436D" description="השיחה/משימה טופלה בהצלחה." />
              <StatusBadge name="לחזור לקראת הרשמה" color="#9B59B6" description="הליד מעוניין אך ממתין לפתיחת הרשמה לקורס. אם הקורס כבר פתוח להרשמה ונוסח מתאים שמור בהגדרות — יכולה להישלח גם הודעת וואטסאפ אוטומטית. אם הקורס עדיין לא פתוח — המערכת ממתינה לפתיחת ההרשמה." />
              <StatusBadge name="לא רלוונטי" color="#BDC3C7" description="לא רלוונטי יותר. → משנה אוטומטית את סטטוס הקורס הספציפי של השיחה ל״לא רלוונטי״. הסטטוס הכללי מחושב מחדש לפי סדר עדיפות." />
              <StatusBadge name="אבוד" color="#7F8C8D" description="הליד אבד, לא הצלחנו ליצור קשר. → משנה אוטומטית את סטטוס הקורס הספציפי של השיחה ל״לא רלוונטי״. הסטטוס הכללי מחושב מחדש." />
              <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                ❌ <strong>סטטוסים שהוסרו:</strong> ענתה — הוסר. ״לא ענתה״ שונה ל״ניסיון לשיחה״. ״נוצר משיחה״ — כבר לא נוצר אוטומטית.
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>שיחת היכרות לפי קורס</strong> — נוצרת אוטומטית עם שם הקורס (למשל "שיחת היכרות - LBMS"). כשליד מתעניין בעוד קורס, נוצרת שיחה נפרדת לאותו קורס</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">שינוי שיחה ל<strong>״בבדיקה״</strong> → לקוח עובר אוטומטית ל״במעקב ראשוני״</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">שינוי שיחה ל<strong>״לא רלוונטי״</strong> או <strong>״אבוד״</strong> → <strong>הקורס הספציפי</strong> של אותה שיחה עובר ל"לא רלוונטי", אבל הסטטוס הכללי מחושב מחדש — אם יש קורס אחר בסטטוס חזק יותר (כמו "ליד חדש"), הסטטוס הכללי ישאר אותו קורס</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm">כשמשתתף עובר ל<strong>״רשום״</strong> → שיחות פתוחות מקושרות נסגרות אוטומטית ל<strong>״הושלם״</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <ManualBadge>ידני</ManualBadge>
                  <span className="text-sm">שינוי סטטוס שיחה ל״ניסיון לשיחה״, ״הושלם״, ״לחזור לקראת הרשמה״ — צריך לעדכן ידנית</span>
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
                <li><strong>דשבורד</strong> — שיחות מתוזמנות בסטטוס ״ממתין״ או ״ניסיון לשיחה״, ושיחות ״לחזור לקראת הרשמה״</li>
                <li>שיחות שכבר עברו מסטטוס ״ממתין״ (למשל הושלם, אבוד) — <strong>לא מופיעות יותר בדשבורד</strong></li>
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
                <li><strong>כתיבת ניוזלטר</strong> — 3 מצבים: תבנית מהירה, HTML מתקדם, עורך חופשי</li>
                <li><strong>שליחת מייל</strong> — דרך Amazon SES בפרודקשן (EU Stockholm) כספק ראשי, עם מכסה של 50,000 מיילים ביום וקצב של עד 14 מיילים בשנייה. Gmail נשאר כגיבוי בלבד</li>
                <li><strong>שליחת וואטסאפ</strong> — ניוזלטר דרך וואטסאפ למנויים עם מספר טלפון. מגבלות הבטיחות של וואטסאפ נשארות כפי שהן</li>
                <li><strong>שליחה משולבת</strong> — אפשרות לשלוח גם במייל וגם בוואטסאפ בו-זמנית</li>
                <li><strong>כפתורי CTA</strong> — הוספת כפתורים עם קישורים ותמונות לניוזלטר</li>
                <li><strong>הצעות AI לנושא</strong> — הצעות אוטומטיות לשורת נושא על בסיס תוכן הניוזלטר</li>
                <li><strong>ייבוא מנויים</strong> — העתק-הדבק או קובץ CSV</li>
                <li><strong>היסטוריית שליחות</strong> — מעקב על כל ניוזלטר ששלחת, כולל מספר נמענים, סטטוס, ואפשרות שליחה מחדש</li>
                <li><strong>שליחת מייל ניסיון</strong> — אפשרות לשלוח לעצמך לפני שליחה לכולם</li>
              </ul>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                ✅ <strong>סטטוס:</strong> מערכת הדיוור מאושרת ב-AWS SES Production. עדיין יש מתג הפעלה בהגדרות CRM → לשונית אוטומציה: כשהמתג כבוי — לא יישלחו ניוזלטרים או מיילים שיווקיים.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Image}
          color="#2ECC71"
          question="איך משתמשים בתבנית Anti-Spam?"
          answer={
            <div>
              <p>תבניות Anti-Spam מותאמות במיוחד כדי שהמיילים שלך <strong>יגיעו לתיבת הדואר ולא לספאם</strong>. הן כוללות alt text לתמונות, preheader, יחס טקסט/תמונות מאוזן, ומספר קישורים מצומצם.</p>
              
              <p className="font-semibold mt-4 mb-2">📝 יצירת תבנית חדשה:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>עברי להגדרות CRM → לשונית <strong>״תבניות Anti-Spam״</strong></li>
                <li>לחצי על <strong>״תבנית חדשה״</strong></li>
                <li>תני שם לתבנית ונושא ברירת מחדל</li>
                <li>מלאי את ה-<strong>Preheader</strong> — טקסט נסתר שמופיע בתצוגה מקדימה של Gmail (חשוב מאוד!)</li>
                <li>ערכי את הכותרת העליונה, הברכה והפתיחה</li>
              </ol>

              <p className="font-semibold mt-4 mb-2">🧱 בלוקי תוכן — סוגים:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>📝 טקסט</strong> — כותרת, פסקת תוכן, ואופציונלית כפתור עם קישור</li>
                <li><strong>🖼️ תמונה</strong> — העלאה ישירה (כפתור ״העלאה״) או הדבקת URL. <strong>חובה למלא alt text</strong> (תיאור התמונה) — קריטי למניעת ספאם!</li>
                <li><strong>🎬 סרטון</strong> — קישור ליוטיוב/וימאו עם תמונה ממוזערת אוטומטית</li>
                <li><strong>🔘 כפתור</strong> — כפתור CTA עם טקסט וקישור</li>
              </ul>
              <p className="text-sm text-gray-600 mt-1">ניתן לגרור בלוקים למעלה/למטה עם חצים, להוסיף בלוק אחרי כל בלוק קיים, ולמחוק בלוקים.</p>

              <p className="font-semibold mt-4 mb-2">🖼️ העלאת תמונות:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>בבלוק תמונה, לחצי על כפתור <strong>״העלאה״</strong> הוורוד ובחרי תמונה מהמחשב</li>
                <li>או הדביקי URL ישירות בשדה (עדיף מהדומיין שלך — pantarhei-studio.co.il)</li>
                <li>מלאי תמיד <strong>alt text תיאורי</strong> — לדוגמה: ״סדנת תנועה בסטודיו פנטהריי״ (לא ״תמונה 1״)</li>
              </ul>

              <p className="font-semibold mt-4 mb-2">💾 שמירה ושימוש:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>לחצי <strong>״שמור תבנית״</strong> (גם הכפתור הצף בפינה שמאלית)</li>
                <li>לחצי <strong>״תצוגה מקדימה״</strong> לראות איך המייל ייראה</li>
                <li>בדף הניוזלטר → בחרי <strong>״תבנית מהירה״</strong> → בחרי את התבנית שיצרת → שלחי</li>
              </ul>

              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                💡 <strong>טיפ:</strong> שלחי תמיד <strong>מייל ניסיון לעצמך</strong> לפני שליחה כללית — כך תוכלי לבדוק שהמייל לא נופל לספאם ושהעיצוב נראה כמו שצריך.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ShieldCheck}
          color="#27AE60"
          question="טיפים לשיפור deliverability (הגעה לתיבת הדואר)"
          answer={
            <div>
              <p>כדי שהמיילים שלך יגיעו לתיבת הדואר ולא לספאם, חשוב להקפיד על הכללים הבאים:</p>
              <div className="space-y-3 mt-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ יחס טקסט/תמונות מאוזן</p>
                  <p className="text-sm text-green-700 mt-1">אל תשלחי מייל שהוא רק תמונות! הוסיפי לפחות 2-3 פסקאות טקסט אמיתי בין התמונות. יחס של 60% טקסט / 40% תמונות הוא אידיאלי.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ alt text תיאורי לכל תמונה</p>
                  <p className="text-sm text-green-700 mt-1">כל תמונה חייבת alt text שמתאר מה בתמונה. ״סדנת תנועה בסטודיו פנטהריי״ ולא ״IMG_001״ או ריק.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ Preheader (טקסט תצוגה מקדימה)</p>
                  <p className="text-sm text-green-700 mt-1">מלאי תמיד preheader — זה הטקסט שנראה ב-Gmail לפני פתיחת המייל. משפיע מאוד על שיעור הפתיחה.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ מספר קישורים מצומצם</p>
                  <p className="text-sm text-green-700 mt-1">הגבילי ל-3-5 קישורים לכל היותר. יותר מדי קישורים מעוררים חשד אצל מסנני ספאם.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ תמונות מהדומיין שלך</p>
                  <p className="text-sm text-green-700 mt-1">עדיף להשתמש בתמונות מ-pantarhei-studio.co.il. תמונות מדומיינים לא מוכרים יכולות להפעיל מסנני ספאם.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ שליחה לקבוצות קטנות</p>
                  <p className="text-sm text-green-700 mt-1">אם יש לך רשימה גדולה, שלחי בקבוצות של 200-300 מנויים כדי לשמור על מוניטין שליחה טוב.</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">✅ נושא מייל ברור</p>
                  <p className="text-sm text-green-700 mt-1">נושא ברור ולא קליקבייטי. ״עדכון חודשי מפנטהריי — סדנאות חדשות״ ולא ״!!!לא תאמיני מה מחכה לך!!!״</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-yellow-800">⚠️ מייל ניסיון תמיד לפני שליחה!</p>
                  <p className="text-sm text-yellow-700 mt-1">לחצי ״שלחי מייל ניסיון״ ובדקי שהמייל הגיע לתיבת הדואר (לא לספאם). אם נפל לספאם — בדקי את הטיפים למעלה.</p>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Mail}
          color="#3498DB"
          question="איך שולחים מייל ניסיון?"
          answer={
            <div>
              <p>לפני כל שליחה כללית, <strong>חובה לשלוח מייל ניסיון</strong> לעצמך:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>עברי לדף <strong>ניוזלטר → שליחת ניוזלטר</strong></li>
                <li>בחרי את הערוץ, התבנית והתוכן</li>
                <li>בפינה העליונה לחצי על <strong>״שלחי מייל ניסיון״</strong></li>
                <li>הזיני את <strong>כתובת המייל שלך</strong> ולחצי ״שלח״</li>
                <li>בדקי בתיבת הדואר (ובתיקיית הספאם!) שהמייל הגיע ונראה טוב</li>
              </ol>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                💡 <strong>חשוב:</strong> אם המייל הגיע לספאם — חזרי לתבנית, הוסיפי יותר טקסט, בדקי alt text בתמונות, ושלחי ניסיון שוב.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={BarChart3}
          color="#9B59B6"
          question="מה נמצא בדף סטטיסטיקות ניוזלטר?"
          answer={
            <div>
              <p>דף סטטיסטיקות (נגיש מכפתור ״📊 סטטיסטיקות״ בדף הניוזלטר) מציג נתוני מעקב מ-Amazon SES:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>כרטיסי KPI</strong> — סה״כ פתיחות, קליקים, bounces, ותלונות</li>
                <li><strong>טבלת ביצועי קמפיינים</strong> — לכל ניוזלטר שנשלח: כמה פתחו, כמה לחצו, כמה bounces</li>
                <li><strong>גרף שעות</strong> — באיזה שעות ביום פותחים הכי הרבה מיילים</li>
                <li><strong>אירועים אחרונים</strong> — טבלה עם 50 האירועים האחרונים (מי פתח, מתי, מאיפה)</li>
              </ul>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>פתיחה (Open)</strong> — נרשמת אוטומטית כשנמען פותח את המייל</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>קליק (Click)</strong> — נרשם אוטומטית כשנמען לוחץ על קישור במייל</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>Bounce</strong> — נרשם כשמייל לא מגיע ליעד (כתובת לא קיימת, תיבה מלאה). מונה ה-bounces של המנוי עולה אוטומטית</span>
                </div>
                <div className="flex items-start gap-2">
                  <AutoBadge>אוטומטי</AutoBadge>
                  <span className="text-sm"><strong>תלונה (Complaint)</strong> — נרשמת כשנמען מסמן את המייל כספאם</span>
                </div>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Globe}
          color="#9B59B6"
          question="מה זה מפת פתיחות גאוגרפית (Hotspot)?"
          answer={
            <div>
              <p>בדף <strong>סטטיסטיקות ניוזלטר</strong> יש מפה אינטראקטיבית שמציגה מאיפה פותחים את המיילים שלך:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>בועות על המפה</strong> — כל בועה מייצגת עיר שממנה נפתחו מיילים. ככל שהבועה גדולה יותר — יותר פתיחות</li>
                <li><strong>טבלת מדינות</strong> — פילוח פתיחות וקליקים לפי מדינה</li>
                <li><strong>ערים מובילות</strong> — תגיות עם הערים הפעילות ביותר</li>
              </ul>
              <div className="mt-3 p-3 bg-purple-50 rounded-lg text-sm">
                💡 <strong>הנתונים נאספים אוטומטית</strong> מכל פתיחת מייל חדשה באמצעות GeoIP. פתיחות ישנות (לפני ההפעלה) לא יכללו מיקום.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Upload}
          color="#9B59B6"
          question="איך מייבאים מנויים מ-CSV?"
          answer={
            <div>
              <p>בדף <strong>ניוזלטר → לשונית ייבוא</strong> ניתן לייבא מנויים בשתי דרכים:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li><strong>קובץ CSV</strong> — העלאת קובץ עם כותרות (email, name, phone, תפקיד, חברה, הערות — גם בעברית)</li>
                <li><strong>העתק-הדבק</strong> — הדבקת טקסט בפורמט: מייל, וואטסאפ, שם, תפקיד, חברה, הערות</li>
              </ol>
              <p className="font-semibold mt-3 mb-2">תהליך הייבוא:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>בוחרים <strong>קבוצת יעד</strong> (קיימת או חדשה) — כל המנויים ישויכו אליה</li>
                <li>המערכת <strong>מזהה כפילויות</strong> אוטומטית (לפי מייל או וואטסאפ)</li>
                <li>מנויים קיימים <strong>מקבלים את הקבוצה</strong> בנוסף לקבוצות הקיימות שלהם</li>
                <li>בסוף מוצג סיכום: חדשים, עודכנו, דולגו</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                💡 <strong>טיפ:</strong> לחצי על "הורידי CSV לדוגמה" כדי לראות את הפורמט הנכון ולבדוק שהייבוא עובד.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={Copy}
          color="#9B59B6"
          question="איך משכפלים בלוקים בתבנית Anti-Spam?"
          answer={
            <div>
              <p>בעורך תבניות Anti-Spam (הגדרות CRM → תבניות Anti-Spam), ליד כל בלוק יש כפתור <strong>שכפול</strong>:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>לחצי על <strong>אייקון השכפול</strong> (שני מסמכים) ליד הבלוק שרוצים לשכפל</li>
                <li>הבלוק המשוכפל יווצר <strong>מתחת</strong> לבלוק המקורי עם כל התוכן</li>
                <li>ניתן לשכפל כל סוג בלוק: טקסט, תמונה, סרטון, כפתור</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={MessageSquare}
          color="#25D366"
          question="איך שולחים דיוור וואטסאפ בתבנית מאושרת?"
          answer={
            <div>
              <ol className="list-decimal list-inside space-y-1">
                <li>בחרי תבנית מהרשימה (למשל: תזכורת יום היכרות).</li>
                <li>בחרי קורס מהרשימה — המועד והקישור יתמלאו אוטומטית מפרטי הקורס. אפשר לערוך ידנית אם צריך. שם הנמען מתווסף אוטומטית לכל אחד.</li>
                <li>בחרי קבוצת תפוצה. אם יש מי שלא רוצה שיקבל — הורידי לו את הסימון ברשימה (הוא נשאר בקבוצה, רק לא מקבל את הדיוור הזה).</li>
                <li>לחצי ״שלח ניוזלטר״.</li>
              </ol>
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                💡 תבנית מאושרת של מטא מגיעה לכל הנמענות גם מחוץ לחלון 24 השעות, בניגוד לטקסט חופשי שמגיע רק למי שכתב לנו לאחרונה. לכן לדיוור יזום — תמיד להשתמש בתבנית.
              </div>
            </div>
          }
        />
        <FAQItem
          icon={MessageSquare}
          color="#25D366"
          question="מה עם קישור הסרה בוואטסאפ?"
          answer={
            <div>
              <p><strong>קישור הסרה מתווסף אוטומטית</strong> לכל הודעת ווצאפ שנשלחת מהניוזלטר.</p>
              <p className="mt-2">את <strong>לא צריכה להוסיף כלום</strong> — המערכת מוסיפה בסוף כל הודעה:</p>
              <div className="mt-2 p-3 bg-green-50 rounded-lg font-mono text-xs text-green-800" dir="ltr">
                ---<br />
                להסרה מרשימת התפוצה: https://...
              </div>
              <p className="mt-2 text-sm">הקישור ייחודי לכל מנוי/ה ומסיר אותם מהרשימה בלחיצה אחת.</p>
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
                    <li>הודעה עם <strong>הקשר לקורס בלבד</strong> (ללא ביטוי ברור) → נוצר ליד ״הודעה מוואטסאפ לבדיקה״ + <strong>התראה לאופיר בוואטסאפ ומייל</strong>. אופיר יכולה לאשר (״כן [שם]״) או לדחות (״לא [שם]״ → <strong>הליד נמחק לחלוטין מהמערכת</strong>)</li>
                    <li>הודעה <strong>ללא הקשר לקורס</strong> → מתעלמים (לא נוצר כלום)</li>
                    <li>אם המשתתף <strong>כבר קיים</strong> → מעדכן פרטים + מוסיף קורס חדש אם רלוונטי + יוצר שיחת היכרות חדשה לקורס החדש</li>
                    <li><strong>אנשי קשר מוכרים</strong> (מוגדרים בהגדרות CRM) מתעלמים ולא נחשבים כלידים</li>
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
                  <p className="font-bold text-yellow-800 mb-1">🔄 שינוי סטטוס שיחה → עדכון לקוח + הודעות וואטסאפ</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    <li>שיחה עוברת ל<strong>״ניסיון לשיחה״</strong> → נשלחת הודעת וואטסאפ מיידית לפי נוסח ההגדרות</li>
                    <li>שיחה עוברת ל<strong>״בבדיקה״</strong> → הלקוח המקושר עובר אוטומטית ל<strong>״במעקב ראשוני״</strong></li>
                    <li>שיחה עוברת ל<strong>״בבדיקה״</strong> או <strong>״לחזור לקראת הרשמה״</strong> → יכולה להישלח הודעת וואטסאפ אוטומטית רק לקורסי נענע/LBMS, ורק אם הקורס כבר <strong>פתוח להרשמה</strong></li>
                    <li>אם הקורס עדיין לא פתוח להרשמה — המערכת לא שולחת וואטסאפ בשלב הזה וממתינה לפתיחת הרשמה</li>
                    <li>שיחה עוברת ל<strong>״לא רלוונטי״</strong> → <strong>הקורס הספציפי</strong> של אותה שיחה עובר ל"לא רלוונטי". הסטטוס הכללי מחושב מחדש</li>
                    <li>שיחה עוברת ל<strong>״אבוד״</strong> → אותו דבר — הקורס הספציפי עובר ל"לא רלוונטי", הסטטוס הכללי מחושב מחדש</li>
                  </ul>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <p className="font-bold text-indigo-800 mb-1">✅ משתתף הופך ל״רשום״ → סגירת שיחות</p>
                  <ul className="list-disc list-inside text-sm text-indigo-700 space-y-1">
                    <li>כשמשתתף עובר לסטטוס <strong>״רשום״</strong> — כל השיחות הפתוחות שמקושרות אליו עוברות אוטומטית ל<strong>״הושלם״</strong></li>
                    <li>מונה הרשומים בקורס עולה ב-1</li>
                  </ul>
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                  <p className="font-bold text-teal-800 mb-1">🎓 פתיחת הרשמה לקורסי נענע/LBMS</p>
                  <ul className="list-disc list-inside text-sm text-teal-700 space-y-1">
                    <li>כשקורס נענע או LBMS עובר מ<strong>״לא פתוח להרשמה״</strong> ל<strong>״פתוח להרשמה״</strong>:</li>
                    <li>המערכת מחפשת <strong>לידים משויכים</strong> לקורס שיש להם שיחות בסטטוס ״לחזור לקראת הרשמה״</li>
                    <li>נוצרות אוטומטית <strong>שיחות בדיקה להרשמה</strong> לכל ליד רלוונטי (מתוזמנות ליום למחרת)</li>
                    <li>נשלחת גם <strong>הודעת וואטסאפ</strong> לפי נוסח ההגדרות המתאים לקורס LBMS או נענע</li>
                    <li>אם אין נוסח שמור בהגדרות — שליחת הוואטסאפ תידלג, אבל יצירת השיחה והמייל לאדמין עדיין יתבצעו</li>
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

                <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                  <p className="font-bold text-sky-800 mb-1">📧 מעקב מיילים (SES Tracking)</p>
                  <ul className="list-disc list-inside text-sm text-sky-700 space-y-1">
                    <li>כל מייל שנשלח דרך Amazon SES מקבל <strong>מעקב אוטומטי</strong> על פתיחות וקליקים</li>
                    <li><strong>פתיחה</strong> — נרשמת כשנמען פותח את המייל</li>
                    <li><strong>קליק</strong> — נרשם כשנמען לוחץ על קישור במייל</li>
                    <li><strong>Bounce</strong> — נרשם כשמייל לא מגיע ליעד. מונה bounces של המנוי עולה אוטומטית</li>
                    <li><strong>תלונה</strong> — נרשמת כשנמען מסמן כספאם</li>
                    <li>כל האירועים נצברים ומוצגים בדף <strong>סטטיסטיקות ניוזלטר</strong></li>
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
                    <li>מקבל הודעות נכנסות ומנתח אותן (ביטויי התעניינות + שמות קורסים)</li>
                    <li>שולח הודעות תגובה אוטומטיות ללידים חדשים</li>
                    <li>שולח התראות לאופיר על הודעות ״לבדיקה״</li>
                    <li>שולח ניוזלטרים דרך וואטסאפ</li>
                    <li>מזהה אנשי קשר מוכרים (הגדרות CRM) ומתעלם מהם</li>
                  </ul>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="font-bold text-gray-800 mb-2">📧 Amazon SES Production + Gmail גיבוי (דיוור)</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>שליחת ניוזלטרים ומיילים דרך <strong>Amazon SES Production</strong> ב-EU Stockholm</li>
                    <li>מכסת AWS מאושרת: <strong>50,000 מיילים ביום</strong>, עד <strong>14 מיילים בשנייה</strong></li>
                    <li>אם SES לא זמין — נופל אוטומטית ל-<strong>Gmail API</strong> כגיבוי</li>
                    <li><strong>מעקב פתיחות וקליקים</strong> — SES Configuration Set + SNS → נתונים מגיעים אוטומטית למערכת</li>
                    <li>✅ <strong>נשלט על ידי מתג הפעלה</strong> בהגדרות CRM → אוטומציה. כשהמתג כבוי — לא נשלחים מיילים</li>
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
                  <p className="font-bold text-gray-800 mb-2">📬 Gmail Lead Watcher (רשת ביטחון)</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>בודק כל 30 דקות אם הגיעו מיילים חדשים מ-Elementor עם לידים שלא נקלטו דרך webhook</li>
                    <li>אם נמצא ליד שלא קיים במערכת — יוצר אותו אוטומטית</li>
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
                  <p className="font-bold text-gray-800 mb-2">💾 גיבויים אוטומטיים</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li><strong>גיבוי שבועי למייל</strong> — כל יום ראשון בשעה 10:00 נשלח גיבוי מלא של כל הנתונים למייל</li>
                    <li><strong>גיבוי שבועי ל-Google Drive</strong> — כל יום ראשון בחצות נשמר גיבוי אוטומטי בדרייב</li>
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
                <li>יש שלושה נוסחים מרכזיים לאוטומציות וואטסאפ: <strong>ניסיון לשיחה</strong>, <strong>קורסי LBMS</strong>, ו<strong>קורסי נענע</strong></li>
                <li>בנוסחי LBMS/נענע אפשר להשתמש גם ב-{`{{course}}`} לשם הקורס וב-{`{{status}}`} לסטטוס השיחה</li>
                <li>ניתן לשלוח <strong>הודעת בדיקה</strong> למספר וואטסאפ אחד לפני שימוש בנוסח</li>
                <li>התגובה הכללית נשלחת רק <strong>ללידים חדשים</strong> שזוהו כהתעניינות ברורה</li>
                <li>הודעות ש״לבדיקה״ <strong>לא מקבלות תגובה אוטומטית</strong> — אופיר מקבלת התראה ומאשרת/דוחה</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* סוכן AI */}
      <Section title="סוכן AI לוואטסאפ" icon={MessageSquare} color="#25D366">
        <FAQItem
          icon={MessageSquare}
          question="מה הסוכן AI יכול לעשות?"
          answer={
            <div>
              <p>סוכן ה-AI מחובר לוואטסאפ ומאפשר לנהל את המערכת דרך הודעות:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>ליצור ולעדכן משתתפים</strong> — הוספת ליד חדש, שינוי סטטוס, עדכון פרטים</li>
                <li><strong>ליצור ולעדכן קורסים</strong> — הוספת קורס, שינוי סטטוס, עדכון פרטים</li>
                <li><strong>ליצור ולעדכן שיחות</strong> — יצירת שיחת היכרות, עדכון סטטוס, תיזמון</li>
                <li><strong>לקרוא נתונים</strong> — שאלות כמו ״כמה לידים יש?״, ״מה הסטטוס של קורס X?״, ״איזה שיחות מתוזמנות להיום?״</li>
                <li><strong>להסביר על המערכת</strong> — שאלות כמו ״מה זה סטטוס במעקב ראשוני?״, ״איך עובדת האוטומציה?״</li>
              </ul>
              <p className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                💡 <strong>חיבור:</strong> ניתן לחבר את הסוכן בהגדרות CRM → לשונית אוטומציה → כפתור ״חבר לוואטסאפ״.
              </p>
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
                <li><strong>סטטוסים ושלבים</strong> — הוספה, מחיקה ועריכת צבע של סטטוסי לידים, שיחות, קורסים, ומקורות ליד. סטטוסים מוגנים (משמשים באוטומציות) לא ניתנים למחיקה</li>
                <li><strong>אוטומציה</strong> — הגדרות וואטסאפ, תגובה אוטומטית, חיבור סוכן AI, <strong>מתג הפעלת דיוור (AWS SES Production/Gmail גיבוי)</strong>, <strong>בדיקת תקינות SES Configuration Set</strong>, Webhook, קישור תשלום</li>
                <li><strong>אנשי קשר וואטסאפ</strong> — ניהול מספרי טלפון מוכרים שלא ייחשבו כלידים חדשים</li>
                <li><strong>תבניות מייל</strong> — עורך תבניות לניוזלטרים עם בלוקים (טקסט, תמונה, וידאו, כפתור, מידע קשר, רשתות חברתיות)</li>
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

      {/* סטטוס לפי קורס */}
      <Section title="סטטוס לפי קורס — איך זה עובד?" icon={RefreshCw} color="#8B5CF6">
        <FAQItem
          icon={RefreshCw}
          color="#8B5CF6"
          question="מה זה סטטוס לפי קורס ואיך זה שונה מקודם?"
          answer={
            <div>
              <p className="mb-3">בעבר לכל משתתף היה <strong>סטטוס אחד כללי</strong> שהשתנה עם כל פעולה. עכשיו <strong>לכל קורס של המשתתף יש סטטוס נפרד</strong>:</p>
              <div className="space-y-2">
                <div className="p-3 bg-purple-50 rounded-lg text-sm">
                  <p className="font-medium text-purple-800">דוגמה: מרב בן דור הלוי</p>
                  <ul className="list-disc list-inside mt-1 text-purple-700 space-y-1">
                    <li>נענע → <strong>ליד חדש</strong></li>
                    <li>פאשיה → <strong>לא רלוונטי</strong></li>
                  </ul>
                  <p className="mt-1 text-purple-600">הסטטוס הכללי שלה: <strong>ליד חדש</strong> (כי ליד חדש חזק יותר מלא רלוונטי)</p>
                </div>
              </div>
              <p className="mt-3 font-semibold">סדר עדיפות הסטטוסים (מהחזק לחלש):</p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                <li>רשום/נרשם</li>
                <li>ליד חדש</li>
                <li>לחזור לקראת הרשמה</li>
                <li>במעקב ראשוני</li>
                <li>היה ביום היכרות</li>
                <li>הודעה מוואטסאפ לבדיקה</li>
                <li>לא רלוונטי</li>
              </ol>
            </div>
          }
        />
        <FAQItem
          icon={AlertCircle}
          color="#8B5CF6"
          question="איך משנים סטטוס של קורס ספציפי?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li>בכרטיס המשתתף → סקשן <strong>"קורסים"</strong></li>
                <li>ליד כל קורס יש <strong>כפתור סטטוס סגול</strong> עם חץ — לחיצה פותחת dropdown</li>
                <li>בוחרים סטטוס חדש → נשמר מיד</li>
                <li>הסטטוס הכללי <strong>מתעדכן אוטומטית</strong> לפי סדר העדיפות</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={Zap}
          color="#8B5CF6"
          question="מה קורה כששיחה עוברת ל'לא רלוונטי' — רק הקורס הספציפי מושפע?"
          answer={
            <div>
              <p><strong>כן!</strong> כשמשנים שיחת היכרות ל"לא רלוונטי" או "אבוד":</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>המערכת מזהה <strong>לאיזה קורס השיחה שייכת</strong> (מתוך שם המשימה, למשל "שיחת היכרות - נענע")</li>
                <li>רק <strong>הקורס הזה</strong> עובר לסטטוס "לא רלוונטי"</li>
                <li>אם יש קורס אחר בסטטוס חזק יותר (למשל "ליד חדש") — <strong>הסטטוס הכללי לא משתנה</strong></li>
                <li>אותה לוגיקה גם ל"בבדיקה" → "במעקב ראשוני" — רק הקורס הספציפי מושפע</li>
              </ul>
            </div>
          }
        />
        <FAQItem
          icon={CheckSquare}
          color="#8B5CF6"
          question="איך שיחות היכרות עובדות עכשיו?"
          answer={
            <div>
              <p className="mb-2">כל שיחת היכרות נקראת <strong>לפי הקורס</strong>:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>"שיחת היכרות - נענע"</li>
                <li>"שיחת היכרות - LBMS"</li>
                <li>"שיחת היכרות - לאבאן"</li>
                <li>"שיחת היכרות פאשיה בתנועה" (שם מיוחד, כמו שהיה)</li>
              </ul>
              <p className="mt-3">ליד שמתעניין ב<strong>שני קורסים</strong> יקבל <strong>שתי שיחות היכרות נפרדות</strong>.</p>
              <p className="mt-2">בדשבורד מוצג <strong>פירוט לפי קורס</strong> — כמה שיחות פתוחות לכל קורס, עם תגים לחיצים שמסננים את דף השיחות.</p>
            </div>
          }
        />
        <FAQItem
          icon={AlertCircle}
          color="#E74C3C"
          question="מה קורה כשאופיר דוחה ליד (כותבת 'לא')?"
          answer={
            <div>
              <p><strong>הליד נמחק לחלוטין מהמערכת</strong> (לא רק מסומן כ"לא רלוונטי").</p>
              <p className="mt-2">אופיר תקבל אישור: <strong>"❌ הליד [שם] נמחק מהמערכת."</strong></p>
              <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                ⚠️ <strong>חשוב:</strong> המחיקה סופית! אם ליד נמחק בטעות, צריך ליצור אותו מחדש ידנית.
              </div>
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
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">3a</span>
                <span className="text-sm"><strong>התעניינות ברורה:</strong> נוצר ליד חדש + שיחת היכרות (מתוזמנת ליומיים) + תגובה אוטומטית</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">3b</span>
                <span className="text-sm"><strong>הקשר לקורס בלבד:</strong> נוצר ליד ״לבדיקה״ + אופיר מקבלת התראה בוואטסאפ ומייל. אופיר עונה ״כן [שם]״ לאישור או ״לא [שם]״ → <strong>הליד נמחק לחלוטין מהמערכת</strong> (מחיקה סופית!)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">את מקבלת התראה בדשבורד → עוברת לשיחות → מתקשרת → מעדכנת סטטוס</span>
              </div>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="ליד קיים מתעניין בקורס נוסף — מה קורה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">ליד ששולח הודעה בוואטסאפ/ממלא טופס עם קורס שהוא לא משויך אליו</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">המערכת מזהה שזה ליד קיים → מוסיפה את הקורס החדש למערך הקורסים שלו</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">נוצרת <strong>שיחת היכרות חדשה</strong> מקושרת אליו (אם אין שיחה פתוחה)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">נשלחת תגובה אוטומטית ללקוח</span>
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
                <span className="text-sm">משנה סטטוס ל״רשום/נרשם״ → מונה הקורס עולה אוטומטית + שיחות פתוחות נסגרות</span>
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
                <span className="text-sm">ודאי שמתג הדיוור <strong>מופעל</strong> בהגדרות CRM → אוטומציה. השליחה מתבצעת דרך AWS SES Production</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">עוברת לדף ניוזלטר → לשונית ״שליחת ניוזלטר״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">בוחרת ערוץ שליחה (מייל / וואטסאפ / שניהם)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">בוחרת <strong>״תבנית מהירה״</strong> → בוחרת תבנית Anti-Spam שיצרת (מומלץ!), או HTML מתקדם / עורך חופשי</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">בוחרת קבוצת נמענים. ניתן להשתמש בהצעות AI לשורת נושא</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">שולחת מייל ניסיון לעצמך לבדיקה</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">6</span>
                <span className="text-sm">לוחצת ״שלח ניוזלטר״ → הניוזלטר נשלח דרך AWS SES Production + נרשם בהיסטוריה + מעקב פתיחות וקליקים</span>
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
                <span className="text-sm">בדשבורד — רואה שיחות מתוזמנות בסטטוס ״ניסיון לשיחה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">לוחצת על הסטטיסטיקה → עוברת לדף השיחות מסונן</span>
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
                <span className="text-sm">אם מעדכנת ל״ניסיון לשיחה״ — נשלחת וואטסאפ מיידית לפי נוסח ההגדרות. אם אחרי כמה נסיונות אין מענה → משנה ל״אבוד״ → <strong>הקורס הספציפי</strong> של השיחה עובר ל"לא רלוונטי". הסטטוס הכללי מחושב מחדש — אם יש קורס אחר בסטטוס חזק יותר, הסטטוס הכללי לא ישתנה</span>
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
                <span className="text-sm">בדף הקורסים → עורכת קורס נענע או LBMS → משנה סטטוס ל״פתוח להרשמה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">המערכת מחפשת אוטומטית לידים שמשויכים לקורס נענע/LBMS עם שיחות ״לחזור לקראת הרשמה״</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">נוצרת אוטומטית שיחת ״בדיקה להרשמה״ לכל ליד רלוונטי (מתוזמנת ליום למחרת)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">נשלחת הודעת וואטסאפ לפי נוסח ההגדרות, אם קיים נוסח שמור; אם אין נוסח — הוואטסאפ מדולג</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">נשלח גם מייל התראה לאדמין עם רשימת הלידים שנמצאו, ואז עוברת לדף השיחות → רואה את השיחות החדשות → מתקשרת ללידים</span>
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
          question="שיחה עברה ל׳לחזור לקראת הרשמה׳ כשהקורס כבר פתוח — מה קורה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">מעדכנת שיחה לסטטוס <strong>״לחזור לקראת הרשמה״</strong></span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">המערכת מזהה את הקורס המשויך לשיחה דרך התיאור, הקורס החדש האחרון של המשתתף, או הקורס הראשי</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">אם זה קורס נענע או LBMS והוא כבר פתוח להרשמה — נשלחת הודעת וואטסאפ לפי נוסח ההגדרות</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">אם אין נוסח שמור או שהקורס לא פתוח — שליחת הוואטסאפ מדולגת והשיחה נשארת למעקב</span>
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
                <span className="text-sm">העתיקי את הלינק שמופיע מתחת לשדה (כפתור העתקה שמעתיק URL מלא)</span>
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
          question="ליד נדחה מקורס אחד אבל עדיין פעיל בקורס אחר — מה קורה?"
          answer={
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">1</span>
                <span className="text-sm">נניח שמרב משויכת לנענע (ליד חדש) ולפאשיה (ליד חדש)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">2</span>
                <span className="text-sm">שיחת היכרות פאשיה עוברת ל״לא רלוונטי״ → <strong>רק פאשיה</strong> עוברת ל"לא רלוונטי"</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                <span className="text-sm">נענע נשארת <strong>"ליד חדש"</strong> — ללא שינוי</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">4</span>
                <span className="text-sm">הסטטוס הכללי של מרב: <strong>"ליד חדש"</strong> (כי "ליד חדש" חזק מ"לא רלוונטי")</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                <span className="text-sm">שיחת ההיכרות של נענע <strong>נשארת פתוחה</strong> בדשבורד ובדף השיחות</span>
              </div>
              <p className="mt-3 p-3 bg-purple-50 rounded-lg text-sm">
                💡 <strong>זה היתרון של סטטוס לפי קורס!</strong> בעבר כל דחייה הייתה מסמנת את הליד כולו כ"לא רלוונטי". עכשיו — רק הקורס הספציפי מושפע.
              </p>
            </div>
          }
        />
        <FAQItem
          icon={ArrowRight}
          color="#F39C12"
          question="איך מייצאים רשימת קורסים או משתתפים?"
          answer={
            <div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>קורסים:</strong> בדף הקורסים → כפתורי ייצוא CSV + Google Sheets — יכלול שם, סוג, סטטוס, לוז, מיקום, מחיר, רשומים, לידים, מקסימום, ואימייל מורה</li>
                <li><strong>משתתפים:</strong> בדף המשתתפים → כפתורי ייצוא CSV + Google Sheets — יכלול את כל הנתונים המוצגים</li>
                <li>הייצוא כולל רק את הרשומות המוצגות (אחרי חיפוש/סינון)</li>
              </ul>
            </div>
          }
        />
      </Section>

      {/* Share Link */}
      <ShareGuideLink />
    </div>
  );
}

function ShareGuideLink() {
  const [copied, setCopied] = useState(false);
  
  const getGuideUrl = () => {
    const base = window.location.origin;
    return `${base}/CRMSettings?tab=user-guide`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getGuideUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <BookOpen className="w-5 h-5 text-[#6D436D]" />
        <h3 className="font-bold text-gray-900">שיתוף המדריך</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        העתיקי את הקישור ושלחי למי שצריכה גישה ישירה למדריך הזה
      </p>
      <div className="flex items-center gap-2 max-w-lg mx-auto">
        <input
          type="text"
          readOnly
          value={getGuideUrl()}
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 text-left dir-ltr"
          dir="ltr"
          onClick={(e) => e.target.select()}
        />
        <button
          onClick={handleCopy}
          className={`px-5 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            copied 
              ? 'bg-green-600 text-white' 
              : 'bg-[#6D436D] text-white hover:bg-[#5a365a]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              הועתק!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              העתק קישור
            </>
          )}
        </button>
      </div>
    </div>
  );
}