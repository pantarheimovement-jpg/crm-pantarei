import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// pricingToolData — נתונים מצטברים לכלי התמחור/תקציב (Cloudflare).
// קריאה בלבד. מוגן במפתח משותף (השרת של הכלי שולח אותו; לעולם לא בדפדפן).
// הלוגיקה משוכפלת מ-CourseRevenue.jsx (Phase A) — סטטוסים, paid_so_far, תחזית הו"ק.

const PRICING_TOOL_KEY = Deno.env.get('PRICING_TOOL_KEY') ||
  '8-aLwN8Pw4C2DSj9BdisBy_STj25tP6NYt_RYCobuS0'; // fallback עד שיוגדר secret ב-CLI

const REGISTERED_STATUSES = new Set(['רשום', 'נרשם', 'רשומה ליום היכרות']);
const FORECAST_STATUS = 'נוצרה הוראת קבע';

// הכנסת סאמיט חודשית — מפרסר שורות ההערה כמו parseSummitEvents.js (Phase A).
// עוגן: "בתאריך YYYY-MM-DD" + "(₪<סכום>)". זיכוי/ביטול גובר על "תשלום".
function sumitMonthlyNet(students) {
  const monthly = {}; // 'YYYY-MM' -> { payments, credits }
  for (const s of students || []) {
    for (const rawLine of (s.notes || '').split('\n')) {
      const line = rawLine.trim();
      const dm = line.match(/בתאריך (\d{4})-(\d{2})-\d{2}/);
      const am = line.match(/\(₪\s*(-?[\d.,]+)\)/);
      if (!dm || !am) continue;
      const amount = parseFloat(am[1].replace(/,/g, ''));
      if (isNaN(amount)) continue;
      const isCredit = /זיכוי|ביטול הרשמה/.test(line);
      const isPayment = /^תשלום/.test(line);
      if (!isCredit && !isPayment) continue;
      const ym = `${dm[1]}-${dm[2]}`;
      const bucket = (monthly[ym] ||= { payments: 0, credits: 0 });
      if (isCredit) bucket.credits += Math.abs(amount);
      else bucket.payments += amount;
    }
  }
  const net = {};
  for (const [ym, b] of Object.entries(monthly)) {
    net[ym] = Math.round(b.payments - b.credits);
  }
  return net;
}

Deno.serve(async (req) => {
  try {
    let key = new URL(req.url).searchParams.get('key');
    if (!key && req.method === 'POST') {
      key = (await req.json().catch(() => ({})))?.key;
    }
    if (key !== PRICING_TOOL_KEY) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const [courses, students] = await Promise.all([
      base44.asServiceRole.entities.Course.list(),
      base44.asServiceRole.entities.Student.list(),
    ]);

    const num = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    const result = courses.map((course) => {
      let registered = 0, forecast = 0, collected = 0, expected = 0;
      for (const s of students) {
        const entries = (s.courses || []).filter((c) => c.course_id === course.id);
        if (!entries.length) continue;
        const registeredAll = (s.courses || []).filter((c) => REGISTERED_STATUSES.has(c.status));
        for (const e of entries) {
          if (REGISTERED_STATUSES.has(e.status)) {
            registered++;
            // כסף בפועל: paid_so_far; נפילה ל-amount_paid רק כשזה הרישום הרשום היחיד
            if (e.paid_so_far !== null && e.paid_so_far !== undefined && e.paid_so_far !== '') {
              collected += num(e.paid_so_far);
            } else if (registeredAll.length === 1) {
              collected += num(s.amount_paid);
            }
          }
          if (e.status === FORECAST_STATUS) forecast++;
          // תחזית: מחיר אפשרות → total_price → הו"ק (מחזורים × סכום; דורש backfill של payments_total)
          if (e.status === FORECAST_STATUS || REGISTERED_STATUSES.has(e.status)) {
            const opt = (course.options || []).find((o) => o.id === e.option_id || o.option_id === e.option_id);
            const optPrice = num(opt?.price);
            const tp = num(e.total_price);
            const inst = num(e.installment_amount) * num(e.payments_total);
            expected += optPrice || tp || inst || 0;
          }
        }
      }
      return {
        id: course.id,
        name: course.name,
        kind: course.kind || null,
        is_annual_program: !!course.is_annual_program,
        registered_count: registered,
        forecast_count: forecast,
        collected: Math.round(collected),
        expected: Math.round(expected),
      };
    }).filter((c) => c.registered_count || c.forecast_count || c.collected);

    return Response.json({
      generated_at: new Date().toISOString(),
      students_scanned: students.length,
      courses: result,
      monthly_income: sumitMonthlyNet(students), // סליקת סאמיט נטו לפי חודש חיוב
    });
  } catch (e) {
    console.error('pricingToolData error:', e);
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});
