import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// =====================================================
// handleSummitPayment v3
// - תיקון שדות תשלום (payments_total, payment_number)
// - ספירת חיובים חודשיים בהוראת קבע (כרטיס אשראי)
// - קבוצות תפוצה: "{קורס} - מתעניינים" / "{קורס} - רשומים"
// - סגירה אוטומטית של משימת שיחת היכרות
// - סטטוס דו-ממדי: is_customer + סטטוס ראשי מחושב
// - התאמת שם קורס עמידה לשגיאות (נרמול)
// =====================================================

const OPEN_LEAD_STATUSES = ['ליד חדש', 'חדש', 'לחזור לקראת הרשמה', 'במעקב ראשוני', 'היה ביום היכרות', 'הודעה מוואטסאפ לבדיקה', 'בבדיקה'];
const REGISTERED_STATUSES = ['רשום', 'נרשם'];

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

// מיפוי מוצרים → קורס-אב + מסלול ("קורס גדול עם מסלולים")
// מוצרי סמסטר קיץ ("סמסטר קיץ שבוע ראשון 5-9.7") נכנסים כולם
// לקורס "סמסטר קיץ נענע" עם ציון המסלול ב-nana_option
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
  for (const status of OPEN_LEAD_STATUSES) {
    if (list.some((c) => c.status === status)) return status;
  }
  if (list.some((c) => REGISTERED_STATUSES.includes(c.status) || c.status === 'הסתיים')) return 'רשום';
  if (list.length && list.every((c) => c.status === 'לא רלוונטי')) return 'לא רלוונטי';
  return fallback || 'רשום';
}

Deno.serve(async (req) => {
  console.log('=== 💳 handleSummitPayment Webhook Started (v3) ===');

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
    // פורמט חדש (עמותה, תצוגת "כל השדות"): Billing_Customer / Billing_Items / Billing_Date...
    // פורמט ישן (תצוגה מותאמת): Property_N
    const customerName =
      properties.Billing_Customer?.[0]?.Name ||
      properties.Property_2?.[0]?.Name || null;

    // מייל/טלפון: חיפוש לפי שמות שדות מוכרים, ואם אין — סריקה גנרית של כל הערכים
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

    // העשרה מ-API של סאמיט: ה-payload של הטריגר לא כולל מייל/טלפון,
    // אז שולפים אותם מכרטיס הלקוח לפי ID (דורש SUMIT_API_KEY + SUMIT_COMPANY_ID ב-Secrets)
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
        // סאמיט מחזיר את הערכים כמערכים תחת שמות Customers_*
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

    const productName =
      properties.Billing_Items?.[0]?.Name ||
      properties.Property_3?.[0]?.Name || null;

    // זיהוי הוראת קבע (מסמך מחזורי) לעומת תשלום רגיל
    const isStandingOrder = Boolean(properties.Billing_CustomerItems?.[0]?.Name?.includes('הוראת קבע'));

    // חיוב שנכשל — לא רושמים! מדלגים רק כשהמערכת אומרת במפורש שהחיוב לא תקין.
    // (בטריגר על "יצירת כרטיס" ייתכן שהשדה עוד ריק — אז ממשיכים לעבד)
    const billingValidRaw = Array.isArray(properties.Billing_Valid) ? properties.Billing_Valid[0] : properties.Billing_Valid;
    if (billingValidRaw === false) {
      console.log('⏭️ Skipping invalid/failed charge (Billing_Valid === false)');
      return Response.json({ success: true, skipped: 'invalid_charge' });
    }

    // מיפוי מוצר → קורס-אב (למשל: כל מוצרי "סמסטר קיץ" → "סמסטר קיץ נענע")
    const mapping = resolveCourseMapping(productName);
    const courseName = mapping ? mapping.courseName : productName;
    const courseOption = mapping ? mapping.option : null;
    if (mapping) console.log(`🗺️ Product "${productName}" mapped → course "${courseName}"${courseOption ? ` (option: ${courseOption})` : ''}`);
    const billingDate = (pickProperty(properties, ['Billing_Date', 'Property_1']) || new Date().toISOString()).split('T')[0];
    const documentName =
      properties.Accounting_Document?.[0]?.Name ||
      properties['Property_M-1']?.[0]?.Name || null;

    // "מספר תשלומים" — סה"כ התשלומים בעסקה (בפורמט החדש לא תמיד נשלח)
    const paymentsTotal = parseNum(pickProperty(properties, ['Billing_PaymentsCount', 'מספר תשלומים', 'סה״כ תשלומים', 'סה"כ תשלומים']));
    // תשלום נוכחי — אם סאמיט שולח (מחזור בהוראת קבע). אם לא, נחשב לבד.
    const currentPaymentRaw = parseNum(pickProperty(properties, ['Billing_PaymentIndex', 'תשלום נוכחי', 'מספר תשלום', 'מספר חיוב', 'מחזור']));
    // סכומים: Billing_Amount = הסכום שחויב בפועל בחיוב הזה
    const installmentAmount = parseNum(pickProperty(properties, ['Billing_Amount', 'סכום התשלום למחזור', 'סכום התשלום', 'מחיר כולל מע"מ']));
    const totalAmount = parseNum(pickProperty(properties, ['Billing_TotalAmount', 'סה"כ', 'סה״כ', 'סכום כולל', 'סה"כ כולל מע"מ']));

    console.log('✅ Extracted:', { customerName, resolvedEmail, customerPhone, courseName, paymentsTotal, currentPaymentRaw, installmentAmount, totalAmount, isStandingOrder });

    if (!customerName) {
      return Response.json({ error: 'Customer name is required' }, { status: 400 });
    }

    // --- 1. איתור/יצירת קורס (עם התאמה מנורמלת כרשת ביטחון) ---
    let course = null;
    if (courseName) {
      const exact = await base44.asServiceRole.entities.Course.filter({ name: courseName });
      course = exact?.[0] || null;

      if (!course) {
        const allCourses = await base44.asServiceRole.entities.Course.list();
        const target = normalizeName(courseName);
        course = (allCourses || []).find((c) => normalizeName(c.name) === target) || null;
        if (course) console.log(`🔎 Fuzzy-matched course "${courseName}" → "${course.name}"`);
      }

      if (!course) {
        console.log(`✨ Creating new course: ${courseName}`);
        try {
          course = await base44.asServiceRole.entities.Course.create({
            name: courseName,
            type: 'קורס קבוע',
            current_students: 0
          });
        } catch (e) {
          console.error(`⚠️ Failed to create course: ${e.message}`);
        }
      }
    }

    // --- 2. איתור משתתפ.ת (מייל → טלפון → שם) ---
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

    // מניעת עיבוד כפול: אם המסמך הזה כבר נרשם אצל המשתתפ.ת — מדלגים
    // (סאמיט לעיתים שולח את אותו אירוע פעמיים בגלל timeout/retry)
    if (existingStudent && documentName && (existingStudent.notes || '').includes(documentName)) {
      console.log(`⏭️ Duplicate delivery for document "${documentName}" — skipping`);
      return Response.json({ success: true, skipped: 'duplicate_document', document: documentName });
    }

    const registeredStatus = 'רשום';

    // --- 3. חישוב מספר התשלום הנוכחי ---
    const existingCourses = existingStudent?.courses || [];
    const existingEntry = course ? existingCourses.find((c) => c.course_id === course.id) : null;

    let paymentNumber;
    if (currentPaymentRaw) {
      paymentNumber = currentPaymentRaw;
    } else if (existingEntry && REGISTERED_STATUSES.includes(existingEntry.status)) {
      // חיוב חוזר של הוראת קבע — מקדמים את המונה
      paymentNumber = (existingEntry.payment_number || 1) + 1;
    } else {
      paymentNumber = 1;
    }

    const isRecurringCharge = Boolean(existingEntry && REGISTERED_STATUSES.includes(existingEntry.status));
    const isNewRegistration = !isRecurringCharge && Boolean(course);

    const noteText = `תשלום ${paymentNumber}${paymentsTotal ? `/${paymentsTotal}` : ''} דרך Summit בתאריך ${billingDate}${installmentAmount ? ` (₪${installmentAmount})` : ''}${mapping && productName !== courseName ? ` — מסלול: ${productName}` : ''}${documentName ? ` — ${documentName}` : ''}`;

    // --- 4. בניית רשומת הקורס המעודכנת ---
    const courseEntryData = course ? {
      course_id: course.id,
      course_name: course.name,
      status: registeredStatus,
      ...(mapping && !mapping.optionField && courseOption ? { option: courseOption } : {}),
      registration_date: existingEntry?.registration_date || billingDate,
      payment_number: paymentNumber,
      // סכום מצטבר אמיתי לקורס הזה. עד היום מסך ההכנסות חישב
      // installment_amount × payment_number, וזה נכון רק כשכל התשלומים שווים —
      // מי ששילמה ₪1,400 ואז ₪800 הוצגה כמי ששילמה ₪1,600 במקום ₪2,200 (אובחן 22.7).
      paid_so_far: (Number(existingEntry?.paid_so_far) || 0) + (Number(installmentAmount) || 0),
      ...(paymentsTotal && { payments_total: paymentsTotal }),
      ...(installmentAmount && { installment_amount: installmentAmount }),
      ...(totalAmount ? { total_price: totalAmount }
        : (installmentAmount && paymentsTotal ? { total_price: installmentAmount * paymentsTotal } : {}))
    } : null;

    let updatedCourses = [...existingCourses];
    if (courseEntryData) {
      const idx = updatedCourses.findIndex((c) => c.course_id === course.id);
      if (idx >= 0) {
        updatedCourses[idx] = { ...updatedCourses[idx], ...courseEntryData };
      } else {
        updatedCourses.push(courseEntryData);
      }
    }

    // --- 5. יצירה/עדכון משתתפ.ת ---
    const mainStatus = computeMainStatus(updatedCourses, registeredStatus);

    // סכום ששולם בפועל — מצטבר על פני כל החיובים
    const amountPaid = (existingStudent?.amount_paid || 0) + (installmentAmount || 0);

    const studentData = {
      full_name: customerName,
      status: mainStatus,
      is_customer: true,
      registration_date: billingDate,
      course_id: course?.id,
      course_name: course?.name,
      payment_number: paymentNumber,
      amount_paid: amountPaid,
      ...(paymentsTotal && { total_payments: paymentsTotal }),
      ...(resolvedEmail && { email: resolvedEmail }),
      ...(customerPhone && customerPhone !== 'לא זמין' && { phone: customerPhone })
    };
    if (updatedCourses.length > 0) studentData.courses = updatedCourses;
    // שמירת המסלול (למשל nana_option לסמסטר קיץ)
    if (mapping && mapping.optionField && courseOption) {
      studentData[mapping.optionField] = courseOption;
    }

    let student;
    if (existingStudent) {
      // לא דורסים פרטי קשר קיימים
      if (existingStudent.email) delete studentData.email;
      if (existingStudent.phone && existingStudent.phone !== 'לא זמין') delete studentData.phone;
      studentData.notes = (existingStudent.notes ? existingStudent.notes + '\n' : '') + noteText;
      student = await base44.asServiceRole.entities.Student.update(existingStudent.id, studentData);
      console.log(`📝 Student updated (${isRecurringCharge ? 'recurring charge #' + paymentNumber : 'registration'})`);
    } else {
      studentData.lead_source = 'אחר';
      studentData.notes = noteText;
      if (!studentData.phone) studentData.phone = 'לא זמין'; // phone הוא שדה חובה בסכימה
      student = await base44.asServiceRole.entities.Student.create(studentData);
      console.log(`✅ Student created: ${student.id}`);
    }

    // --- 6. עדכון מונה קורס ---
    if (course && isNewRegistration) {
      await base44.asServiceRole.entities.Course.update(course.id, {
        current_students: (course.current_students || 0) + 1
      });
    }

    // --- 7. סגירת משימת שיחת היכרות (אם קיימת ופתוחה) ---
    let closedTaskId = null;
    if (course && isNewRegistration) {
      try {
        const tasks = await base44.asServiceRole.entities.Task.filter({ student_id: student.id });
        const openIntroTasks = (tasks || []).filter((t) =>
          String(t.name || '').includes('שיחת היכרות') &&
          t.status !== 'הושלם' && t.status !== 'אבוד' && t.status !== 'לא רלוונטי'
        );
        // עדיפות: משימה שמזכירה את הקורס הספציפי; אחרת משימת היכרות כללית
        const courseNorm = normalizeName(course.name);
        const match = openIntroTasks.find((t) =>
          normalizeName(t.name).includes(courseNorm) || normalizeName(t.description || '').includes(courseNorm)
        ) || (openIntroTasks.length === 1 ? openIntroTasks[0] : null);

        if (match) {
          await base44.asServiceRole.entities.Task.update(match.id, { status: 'הושלם' });
          closedTaskId = match.id;
          console.log(`✅ Intro task closed: ${match.id} ("${match.name}")`);
        }
      } catch (taskError) {
        console.error('⚠️ Intro task close error (non-fatal):', taskError.message);
      }
    }

    // --- 8. סנכרון Subscribers: העברה מ"מתעניינים" ל"רשומים" ---
    if (resolvedEmail && course) {
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

    return Response.json({
      success: true,
      student_id: student.id,
      student_name: student.full_name,
      status: student.status,
      is_customer: true,
      course: course ? course.name : 'לא שויך',
      payment: `${paymentNumber}${paymentsTotal ? '/' + paymentsTotal : ''}`,
      recurring_charge: isRecurringCharge,
      is_new_registration: isNewRegistration,
      intro_task_closed: closedTaskId
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});