import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { autoCreateCourseFromProduct } from '../../shared/sumitProducts.ts';

// שלב 2 — מיפוי מסמכים מסאמיט (טריגר "יצירת מסמך" בתיקיית ההכנסות).
// סוגר את הפער שקבלות ידניות (העברה בנקאית / מזומן) לא נקלטו בו:
// הטריגר הוותיק יושב על "יצירת כרטיס", וקבלה ידנית לא יוצרת כרטיס.
//
// הכלל הפוך-בטוח: מעבדים אך ורק אמצעי תשלום ידניים מוכרים (2=מזומן,
// 3=העברה בנקאית). אשראי מגיע כ-Type=null ומטופל בטריגר התשלומים —
// כל סוג לא מוכר מדולג ונרשם ב-SumitWebhookCapture, כך שסוג חדש
// (ביט?) יתגלה מהתיעוד ולא ינחש.
// מוצר שלא תואם קורס קיים לא יוצר קורס — תגית "ממתין לשיוך לקורס".
const MANUAL_PAYMENT_TYPES = { 2: 'מזומן', 3: 'העברה בנקאית' };
const PENDING_TAG = 'ממתין לשיוך לקורס';
const REGISTERED_STATUSES = ['רשום', 'נרשם', 'רשומה ליום היכרות'];
const OPEN_LEAD_STATUSES = ['ליד חדש', 'חדש', 'לחזור לקראת הרשמה', 'במעקב ראשוני', 'היה ביום היכרות', 'הודעה מוואטסאפ לבדיקה', 'תיאום שיחה'];
const INTRO_STATUS = 'רשומה ליום היכרות';
const VERSION = 'v4-2026-08-05';

// סטטוס ראשי עקבי עם handleSummitPayment: "רשום" גובר, אז יום היכרות, אז הליד הפתוח.
// סוגר את הפער שבו קבלה ידנית עדכנה שורת קורס ל"רשום" אבל השאירה את הסטטוס הראשי "ליד חדש".
function computeMainStatus(courses, current) {
  const list = courses || [];
  if (list.some((c) => c.status === 'רשום' || c.status === 'נרשם' || c.status === 'הסתיים')) return 'רשום';
  if (list.some((c) => c.status === INTRO_STATUS)) return INTRO_STATUS;
  for (const s of OPEN_LEAD_STATUSES) if (list.some((c) => c.status === s)) return s;
  return current || 'רשום';
}

function normalizeName(s) {
  return String(s || '').replace(/["״'׳]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function phoneVariants(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return [];
  const variants = new Set([digits]);
  if (digits.startsWith('972')) variants.add('0' + digits.slice(3));
  if (digits.startsWith('0')) variants.add('972' + digits.slice(1));
  return [...variants];
}

Deno.serve(async (req) => {
  console.log(`=== 🧾 handleSumitDocument ${VERSION} ===`);
  const base44 = createClientFromRequest(req);
  let payload = null;
  try { payload = await req.json(); } catch (_e) { /* non-JSON */ }

  let decision = 'captured';
  let detail = null;

  try {
    if (payload?.probe) {
      decision = 'probe';
    } else {
      const docNumber = payload?.Properties?.Accounting_Number?.[0];
      if (!docNumber) {
        decision = 'no-doc-number';
      } else {
        const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
        const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
        const credentials = {
          CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')),
          APIKey: String(SUMIT_API_KEY).trim()
        };
        async function getDetails(docType) {
          const res = await fetch('https://api.sumit.co.il/accounting/documents/getdetails/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Credentials: credentials, DocumentNumber: docNumber, DocumentType: docType })
          });
          const json = await res.json().catch(() => null);
          return json?.Data || null;
        }
        let isRefund = false;
        let d = await getDetails(1); // חשבון/קבלה
        if (!d) { d = await getDetails(6); isRefund = Boolean(d); } // חשבון/קבלה זיכוי
        if (!d) {
          decision = 'details-not-found';
        } else {
          const payments = d.Payments || [];
          const payTypes = payments.map((p) => p.Type ?? null);
          const allManual = payments.length > 0 && payTypes.every((t) => t !== null && MANUAL_PAYMENT_TYPES[t]);
          detail = { docNumber, payTypes, customer: d.Document?.Customer?.Name || null };

          if (!allManual) {
            // אשראי (null) או סוג לא מוכר — הטריגר הוותיק מטפל / דורש פענוח
            decision = payTypes.every((t) => t === null) ? 'skipped-credit' : 'skipped-unknown-paytype';
          } else {
            const payLabel = [...new Set(payTypes.map((t) => MANUAL_PAYMENT_TYPES[t]))].join(', ');
            const docMarker = `חשבון/קבלה${isRefund ? ' זיכוי' : ''} / ${docNumber}`;
            const customerName = d.Document?.Customer?.Name || null;
            const customerEmail = (d.Document?.Customer?.EmailAddress || '').trim().toLowerCase() || null;
            const customerPhone = (d.Document?.Customer?.Phone || '').trim() || null;
            const billingDate = d.Document?.Date?.slice(0, 10) || new Date().toISOString().slice(0, 10);

            // --- איתור משתתפ.ת: מייל → טלפון (בשני הפורמטים) → שם ---
            let student = null;
            if (customerEmail) {
              student = (await base44.asServiceRole.entities.Student.filter({ email: customerEmail }))?.[0] || null;
            }
            if (!student && customerPhone) {
              for (const v of phoneVariants(customerPhone)) {
                student = (await base44.asServiceRole.entities.Student.filter({ phone: v }))?.[0] || null;
                if (student) break;
              }
            }
            if (!student && customerName) {
              student = (await base44.asServiceRole.entities.Student.filter({ full_name: customerName }))?.[0] || null;
            }

            if (student && (student.notes || '').includes(docMarker)) {
              decision = 'duplicate-skip';
            } else {
              // --- פריטים → קורסים קיימים בלבד (בלי יצירה) ---
              const allCourses = await base44.asServiceRole.entities.Course.list();
              const items = (d.Items || []).map((it) => ({
                name: it.Item?.Name || it.Description || 'ללא שם',
                total: Number(it.TotalPrice ?? 0)
              }));
              const noteLines = [];
              // מצב הרישומים כפי שהם ייכתבו בסוף — שורה קיימת מתעדכנת ולא מדולגת,
              // וכל שורה נושאת paid_so_far כדי שהכסף ייספר בדוח ההכנסות.
              const workingCourses = [...(student?.courses || [])];
              let pendingAssignment = false;
              let totalDelta = 0;

              for (const it of items) {
                const target = normalizeName(it.name);
                let course = (allCourses || []).find((c) => normalizeName(c.name) === target) || null;
                // מוצר שלא זוהה פותח קורס אוטומטית, למעט חריגים מוגדרים
                if (!course && !isRefund && it.total > 0) {
                  course = await autoCreateCourseFromProduct(base44, { productName: it.name, catalogName: null, amount: it.total });
                }
                totalDelta += it.total;
                const kind = isRefund || it.total < 0 ? 'זיכוי' : 'תשלום';
                if (course) {
                  noteLines.push(`${kind} דרך Summit בתאריך ${billingDate} (₪${it.total}) — קורס: ${course.name} — ${docMarker} — קבלה ידנית (${payLabel})`);
                  const idx = workingCourses.findIndex((c) => c.course_id === course.id);
                  const paidBefore = Number(workingCourses[idx]?.paid_so_far) || 0;
                  const nextPaid = Math.max(0, paidBefore + it.total);
                  if (idx >= 0) {
                    const isRegistered = REGISTERED_STATUSES.includes(workingCourses[idx].status);
                    workingCourses[idx] = {
                      ...workingCourses[idx],
                      status: isRegistered ? workingCourses[idx].status : 'רשום',
                      paid_so_far: nextPaid,
                      ...(it.total > 0 && { installment_amount: it.total }),
                      registration_date: workingCourses[idx].registration_date || billingDate
                    };
                  } else if (!isRefund && it.total > 0) {
                    workingCourses.push({
                      course_id: course.id, course_name: course.name, registration_date: billingDate,
                      installment_amount: it.total, payment_number: 1, paid_so_far: nextPaid,
                      status: 'רשום'
                    });
                  }
                } else {
                  pendingAssignment = true;
                  noteLines.push(`${kind} דרך Summit בתאריך ${billingDate} (₪${it.total}) — מוצר: ${it.name} — ⏸️ ${PENDING_TAG} — ${docMarker} — קבלה ידנית (${payLabel})`);
                }
              }
              const primaryEntry = workingCourses[workingCourses.length - 1] || null;

              const noteBlock = noteLines.join('\n');
              if (student) {
                const tags = [...new Set([...(student.tags || []), ...(pendingAssignment ? [PENDING_TAG] : [])])];
                const nextAmountPaid = (Number(student.amount_paid) || 0) + totalDelta;
                // is_customer נכבה כשלא נותר תשלום נטו ואין רישום פעיל — למשל זיכוי מלא ידני.
                const stillCustomer = nextAmountPaid > 0 || workingCourses.some((c) => c.status === 'רשום' || c.status === 'נרשם' || c.status === INTRO_STATUS || c.status === 'הסתיים');
                await base44.asServiceRole.entities.Student.update(student.id, {
                  notes: student.notes ? `${student.notes}\n${noteBlock}` : noteBlock,
                  amount_paid: nextAmountPaid,
                  courses: workingCourses,
                  status: computeMainStatus(workingCourses, student.status),
                  is_customer: stillCustomer,
                  tags
                });
                decision = 'processed-existing';
                detail.student_id = student.id;
              } else {
                const created = await base44.asServiceRole.entities.Student.create({
                  full_name: customerName || `לקוח סאמיט ${docNumber}`,
                  email: customerEmail, phone: customerPhone || 'לא זמין',
                  status: 'רשום', is_customer: true, lead_source: 'אחר', marketing_consent: false,
                  amount_paid: totalDelta, registration_date: billingDate,
                  course_id: primaryEntry?.course_id || null,
                  course_name: primaryEntry?.course_name || null,
                  courses: workingCourses,
                  tags: pendingAssignment ? [PENDING_TAG] : [],
                  notes: noteBlock
                });
                decision = 'processed-new';
                detail.student_id = created?.id || null;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('🧾 Mapping error:', err.message);
    decision = 'error';
    detail = { ...(detail || {}), error: err.message };
  }

  // תיעוד כל אירוע — ההחלטה נשמרת בשדה source כדי שאפשר לבקר דילוגים
  try {
    await base44.asServiceRole.entities.SumitWebhookCapture.create({
      source: payload?.probe ? 'probe' : `document-create:${decision}`,
      payload: (JSON.stringify({ event: payload, detail }) || 'null').slice(0, 90000),
      received_at: new Date().toISOString()
    });
  } catch (persistErr) {
    console.error('🧾 Persist failed (non-fatal):', persistErr.message);
  }

  return Response.json({ status: 'ok', decision, version: VERSION });
});