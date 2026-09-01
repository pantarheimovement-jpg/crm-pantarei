import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { autoCreateCourseFromProduct } from '../../shared/sumitProducts.ts';
import { isIntroDayCourse, programForIntroDay } from '../../shared/introDayPrograms.ts';
import { cohortFromDate } from '../../shared/cohort.ts';

// =====================================================
// handleSummitPayment v4
// - שכבת שיוך ראשונה: SumitProductMap (עריכה מהמסך, לא מהקוד)
// - שכבה שנייה: COURSE_MAPPINGS הקשיח (נשאר כגיבוי לתבניות רג'קס)
// - שכבה שלישית: תיבת נכנסות (ממתין לשיוך, בלי יצירת קורס)
// - כל התאמה (שכבה 1 או 2) כותבת/מעדכנת רשומת SumitProductMap אוטומטית
// - הקטלוג (resolveCatalogName) נכתב ל-Course.summit_catalog + SumitProductMap.summit_catalog
// - option_id נכתב על רישום המשתתפת, ומונה current_students מתעדכן גם ברמת האפשרות
// =====================================================

const OPEN_LEAD_STATUSES = ['ליד חדש', 'חדש', 'לחזור לקראת הרשמה', 'במעקב ראשוני', 'היה ביום היכרות', 'הודעה מוואטסאפ לבדיקה', 'תיאום שיחה'];
const REGISTERED_STATUSES = ['רשום', 'נרשם'];
const OPEN_FOR_REGISTRATION = 'פתוח להרשמה';
const CANCELLED_STATUS = 'ביטול הרשמה';
const REFUND_TAG = 'זיכוי';
const PENDING_TAG = 'ממתין לשיוך לקורס';
// רישום ליום היכרות אינו הרשמה לתוכנית — הוא הסטטוס שממנו נגזר הליד לתוכנית
const INTRO_STATUS = 'רשומה ליום היכרות';

function normalizeName(value) {
  return String(value || '')
    .replace(/["'״׳`]/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseNum(value) {
  if (value === null || value === undefined) return null;
  const num = parseFloat(String(value).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(num) ? num : null;
}

// שליפת ערך מאובייקט פריט לפי רשימת שמות אפשריים
function pickFrom(obj, names) {
  for (const name of names) {
    const value = obj?.[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

// שם הקטלוג (דף התשלום) שאליו שייך המוצר. סאמיט שולח אותו — התצוגה
// "תשלומים במערכת / כל השדות" שעליה יושב הטריגר כוללת עמודת "קטלוג".
// השם המדויק של המפתח ב-JSON לא מתועד, ולכן: קודם שמות מוכרים, אחר כך
// סריקה של כל מפתח שנראה כמו קטלוג, ולבסוף על הפריט עצמו. מה שנתפס
// נכתב ללוג — כך החיוב האמיתי הבא מאמת את השם לבד.
function resolveCatalogName(properties, item) {
  // ערך שנראה כמו שם קטלוג — ולא כמו בלוק JSON. ב-29.7 התגלה שהסריקה
  // הגנרית תפסה את בלוק זיהוי ההונאה של סאמיט (IPAddress, RecaptchaScore)
  // וכתבה אותו כ"קטלוג" בהערות. מכאן: כל מועמד עובר אימות צורה.
  const looksLikeName = (s) =>
    typeof s === 'string' && s.trim() && s.trim().length <= 60 &&
    !s.trim().startsWith('{') && !s.trim().startsWith('[') &&
    !/IPAddress|Recaptcha|Alerts|Complexity/i.test(s);
  const asName = (v) => {
    const first = Array.isArray(v) ? v[0] : v;
    if (!first) return null;
    const candidate = typeof first === 'string' ? first : (typeof first?.Name === 'string' ? first.Name : null);
    return looksLikeName(candidate) ? candidate.trim() : null;
  };
  for (const key of ['Billing_Catalog', 'Billing_PurchasePage', 'Billing_Folder', 'Catalog', 'PurchasePage', 'קטלוג']) {
    const name = asName(properties?.[key]);
    if (name) { console.log(`🗂️ Catalog from "${key}": ${name}`); return name; }
  }
  for (const key of Object.keys(properties || {})) {
    if (!/catalog|purchasepage|folder|קטלוג/i.test(key)) continue;
    const name = asName(properties[key]);
    if (name) { console.log(`🗂️ Catalog found under key "${key}": ${name}`); return name; }
  }
  const onItem = asName(item?.Catalog) || asName(item?.Folder) || asName(item?.PurchasePage);
  if (onItem) { console.log(`🗂️ Catalog from the item itself: ${onItem}`); return onItem; }
  // לא נמצא שם תקין — מדפיסים את כל המפתחות עם דגימת ערך, כדי שהחיוב
  // האמיתי הבא יגלה את שם המפתח הנכון מתוך הלוג.
  const dump = {};
  for (const key of Object.keys(properties || {})) {
    dump[key] = JSON.stringify(properties[key])?.slice(0, 120);
  }
  console.log('🗂️ No valid catalog name found — key samples:', JSON.stringify(dump));
  return null;
}

function pickProperty(properties, names) {
  for (const name of names) {
    const raw = properties[name];
    if (raw === undefined || raw === null) continue;
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeWhatsapp(phone) {
  let digits = String(phone || '').replace(/[\s\-\.\(\)\+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return '972' + digits.substring(1);
  if (digits.length === 9 && digits.startsWith('5')) return '972' + digits;
  return digits;
}

// מיפוי מוצרים → קורס-אב + מסלול ("קורס גדול עם מסלולים") — שכבה 2, גיבוי בלבד.
// אלה תבניות רג'קס ולא שמות מוצרים מדויקים, ולכן לא נזרעות כרשומות SumitProductMap —
// כל מוצר שעובר בשכבה הזו נרשם אוטומטית ב-SumitProductMap כדי שהמחזור הבא יתפוס אותו בשכבה 1.
const COURSE_MAPPINGS = [
  {
    matches: (productName) => normalizeName(productName).startsWith('סמסטר קיץ'),
    courseName: 'סמסטר קיץ נענע',
    extractOption: (productName) => {
      const m = String(productName).match(/(\d{1,2}-\d{1,2}\.\d{1,2})/);
      return m ? m[1] : null;
    },
    optionField: 'nana_option'
  },
  {
    matches: (p) => normalizeName(p).startsWith('מסיבת פתיחת שנה'),
    courseName: 'מסיבת פתיחת שנה 20.11',
    extractOption: (p) => (String(p).match(/["״]([^"״]+)["״]/) || [])[1] || null
  },
  {
    matches: (p) => normalizeName(p).startsWith('מופע יצירה'),
    courseName: 'מופע יצירה 3.12',
    extractOption: (p) => { const parts = String(p).split('-'); return parts.length > 1 ? parts.slice(1).join('-').trim() : null; }
  },
  {
    matches: (p) => normalizeName(p).startsWith('שיעורי גיטרה'),
    courseName: 'יאיר בר צורי- שיעורי גיטרה בחנתון',
    extractOption: (p) => { const parts = String(p).split('-'); return parts.length > 1 ? parts.slice(1).join('-').trim() : null; }
  },
  {
    matches: (p) => normalizeName(p).includes('הורים וילדים') && !normalizeName(p).startsWith('סדנת קיץ'),
    courseName: 'סדנת קיץ "הורים וילדים"',
    extractOption: (p) => {
      const n = normalizeName(p);
      if (n.startsWith('3 סדנאות')) return '3 סדנאות';
      const m = String(p).match(/(\d{1,2}\.\d{1,2})/);
      if (n.includes('בודדת')) return 'סדנא בודדת' + (m ? ' ' + m[1] : '');
      return null;
    }
  },
  {
    matches: (p) => normalizeName(p).startsWith('מפגשי ליווי'),
    courseName: 'מפגשי ליווי עם אביטל בר צורי',
    extractOption: (p) => { const parts = String(p).split('-'); return parts.length > 1 ? parts.slice(1).join('-').trim() : null; }
  }
];

function resolveCourseMapping(productName) {
  if (!productName) return null;
  for (const mapping of COURSE_MAPPINGS) {
    if (mapping.matches(productName)) {
      return {
        courseName: mapping.courseName,
        option: mapping.extractOption ? mapping.extractOption(productName) : null,
        optionField: mapping.optionField || null
      };
    }
  }
  return null;
}

// סטטוס ראשי: הליד הפתוח החם ביותר; אם אין לידים פתוחים — "רשום"
function computeMainStatus(courses, fallback) {
  const list = courses || [];
  // "רשום" גובר: לקוחה ששילמה על קורס כלשהו מוצגת "רשום" בסטטוס הראשי, גם אם
  // נותר לה ליד פתוח לקורס אחר (החלטת עינת 19.08 — עקבי עם handleElementorLead).
  if (list.some((c) => REGISTERED_STATUSES.includes(c.status) || c.status === 'הסתיים')) return 'רשום';
  // רישום ליום היכרות — כשאין הרשמה מלאה — גובר על הליד שנפתח ממנו, כך שאוטומציית
  // "שיחת היכרות" (שרצה על "ליד חדש") לא נפתחת למי שכבר נרשמה ליום היכרות.
  if (list.some((c) => c.status === INTRO_STATUS)) return INTRO_STATUS;
  for (const status of OPEN_LEAD_STATUSES) {
    if (list.some((c) => c.status === status)) return status;
  }
  if (list.length && list.every((c) => c.status === 'לא רלוונטי')) return 'לא רלוונטי';
  // כל הקורסים בוטלו (או בוטלו/לא רלוונטי) — הסטטוס הראשי משקף את הביטול ולא "רשום"
  if (list.length && list.every((c) => c.status === CANCELLED_STATUS || c.status === 'לא רלוונטי')) return CANCELLED_STATUS;
  return fallback || 'רשום';
}

// שכבה 1: חיפוש שיוך קיים ב-SumitProductMap לפי שם מוצר מדויק.
async function lookupProductMap(base44, productName) {
  if (!productName) return null;
  const matches = await base44.asServiceRole.entities.SumitProductMap.filter({ summit_product: productName });
  return matches?.[0] || null;
}

// כותב/מעדכן את רשומת השיוך של המוצר — פעם אחת לכל מוצר לא-ידני.
// לא דורס שיוך שקיים כבר (status === 'משויך') כדי לא לאבד עבודה ידנית של אופיר.
async function upsertProductMap(base44, { productName, catalogName, course, optionId, amount, existingMap }) {
  if (!productName) return;
  const rec = existingMap !== undefined ? existingMap : await lookupProductMap(base44, productName);
  const patch = {
    times_seen: (rec?.times_seen || 0) + 1,
    last_seen_at: new Date().toISOString(),
    ...(amount !== null && amount !== undefined && { last_amount: amount }),
    ...(catalogName && !rec?.summit_catalog && { summit_catalog: catalogName })
  };
  const alreadyAssigned = rec?.status === 'משויך' && rec?.course_id;
  if (course && !alreadyAssigned) {
    patch.course_id = course.id;
    patch.course_name = course.name;
    patch.status = 'משויך';
    if (optionId) patch.option_id = optionId;
    if (!rec?.kind) patch.kind = 'קורס';
  } else if (!course && !rec) {
    patch.status = 'ממתין לשיוך';
  }
  try {
    if (rec) {
      await base44.asServiceRole.entities.SumitProductMap.update(rec.id, patch);
    } else {
      await base44.asServiceRole.entities.SumitProductMap.create({ summit_product: productName, ...patch });
    }
  } catch (mapError) {
    console.error('⚠️ SumitProductMap upsert error (non-fatal):', mapError.message);
  }
}

Deno.serve(async (req) => {
  console.log('=== 💳 handleSummitPayment Webhook Started (v4) ===');

  try {
    const base44 = createClientFromRequest(req);

    let payload;
    try {
      payload = await req.json();
      console.log('📦 FULL PAYLOAD:', JSON.stringify(payload, null, 2));
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON:', jsonError.message);
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const properties = payload.Properties || {};

    // --- חילוץ שדות ---
    const customerName =
      properties.Billing_Customer?.[0]?.Name ||
      properties.Property_2?.[0]?.Name || null;

    function scanValues(props) {
      const values = [];
      for (const key of Object.keys(props || {})) {
        const raw = props[key];
        const arr = Array.isArray(raw) ? raw : [raw];
        for (const v of arr) {
          if (typeof v === 'string') values.push(v);
        }
      }
      return values;
    }
    const allValues = scanValues(properties);
    const emailByName = pickProperty(properties, ['Billing_CustomerEmailAddress', 'EmailAddress', 'Email', 'Property_6', 'כתובת מייל']);
    const emailByScan = allValues.find((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()));
    const customerEmail = (emailByName || emailByScan || '').trim().toLowerCase() || null;

    const phoneByName = pickProperty(properties, ['Billing_CustomerPhone', 'Phone', 'Property_7', 'טלפון']);
    const phoneByScan = allValues.find((v) => /^(\+972|972|0)?5\d[\d\s\-]{7,}$/.test(v.trim()));
    let customerPhone = (phoneByName || phoneByScan || 'לא זמין');
    let resolvedEmail = customerEmail;

    const sumitCustomerId = properties.Billing_Customer?.[0]?.ID;
    const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
    const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
    if (sumitCustomerId && SUMIT_API_KEY && SUMIT_COMPANY_ID && (!resolvedEmail || customerPhone === 'לא זמין')) {
      try {
        const apiRes = await fetch('https://api.sumit.co.il/crm/data/getentity/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Credentials: {
              CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')),
              APIKey: String(SUMIT_API_KEY).trim()
            },
            EntityID: sumitCustomerId,
            IncludeFields: true
          })
        });
        const apiData = await apiRes.json();
        const ent = apiData?.Data?.Entity || {};
        const apiEmail = ent.Customers_EmailAddress?.[0] || ent.EmailAddress || null;
        const apiPhone = ent.Customers_Phone?.[0] || ent.Phone || null;
        const apiName = ent.Customers_FullName?.[0] || null;
        console.log('📇 Sumit customer API:', JSON.stringify({ apiEmail, apiPhone, apiName }));
        if (!resolvedEmail && apiEmail) resolvedEmail = String(apiEmail).trim().toLowerCase();
        if (customerPhone === 'לא זמין' && apiPhone) customerPhone = String(apiPhone).trim();
      } catch (apiErr) {
        console.error('⚠️ Sumit customer API error (non-fatal):', apiErr.message);
      }
    }

    const billingItems = (
      Array.isArray(properties.Billing_Items) ? properties.Billing_Items :
      Array.isArray(properties.Property_3) ? properties.Property_3 : []
    ).filter(Boolean);
    const catalogName = resolveCatalogName(properties, billingItems[0]);

    const isStandingOrder = Boolean(properties.Billing_CustomerItems?.[0]?.Name?.includes('הוראת קבע'));

    const billingValidRaw = Array.isArray(properties.Billing_Valid) ? properties.Billing_Valid[0] : properties.Billing_Valid;
    if (billingValidRaw === false) {
      console.log('⏭️ Skipping invalid/failed charge (Billing_Valid === false)');
      return Response.json({ success: true, skipped: 'invalid_charge' });
    }

    const billingDate = (pickProperty(properties, ['Billing_Date', 'Property_1']) || new Date().toISOString()).split('T')[0];
    const documentName =
      properties.Accounting_Document?.[0]?.Name ||
      properties['Property_M-1']?.[0]?.Name || null;

    const paymentsTotal = parseNum(pickProperty(properties, ['Billing_PaymentsCount', 'מספר תשלומים', 'סה״כ תשלומים', 'סה"כ תשלומים']));
    const currentPaymentRaw = parseNum(pickProperty(properties, ['Billing_PaymentIndex', 'תשלום נוכחי', 'מספר תשלום', 'מספר חיוב', 'מחזור']));
    const installmentAmount = parseNum(pickProperty(properties, ['Billing_Amount', 'סכום התשלום למחזור', 'סכום התשלום', 'מחיר כולל מע"מ']));
    const totalAmount = parseNum(pickProperty(properties, ['Billing_TotalAmount', 'סה"כ', 'סה״כ', 'סכום כולל', 'סה"כ כולל מע"מ']));

    console.log('✅ Extracted:', { customerName, resolvedEmail, customerPhone, catalogName, paymentsTotal, currentPaymentRaw, installmentAmount, totalAmount, isStandingOrder });

    if (!customerName) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }

    // --- 0. איתור משתתפ.ת (מייל → טלפון → שם) ---
    let existingStudent = null;

    if (resolvedEmail) {
      const byEmail = await base44.asServiceRole.entities.Student.filter({ email: resolvedEmail });
      if (byEmail?.[0]) existingStudent = byEmail[0];
    }
    if (!existingStudent && customerPhone && customerPhone !== 'לא זמין') {
      const byPhone = await base44.asServiceRole.entities.Student.filter({ phone: customerPhone });
      if (byPhone?.[0]) existingStudent = byPhone[0];
    }
    if (!existingStudent) {
      const byName = await base44.asServiceRole.entities.Student.filter({ full_name: customerName });
      if (byName?.[0]) existingStudent = byName[0];
    }

    console.log(existingStudent ? `✅ Found student: ${existingStudent.full_name} (${existingStudent.id})` : '👤 New student');

    const existingNotes = existingStudent?.notes || '';
    if (existingStudent && documentName && existingNotes.includes(documentName)) {
      console.log(`⏭️ Duplicate delivery for document "${documentName}" — skipping`);
      return Response.json({ success: true, skipped: 'duplicate_document', document: documentName });
    }

    // --- 1. פריטי העסקה: כל הפריטים, לא רק הראשון ---
    const perItem = [];
    for (const item of billingItems) {
      const itemName = item?.Name || null;
      if (!itemName) continue;
      perItem.push({
        productName: itemName,
        amount: parseNum(pickFrom(item, ['Amount', 'TotalAmount', 'Total', 'Price', 'UnitPrice']))
      });
    }
    if (perItem.length === 0) perItem.push({ productName: null, amount: null });
    console.log(`🧾 ${perItem.length} item(s) in this charge:`, perItem.map((i) => i.productName).join(' | '));

    const isRefund = (Number(installmentAmount) || 0) < 0 || /זיכוי/.test(String(documentName || ''));
    const chargedTotal = Math.abs(Number(installmentAmount) || 0);

    let unsplitAmount = false;
    const pricedSum = perItem.reduce((s, it) => s + Math.abs(it.amount || 0), 0);
    if (perItem.length === 1) {
      perItem[0].share = chargedTotal;
    } else if (perItem.every((it) => it.amount !== null) && pricedSum > 0) {
      perItem.forEach((it) => { it.share = Math.round((Math.abs(it.amount) / pricedSum) * chargedTotal); });
    } else {
      perItem.forEach((it, i) => { it.share = i === 0 ? chargedTotal : 0; });
      unsplitAmount = true;
      console.log('⚠️ Items have no individual prices — full amount recorded on the first item');
    }

    const amountSignature = chargedTotal ? `(₪${chargedTotal})` : null;
    const itemNames = perItem.map((i) => i.productName).filter(Boolean);
    if (
      existingStudent && documentName && amountSignature &&
      existingNotes.split('\n').some((line) =>
        line.includes(`בתאריך ${billingDate}`) &&
        line.includes(amountSignature) &&
        !line.includes('חשבון/קבלה') &&
        (itemNames.length === 0 || itemNames.some((n) => line.includes(n) ||
          line.includes(resolveCourseMapping(n)?.courseName || n)))
      )
    ) {
      console.log(`⏭️ Same charge already recorded before the document existed (${billingDate}, ₪${chargedTotal}) — skipping`);
      return Response.json({ success: true, skipped: 'duplicate_charge_predocument', date: billingDate, amount: chargedTotal });
    }

    const registeredStatus = 'רשום';
    const existingCourses = existingStudent?.courses || [];
    let workingCourses = [...existingCourses];
    const noteLines = [];
    const results = [];
    let totalDelta = 0;
    let pendingAssignment = false;
    let optionFieldUpdates = {};
    const courseCatalogUpdates = new Set(); // course.id-ים שכבר עודכן להם summit_catalog בעסקה הזו

    // --- 2. עיבוד כל פריט: שכבות שיוך + בניית הרישום ---
    for (const it of perItem) {
      const productName = it.productName;
      let course = null;
      let optionIdForEntry = null;
      let mapping = null;
      let courseOption = null;

      // שכבה 1: SumitProductMap — שיוך מדויק לפי שם מוצר
      const productMap = await lookupProductMap(base44, productName);
      if (productMap && productMap.status === 'משויך' && productMap.course_id) {
        try {
          course = await base44.asServiceRole.entities.Course.get(productMap.course_id);
        } catch {
          course = null;
        }
        if (course) {
          optionIdForEntry = productMap.option_id || null;
          console.log(`🎯 "${productName}" → "${course.name}" (SumitProductMap)${optionIdForEntry ? ` [option: ${optionIdForEntry}]` : ''}`);
        }
      }

      // שכבה 2: COURSE_MAPPINGS הקשיח — גיבוי לתבניות רג'קס
      if (!course) {
        mapping = resolveCourseMapping(productName);
        const courseName = mapping ? mapping.courseName : productName;
        courseOption = mapping ? mapping.option : null;
        if (mapping) console.log(`🗺️ "${productName}" → "${courseName}"${courseOption ? ` (${courseOption})` : ''}`);

        if (courseName) {
          const exact = await base44.asServiceRole.entities.Course.filter({ name: courseName });
          course = exact?.[0] || null;
          if (!course) {
            const allCourses = await base44.asServiceRole.entities.Course.list();
            const target = normalizeName(courseName);
            course = (allCourses || []).find((c) => normalizeName(c.name) === target) || null;
            if (course) console.log(`🔎 Fuzzy-matched "${courseName}" → "${course.name}"`);
          }
        }
      }

      // שכבה 3: פתיחת קורס אוטומטית. מוצר שלא זוהה פותח קורס לפי שמו והקטלוג
      // שלו, כדי שהכסף ישויך מיד. חריגים (בדיקות/השכרה/תרומה וכו') לא נפתחים
      // ונשארים בתיבת הנכנסות לשיוך בקליק.
      if (!course && productName) {
        course = await autoCreateCourseFromProduct(base44, { productName, catalogName, amount: it.share });
        if (course) console.log(`🆕 Auto-created course "${course.name}" from unknown product`);
      }

      // כותבים/מעדכנים את שכבת השיוך מהתנועה האמיתית — כך שהמחזור הבא של המוצר
      // הזה יתפוס בשכבה 1 בלי תלות בתבנית רג'קס.
      await upsertProductMap(base44, {
        productName,
        catalogName,
        course,
        optionId: optionIdForEntry,
        amount: it.share,
        existingMap: productMap
      });

      // הגענו לכאן רק אם המוצר הוא חריג מוגדר (או חסר שם) — הכסף נרשם והמוצר
      // ממתין לשיוך ידני בתיבת הנכנסות.
      if (!course) {
        pendingAssignment = true;
        console.log(`⏸️ Unknown product "${productName}" — recorded, waiting for manual assignment`);
        noteLines.push(
          `${isRefund ? 'זיכוי' : 'תשלום'} דרך Summit בתאריך ${billingDate} (₪${it.share})` +
          ` — מוצר: ${productName || 'ללא שם'}${catalogName ? ` — קטלוג: ${catalogName}` : ''}` +
          ` — ⏸️ ממתין לשיוך לקורס${documentName ? ` — ${documentName}` : ''}`
        );
        totalDelta += isRefund ? -it.share : it.share;
        continue;
      }

      // קטלוג הקורס — נכתב פעם אחת לכל קורס ריק, מהמידע האמיתי שמגיע מסאמיט
      if (catalogName && !course.summit_catalog && !courseCatalogUpdates.has(course.id)) {
        try {
          await base44.asServiceRole.entities.Course.update(course.id, { summit_catalog: catalogName });
          course.summit_catalog = catalogName;
          courseCatalogUpdates.add(course.id);
        } catch (catalogErr) {
          console.error('⚠️ Course.summit_catalog update error (non-fatal):', catalogErr.message);
        }
      }

      // שם הקורס הוא תווית מתגלגלת ("נענע שנה ב'" הוא אנשים אחרים כל שנה), ולכן
      // העוגן הוא course_id + cohort: החיוב מתיישב על רשומת המחזור הנוכחי.
      // רשומה ותיקה ללא קוהורטה נחשבת תואמת (ומקבלת אותה כעת), כדי לא לשבור
      // רשומות היסטוריות ולא ליצור כפילות. כך גם רשומה שנוצרה מסנכרון ההו"ק
      // ("נוצרה הוראת קבע") מתעדכנת ל"רשום" ולא נכפלת.
      const chargeCohort = cohortFromDate(billingDate);
      const matchesEntry = (c) => c.course_id === course.id &&
        (!c.cohort || !chargeCohort || c.cohort === chargeCohort);
      const existingEntry = workingCourses.find((c) => c.course_id === course.id && c.cohort && c.cohort === chargeCohort)
        || workingCourses.find(matchesEntry);

      let paymentNumber;
      if (isRefund) {
        paymentNumber = existingEntry?.payment_number || 1;
      } else if (currentPaymentRaw) {
        paymentNumber = currentPaymentRaw;
      } else if (existingEntry && REGISTERED_STATUSES.includes(existingEntry.status)) {
        paymentNumber = (existingEntry.payment_number || 1) + 1;
      } else {
        paymentNumber = 1;
      }

      const isRecurringCharge = !isRefund && Boolean(existingEntry && REGISTERED_STATUSES.includes(existingEntry.status));
      const isNewRegistration = !isRefund && !isRecurringCharge;
      const paidBeforeRefund = Number(existingEntry?.paid_so_far) || 0;
      const isFullCancellation = isRefund && paidBeforeRefund > 0 && it.share >= paidBeforeRefund;

      const catalogTag = catalogName ? ` — קטלוג: ${catalogName}` : '';
      const courseTag = ` — קורס: ${course.name}`;
      const optionTag = mapping && productName !== course.name ? ` — אפשרות: ${productName}` : '';
      noteLines.push(
        isRefund
          ? `${isFullCancellation ? 'ביטול הרשמה' : 'זיכוי חלקי'} דרך Summit בתאריך ${billingDate} (₪${it.share})${courseTag}${optionTag}${catalogTag}${documentName ? ` — ${documentName}` : ''}`
          : `תשלום ${paymentNumber}${paymentsTotal ? `/${paymentsTotal}` : ''} דרך Summit בתאריך ${billingDate} (₪${it.share})${courseTag}${optionTag}${catalogTag}${documentName ? ` — ${documentName}` : ''}${unsplitAmount ? ' — ⚠️ הסכום לא פוצל בין הפריטים' : ''}`
      );

      const signedShare = isRefund ? -it.share : it.share;
      totalDelta += signedShare;

      const rowRegisteredStatus = isIntroDayCourse(course) ? INTRO_STATUS : registeredStatus;

      const entry = {
        course_id: course.id,
        course_name: course.name,
        status: isFullCancellation ? CANCELLED_STATUS : (isRefund ? (existingEntry?.status || rowRegisteredStatus) : rowRegisteredStatus),
        ...(mapping && !mapping.optionField && courseOption ? { option: courseOption } : {}),
        ...(optionIdForEntry ? { option_id: optionIdForEntry } : {}),
        registration_date: existingEntry?.registration_date || billingDate,
        ...(existingEntry?.cohort || chargeCohort ? { cohort: existingEntry?.cohort || chargeCohort } : {}),
        payment_number: paymentNumber,
        paid_so_far: Math.max(0, paidBeforeRefund + signedShare),
        ...(paymentsTotal && { payments_total: paymentsTotal }),
        ...(it.share && { installment_amount: it.share }),
        ...(totalAmount && perItem.length === 1 ? { total_price: totalAmount } : {})
      };

      const idx = existingEntry ? workingCourses.indexOf(existingEntry) : -1;
      if (idx >= 0) workingCourses[idx] = { ...workingCourses[idx], ...entry };
      else workingCourses.push(entry);

      if (mapping && mapping.optionField && courseOption) optionFieldUpdates[mapping.optionField] = courseOption;

      results.push({ course, isNewRegistration, isFullCancellation, optionId: optionIdForEntry });
    }

    // --- 2ב. ההרשמה היא הטריגר: רישום ליום היכרות פותח מיד ליד לתוכנית שהיום
    // הזה מקדם. בלי קרון ובלי מעבר נוסף. שני כללי בטיחות: השורה נוצרת *בלי כסף*
    // (אין paid_so_far/installment_amount ואין נגיעה ב-amount_paid), ואם כבר יש
    // שורה לתוכנית — לא נוצרת שנייה. משימת "שיחת היכרות" לא נפתחת: הסטטוס
    // הראשי נשאר "רשומה ליום היכרות" (ראו computeMainStatus), והאוטומציה
    // createIntroductionTask רצה רק על יצירת משתתפת בסטטוס "ליד חדש".
    const introLeads = [];
    for (const r of results) {
      if (!r.isNewRegistration || !isIntroDayCourse(r.course)) continue;
      const program = programForIntroDay(r.course);
      if (!program) continue;
      if (workingCourses.some((c) => c.course_id === program.program_id)) continue;
      workingCourses.push({
        course_id: program.program_id,
        course_name: program.program_name,
        status: 'ליד חדש',
        registration_date: billingDate
      });
      introLeads.push(program.program_name);
      console.log(`🌱 Intro-day lead opened for program "${program.program_name}"`);
    }

    // --- 3. יצירה/עדכון משתתפ.ת (פעם אחת לכל העסקה) ---
    const mainStatus = computeMainStatus(workingCourses, registeredStatus);
    const amountPaid = Math.max(0, (existingStudent?.amount_paid || 0) + totalDelta);
    // is_customer נכבה כשלא נותר תשלום נטו ואין רישום פעיל — למשל זיכוי מלא של הקורס היחיד.
    const stillCustomer = amountPaid > 0 || workingCourses.some((c) => REGISTERED_STATUSES.includes(c.status) || c.status === INTRO_STATUS || c.status === 'הסתיים');
    const primary = results[0]?.course || null;
    const noteText = noteLines.join('\n');

    const studentData = {
      full_name: customerName,
      status: mainStatus,
      is_customer: stillCustomer,
      registration_date: billingDate,
      course_id: primary?.id,
      course_name: primary?.name,
      amount_paid: amountPaid,
      ...(paymentsTotal && { total_payments: paymentsTotal }),
      ...(resolvedEmail && { email: resolvedEmail }),
      ...(customerPhone && customerPhone !== 'לא זמין' && { phone: customerPhone }),
      ...optionFieldUpdates
    };
    if (workingCourses.length > 0) studentData.courses = workingCourses;

    const tags = [...(existingStudent?.tags || [])];
    if (isRefund && !tags.includes(REFUND_TAG)) tags.push(REFUND_TAG);
    if (pendingAssignment && !tags.includes(PENDING_TAG)) tags.push(PENDING_TAG);
    if (tags.length !== (existingStudent?.tags || []).length) studentData.tags = tags;

    let student;
    if (existingStudent) {
      if (existingStudent.email) delete studentData.email;
      if (existingStudent.phone && existingStudent.phone !== 'לא זמין') delete studentData.phone;
      studentData.notes = (existingStudent.notes ? existingStudent.notes + '\n' : '') + noteText;
      student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      console.log(`📝 Student updated — ${results.length} course entrie(s), ₪${totalDelta}`);
    } else {
      studentData.lead_source = 'אחר';
      studentData.notes = noteText;
      if (!studentData.phone) studentData.phone = 'לא זמין';
      student = await base44.asServiceRole.entities.Student.create(studentData);
      console.log(`✅ Student created: ${student.id}`);
    }

    // --- 4. לכל קורס בעסקה: מונה (כללי + ברמת האפשרות), משימת היכרות, רשימת תפוצה ---
    const closedTaskIds = [];
    for (const r of results) {
      const course = r.course;

      if (r.isNewRegistration || r.isFullCancellation) {
        const delta = r.isNewRegistration ? 1 : -1;
        const courseUpdates = { current_students: Math.max(0, (course.current_students || 0) + delta) };
        if (r.optionId && Array.isArray(course.options) && course.options.length > 0) {
          courseUpdates.options = course.options.map((o) =>
            o.option_id === r.optionId
              ? { ...o, current_students: Math.max(0, (o.current_students || 0) + delta) }
              : o
          );
        }
        await base44.asServiceRole.entities.Course.update(course.id, courseUpdates);
      }

      if (r.isNewRegistration) {
        try {
          const tasks = await base44.asServiceRole.entities.Task.filter({ student_id: student.id });
          const openIntroTasks = (tasks || []).filter((t) =>
            String(t.name || '').includes('שיחת היכרות') &&
            t.status !== 'הושלם' && t.status !== 'אבוד' && t.status !== 'לא רלוונטי'
          );
          const courseNorm = normalizeName(course.name);
          const match = openIntroTasks.find((t) =>
            normalizeName(t.name).includes(courseNorm) || normalizeName(t.description || '').includes(courseNorm)
          ) || (openIntroTasks.length === 1 && results.length === 1 ? openIntroTasks[0] : null);
          if (match) {
            await base44.asServiceRole.entities.Task.update(match.id, { status: 'הושלם' });
            closedTaskIds.push(match.id);
            console.log(`✅ Intro task closed: ${match.id} ("${match.name}")`);
          }
        } catch (taskError) {
          console.error('⚠️ Intro task close error (non-fatal):', taskError.message);
        }
      }

      if (resolvedEmail) {
        try {
          const interestedGroup = `${course.name} - מתעניינים`;
          const registeredGroup = `${course.name} - רשומים`;

          let existingSub = null;
          const bySubEmail = await base44.asServiceRole.entities.Subscribers.filter({ email: resolvedEmail });
          if (bySubEmail?.length) existingSub = bySubEmail[0];

          let whatsappNum = '';
          if (customerPhone && customerPhone !== 'לא זמין') whatsappNum = normalizeWhatsapp(customerPhone);

          if (!existingSub && whatsappNum) {
            const bySubPhone = await base44.asServiceRole.entities.Subscribers.filter({ whatsapp: whatsappNum });
            if (bySubPhone?.length) existingSub = bySubPhone[0];
          }

          if (existingSub) {
            const groups = (existingSub.groups || []).filter((g) => g !== interestedGroup);
            if (!groups.includes(registeredGroup)) groups.push(registeredGroup);
            await base44.asServiceRole.entities.Subscribers.update(existingSub.id, {
              subscribed: true,
              name: customerName || existingSub.name,
              whatsapp: whatsappNum || existingSub.whatsapp,
              source: existingSub.source || 'Summit',
              group: registeredGroup,
              groups
            });
            console.log(`✅ Subscriber moved to "${registeredGroup}"`);
          } else {
            await base44.asServiceRole.entities.Subscribers.create({
              email: resolvedEmail,
              name: customerName || '',
              whatsapp: whatsappNum,
              subscribed: true,
              marketing_consent: false,
              source: 'Summit',
              group: registeredGroup,
              groups: [registeredGroup]
            });
            console.log(`✅ New subscriber in "${registeredGroup}"`);
          }
        } catch (subError) {
          console.error('⚠️ Subscriber sync error (non-fatal):', subError.message);
        }
      }
    }

    return Response.json({
      success: true,
      student_id: student.id,
      student_name: student.full_name,
      status: student.status,
      is_customer: stillCustomer,
      catalog: catalogName || null,
      items: perItem.map((i) => i.productName),
      courses: results.map((r) => r.course.name),
      pending_assignment: pendingAssignment,
      amount_not_split: unsplitAmount,
      is_refund: isRefund,
      intro_day_leads: introLeads,
      intro_tasks_closed: closedTaskIds
    });


  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});