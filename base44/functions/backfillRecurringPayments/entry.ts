import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Backfill של payments_total (מספר תשלומי הו"ק) מסאמיט → CRM.
// מקור האמת: /billing/recurring/listforcustomer/ — Date_Start..Date_Last => מספר תשלומים.
// ברירת מחדל: dry-run (קורא בלבד, לא כותב). כתיבה רק עם ?mode=write&confirm=backfill-2026-09-01.
//
// כללי הכללה (סטטוס הו"ק בסאמיט):
//   0 Active, 12 PendingForFirstPayment  → נספרים (הכנסה עתידית)
//   1 Cancelled, 9 FinishedExpired, 13 CancelledByCustomer → מדולגים כברירת מחדל
//   ניתן לשנות עם ?statuses=0,12,9 (רשימה מופרדת בפסיקים)

const STATUS_NAME: Record<number, string> = {
  0: 'Active', 1: 'Cancelled', 3: 'DisabledFailedBilling', 9: 'FinishedExpired',
  11: 'GracePeriod', 12: 'PendingFirstPayment', 13: 'CancelledByCustomer', 14: 'PendingRetry'
};
const REGISTERED = ['רשום', 'נרשם', 'רשומה ליום היכרות', 'נוצרה הוראת קבע'];

function normalizeName(s: string) {
  return String(s || '').replace(/["״'׳]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function phoneVariants(phone: string) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return [];
  const v = new Set([d]);
  if (d.startsWith('972')) v.add('0' + d.slice(3));
  if (d.startsWith('0')) v.add('972' + d.slice(1));
  return [...v];
}
function monthsInclusive(a: string, b: string): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a), d2 = new Date(b);
  if (isNaN(+d1) || isNaN(+d2)) return null;
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'backfill-2026-09-01') return Response.json({ error: 'unauthorized' }, { status: 401 });
  const write = url.searchParams.get('mode') === 'write' && url.searchParams.get('confirm') === 'backfill-2026-09-01';
  const includeStatuses = new Set((url.searchParams.get('statuses') || '0,12').split(',').map(Number));

  const SUMIT_API_KEY = Deno.env.get('SUMIT_API_KEY');
  const SUMIT_COMPANY_ID = Deno.env.get('SUMIT_COMPANY_ID');
  const credentials = { CompanyID: Number(String(SUMIT_COMPANY_ID).replace(/\D/g, '')), APIKey: String(SUMIT_API_KEY).trim() };
  async function sumit(path: string, body: Record<string, unknown>) {
    const res = await fetch(`https://api.sumit.co.il${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Credentials: credentials, ...body }) });
    return await res.json().catch(() => null);
  }

  // 1. איסוף CustomerIDs מכל תשלומי הו"ק
  const payJson = await sumit('/billing/payments/list/', { Date_From: '2024-01-01T00:00:00', Date_To: '2027-12-31T23:59:59', Paging: { StartIndex: 0, PageSize: 1000 } });
  const payments = payJson?.Data?.Payments || [];
  const custIds = new Set<number>();
  for (const p of payments) if ((p.RecurringCustomerItemIDs || []).length) custIds.add(p.CustomerID);

  // 2. טוען את כל הסטודנטים פעם אחת (לצורך התאמה)
  let allStudents: any[] = [], skip = 0;
  while (true) {
    const batch = await base44.asServiceRole.entities.Student.list('-created_date', 500, skip);
    if (!batch?.length) break;
    allStudents = allStudents.concat(batch);
    if (batch.length < 500) break;
    skip += batch.length;
  }
  const byEmail = new Map<string, any>();
  const byPhone = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const s of allStudents) {
    if (s.email) byEmail.set(String(s.email).trim().toLowerCase(), s);
    for (const v of phoneVariants(s.phone)) byPhone.set(v, s);
    if (s.full_name) byName.set(normalizeName(s.full_name), s);
  }

  const results: any[] = [];
  const updates = new Map<string, { student: any; courses: any[] }>(); // student_id -> working copy

  for (const cid of custIds) {
    // פרטי לקוח (מייל/טלפון/שם) + פריטי הו"ק
    const custEnt = (await sumit('/crm/data/getentity/', { EntityID: cid }))?.Data?.Entity;
    const email = (custEnt?.Customers_EmailAddress?.[0] || '').trim().toLowerCase() || null;
    const phone = (custEnt?.Customers_Phone?.[0] || '').trim() || null;
    const name = custEnt?.Customers_FullName?.[0] || null;

    const lfc = await sumit('/billing/recurring/listforcustomer/', { Customer: { ID: cid }, IncludeInactive: true });
    const items = lfc?.Data?.RecurringItems || [];

    // התאמת משתתפת
    let student = (email && byEmail.get(email)) || null;
    if (!student && phone) for (const v of phoneVariants(phone)) { student = byPhone.get(v); if (student) break; }
    if (!student && name) student = byName.get(normalizeName(name)) || null;

    for (const it of items) {
      const status = it.Status;
      const itemName = it.Item?.Name || it.Description || null;
      const unit = it.UnitPrice ?? it.Item?.Price ?? null;
      const count = monthsInclusive(it.Date_Start, it.Date_Last);
      const isTest = /בדיקת מערכת/.test(itemName || '');
      const row: any = {
        sumitCustomerId: cid, customer: name, email, phone,
        item: itemName, unitPrice: unit,
        status, statusName: STATUS_NAME[status] || String(status),
        dateStart: (it.Date_Start || '').slice(0, 10) || null,
        dateLast: (it.Date_Last || '').slice(0, 10) || null,
        computedPayments: count,
        included: includeStatuses.has(status) && !!count,
        studentMatched: student ? student.full_name : null,
        studentId: student?.id || null,
      };

      if (isTest) { row.included = false; row.skipReason = 'test record excluded'; results.push(row); continue; }
      if (!row.included) { row.skipReason = !count ? 'no-date-last (continuous/unknown)' : `status ${row.statusName} excluded`; results.push(row); continue; }
      if (!student) { row.skipReason = 'no CRM student match'; results.push(row); continue; }

      // מציאת שורת הקורס התואמת
      const work = updates.get(student.id) || { student, courses: [...(student.courses || [])] };
      const target = normalizeName(itemName);
      let idx = work.courses.findIndex((c: any) => normalizeName(c.course_name) === target);
      if (idx < 0) idx = work.courses.findIndex((c: any) => normalizeName(c.course_name).includes(target) || target.includes(normalizeName(c.course_name)));
      if (idx < 0) { row.skipReason = 'no matching course entry in CRM'; row.crmCourses = work.courses.map((c: any) => c.course_name); results.push(row); continue; }

      row.crmCourse = work.courses[idx].course_name;
      row.crmStatus = work.courses[idx].status;
      row.currentPaymentsTotal = work.courses[idx].payments_total ?? null;
      row.currentInstallment = work.courses[idx].installment_amount ?? null;
      row.willSetPaymentsTotal = count;
      row.willSetInstallment = unit;
      row.expectedContribution = count * (unit || 0);

      // לא דורסים installment_amount קיים (הערך מה-CRM מגיע מחיוב אמיתי, כולל הנחות). ממלאים רק אם חסר.
      const hasInstallment = work.courses[idx].installment_amount != null && work.courses[idx].installment_amount !== '';
      work.courses[idx] = { ...work.courses[idx], payments_total: count, ...(!hasInstallment && unit ? { installment_amount: unit } : {}) };
      row.installmentKept = hasInstallment;
      row.expectedContribution = count * (Number(work.courses[idx].installment_amount) || 0);
      updates.set(student.id, work);
      results.push(row);
    }
  }

  let written = 0;
  if (write) {
    for (const { student, courses } of updates.values()) {
      await base44.asServiceRole.entities.Student.update(student.id, { courses });
      written++;
    }
  }

  const included = results.filter(r => r.included && r.studentId && r.willSetPaymentsTotal);
  const summary = {
    mode: write ? 'WRITE' : 'DRY-RUN',
    includeStatuses: [...includeStatuses],
    sumitRecurringCustomers: custIds.size,
    totalRecurringItems: results.length,
    matchedAndWillWrite: included.length,
    studentsToUpdate: updates.size,
    studentsWritten: written,
    skipped: results.filter(r => !r.included || !r.studentId || r.skipReason).length,
    totalExpectedFromBackfill: included.reduce((s, r) => s + (r.expectedContribution || 0), 0),
  };
  return Response.json({ summary, rows: results });
});
